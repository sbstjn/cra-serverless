import * as CDK from '@aws-cdk/core'
import * as S3 from '@aws-cdk/aws-s3'
import * as CloudFront from '@aws-cdk/aws-cloudfront'
import * as SSM from '@aws-cdk/aws-ssm'

import { getParam } from '../lib/helpers'

export class DomainStack extends CDK.Stack {
  constructor(app: CDK.App, id: string, props?: CDK.StackProps) {
    super(app, id, props)

    const apiID = getParam(this, `/cra-serverless/API/ID`)
    const apiDomainName = `${apiID}.execute-api.${this.region}.amazonaws.com`

    const assetsBucket = S3.Bucket.fromBucketAttributes(this, 'AssetsBucket', {
      bucketName: getParam(this, `/cra-serverless/S3/Assets/Name`),
      bucketDomainName: getParam(this, `/cra-serverless/S3/Assets/DomainName`),
    })

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
      parameterName: `/cra-serverless/CloudFront/DomainName`,
      stringValue: distribution.domainName,
    })

    new SSM.StringParameter(this, 'SSMCloudFrontDistributionID', {
      description: 'CloudFront DistributionID',
      parameterName: `/cra-serverless/CloudFront/DistributionID`,
      stringValue: distribution.distributionId,
    })
  }
}
