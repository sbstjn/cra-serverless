import * as CDK from '@aws-cdk/core'
import * as CodeBuild from '@aws-cdk/aws-codebuild'
import * as Lambda from '@aws-cdk/aws-lambda'
import * as S3 from '@aws-cdk/aws-s3'
import * as CodePipeline from '@aws-cdk/aws-codepipeline'
import * as CodePipelineAction from '@aws-cdk/aws-codepipeline-actions'
import * as SSM from '@aws-cdk/aws-ssm'

export interface PipelineProps extends CDK.StackProps {
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

    new SSM.StringParameter(this, 'SSMBucketAssetsName', {
      description: 'S3 Bucket Name for Assets',
      parameterName: `/cra-serverless/S3/Assets/Name`,
      stringValue: bucketAssets.bucketName,
    })

    new SSM.StringParameter(this, 'SSMBucketAssetsDomainName', {
      description: 'S3 Bucket DomainName for Assets',
      parameterName: `/cra-serverless/S3/Assets/DomainName`,
      stringValue: bucketAssets.bucketDomainName,
    })

    // AWS CodeBuild artifacts
    const outputSources = new CodePipeline.Artifact('sources')
    const outputAssets = new CodePipeline.Artifact('assets')
    const outputLambda = new CodePipeline.Artifact('lambda')
    const outputCDK = new CodePipeline.Artifact('cdk')

    // AWS CodePipeline pipeline
    const pipeline = new CodePipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'cra-serverless',
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
          output: outputSources,
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
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename('./infra/buildspecs/cdk.yml'),
          }),
          input: outputSources,
          outputs: [outputCDK],
        }),
        new CodePipelineAction.CodeBuildAction({
          actionName: 'Assets',
          project: new CodeBuild.PipelineProject(this, 'BuildAssets', {
            projectName: 'Assets',
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename('./infra/buildspecs/assets.yml'),
          }),
          input: outputSources,
          outputs: [outputAssets],
        }),
        new CodePipelineAction.CodeBuildAction({
          actionName: 'Lambda',
          project: new CodeBuild.PipelineProject(this, 'BuildLambda', {
            projectName: 'Lambda',
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename('./infra/buildspecs/lambda.yml'),
          }),
          input: outputSources,
          outputs: [outputLambda],
        }),
      ],
    })

    // AWS CodePipeline stage to deployt CRA website and CDK resources
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
          actionName: 'Renderer',
          templatePath: outputCDK.atPath('cra-serverless-lambda.template.json'),
          stackName: 'cra-serverless-lambda',
          adminPermissions: true,
          parameterOverrides: {
            ...props.code.assign(outputLambda.s3Location),
          },
          runOrder: 20,
          extraInputs: [outputLambda],
        }),
      ],
    })
  }
}
