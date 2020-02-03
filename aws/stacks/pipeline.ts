import * as CodeBuild from '@aws-cdk/aws-codebuild'
import * as CodePipeline from '@aws-cdk/aws-codepipeline'
import * as CodePipelineAction from '@aws-cdk/aws-codepipeline-actions'
import * as IAM from '@aws-cdk/aws-iam'
import * as Lambda from '@aws-cdk/aws-lambda'
import * as S3 from '@aws-cdk/aws-s3'
import * as SSM from '@aws-cdk/aws-ssm'
import * as CDK from '@aws-cdk/core'

export interface PipelineProps extends CDK.StackProps {
  name: string
  github: {
    owner: string
    repository: string
  }

  code: Lambda.CfnParametersCode
}

export class PipelineStack extends CDK.Stack {
  constructor(scope: CDK.App, id: string, props: PipelineProps) {
    super(scope, id, props)

    // Amazon S3 bucket to store CRA website
    const bucketAssets = new S3.Bucket(this, 'Files', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
    })

    // Store S3 Bucket Name in Parameter Store
    new SSM.StringParameter(this, 'SSMBucketAssetsName', {
      description: 'S3 Bucket Name for Assets',
      parameterName: `/${props.name}/S3/Assets/Name`,
      stringValue: bucketAssets.bucketName,
    })

    // Store S3 DomainName Name in Parameter Store
    new SSM.StringParameter(this, 'SSMBucketAssetsDomainName', {
      description: 'S3 Bucket DomainName for Assets',
      parameterName: `/${props.name}/S3/Assets/DomainName`,
      stringValue: bucketAssets.bucketDomainName,
    })

    // Initialize named artifacts for AWS CodePipeline and AWS CodeBuild
    const outputSources = new CodePipeline.Artifact('sources')
    const outputAssets = new CodePipeline.Artifact('assets')
    const outputRender = new CodePipeline.Artifact('render')
    const outputCDK = new CodePipeline.Artifact('cdk')

    // Create AWS CodePipeline Pipeline
    const pipeline = new CodePipeline.Pipeline(this, 'Pipeline', {
      pipelineName: props.name,
      restartExecutionOnUpdate: false,
    })

    // AWS CodePipeline stage to clone sources from GitHub repository
    pipeline.addStage({
      stageName: 'Sources',
      actions: [
        new CodePipelineAction.GitHubSourceAction({
          actionName: 'Checkout',
          owner: props.github.owner,
          repo: props.github.repository,
          oauthToken: CDK.SecretValue.secretsManager('GitHubToken'),
          output: outputSources, // Store files in artifact
          trigger: CodePipelineAction.GitHubTrigger.WEBHOOK,
        }),
      ],
    })

    // AWS CodePipeline stage to build CRA website and CDK resources
    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodePipelineAction.CodeBuildAction({
          actionName: 'CDK',
          project: new CodeBuild.PipelineProject(this, 'BuildCDK', {
            projectName: 'CDK',
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename('./aws/buildspecs/cdk.yml'),
          }),
          input: outputSources, // Restore files from artifact
          outputs: [outputCDK], // Store files in artifact
          runOrder: 10,
        }),
        new CodePipelineAction.CodeBuildAction({
          actionName: 'Assets',
          project: new CodeBuild.PipelineProject(this, 'BuildAssets', {
            projectName: 'Assets',
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename('./aws/buildspecs/assets.yml'),
          }),
          input: outputSources, // Restore files from artifact
          outputs: [outputAssets], // Store files in artifact
          environmentVariables: {
            REACT_APP_NAME: { value: props.name },
          },
          runOrder: 10,
        }),
        new CodePipelineAction.CodeBuildAction({
          actionName: 'Render',
          project: new CodeBuild.PipelineProject(this, 'BuildRender', {
            projectName: 'Render',
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename('./aws/buildspecs/render.yml'),
          }),
          input: outputSources, // Restore files from artifact
          outputs: [outputRender], // Store files in artifact
          extraInputs: [outputAssets], // Restore additional files from artifact
          runOrder: 20,
        }),
      ],
    })

    // AWS CodePipeline stage to deploy static files to S3, update SSR code in AWS Lambda, and ensure CloudFront CDN
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new CodePipelineAction.S3DeployAction({
          actionName: 'Assets',
          input: outputAssets,
          bucket: bucketAssets,
          runOrder: 10,
        }),
        new CodePipelineAction.CloudFormationCreateUpdateStackAction({
          actionName: 'Render',
          templatePath: outputCDK.atPath(`${props.name}-render.template.json`),
          stackName: `${props.name}-render`,
          adminPermissions: true,
          parameterOverrides: {
            ...props.code.assign(outputRender.s3Location),
          },
          runOrder: 20,
          extraInputs: [outputRender],
        }),
        new CodePipelineAction.CloudFormationCreateUpdateStackAction({
          actionName: 'Domain',
          templatePath: outputCDK.atPath(`${props.name}-domain.template.json`),
          stackName: `${props.name}-domain`,
          adminPermissions: true,
          runOrder: 50,
        }),
      ],
    })

    // Custom IAM Role to access SSM Parameter Store and invalidate CloudFront Distribution
    const roleRelease = new IAM.Role(this, 'ReleaseCDNRole', {
      assumedBy: new IAM.ServicePrincipal('codebuild.amazonaws.com'),
      path: '/',
    })

    roleRelease.addToPolicy(
      new IAM.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/${props.name}/*`],
        effect: IAM.Effect.ALLOW,
      }),
    )

    roleRelease.addToPolicy(
      new IAM.PolicyStatement({
        actions: ['cloudfront:CreateInvalidation'],
        resources: [`arn:aws:cloudfront::${this.account}:distribution/*`],
        effect: IAM.Effect.ALLOW,
      }),
    )

    // AWS CodePipeline stage to release new static files and invalidate CloudFront distribution
    pipeline.addStage({
      stageName: 'Release',
      actions: [
        new CodePipelineAction.CodeBuildAction({
          actionName: 'CDN',
          project: new CodeBuild.PipelineProject(this, 'ReleaseCDN', {
            projectName: 'CDN',
            role: roleRelease,
            environmentVariables: {
              SSM_NAMESPACE: { value: props.name },
            },
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename('./aws/buildspecs/release.yml'),
          }),
          input: outputSources,
        }),
      ],
    })
  }
}
