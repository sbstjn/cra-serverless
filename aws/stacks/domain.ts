import * as CloudFront from '@aws-cdk/aws-cloudfront'
import * as S3 from '@aws-cdk/aws-s3'
import * as SSM from '@aws-cdk/aws-ssm'
import * as CDK from '@aws-cdk/core'
import * as Route53 from '@aws-cdk/aws-route53'
import * as ACM from '@aws-cdk/aws-certificatemanager'

import { getParam } from '../lib/helpers'

export interface DomainProps extends CDK.StackProps {
  name: string
  domainName: string
  subDomain: string
}

export class DomainStack extends CDK.Stack {
  constructor(app: CDK.App, id: string, props: DomainProps) {
    super(app, id, props)

    const apiID = getParam(this, `/${props.name}/APIGateway/ApiId`)
    const apiDomainName = `${apiID}.execute-api.${this.region}.amazonaws.com`

    const zone = Route53.HostedZone.fromLookup(this, 'Zone', { domainName: props.domainName })
    const siteDomain = props.subDomain + '.' + props.domainName;

    console.log(zone)

    const assetsBucket = S3.Bucket.fromBucketAttributes(this, 'AssetsBucket', {
      bucketName: getParam(this, `/${props.name}/S3/Assets/Name`),
      bucketDomainName: getParam(this, `/${props.name}/S3/Assets/DomainName`),
    })

    // TLS certificate
    const certificateArn = new ACM.DnsValidatedCertificate(this, 'SiteCertificate', {
      domainName: siteDomain,
      hostedZone: zone,
      region: 'us-east-1', 
    }).certificateArn 


    const distribution = new CloudFront.CloudFrontWebDistribution(this, 'CDN', {
      httpVersion: CloudFront.HttpVersion.HTTP2,
      priceClass: CloudFront.PriceClass.PRICE_CLASS_100,
      viewerProtocolPolicy: CloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      defaultRootObject: '/',
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: assetsBucket,
          },
          behaviors: [
            {
              allowedMethods: CloudFront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
              compress: true,
              pathPattern: '/*.*',
              forwardedValues: {
                queryString: false,
                cookies: { forward: 'none' },
              },
            },
          ],
        },
        {
          originPath: '/prod',
          customOriginSource: {
            domainName: apiDomainName,
            originProtocolPolicy: CloudFront.OriginProtocolPolicy.HTTPS_ONLY,
          },
          behaviors: [
            {
              allowedMethods: CloudFront.CloudFrontAllowedMethods.ALL,
              compress: true,
              isDefaultBehavior: true,
              forwardedValues: {
                queryString: true,
                cookies: { forward: 'all' },
              },
            },
          ],
        },
      ],
    })

    new SSM.StringParameter(this, 'SSMCloudFrontDomainName', {
      description: 'CloudFront DomainName',
      parameterName: `/${props.name}/CloudFront/DomainName`,
      stringValue: distribution.domainName,
    })

    new SSM.StringParameter(this, 'SSMCloudFrontDistributionID', {
      description: 'CloudFront DistributionID',
      parameterName: `/${props.name}/CloudFront/DistributionID`,
      stringValue: distribution.distributionId,
    })
  }
}
