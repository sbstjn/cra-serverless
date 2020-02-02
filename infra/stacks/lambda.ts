import * as CodeDeploy from '@aws-cdk/aws-codedeploy'
import * as Lambda from '@aws-cdk/aws-lambda'
import * as CDK from '@aws-cdk/core'

export class LambdaStack extends CDK.Stack {
  public readonly code: Lambda.CfnParametersCode

  constructor(app: CDK.App, id: string, props?: CDK.StackProps) {
    super(app, id, props)

    this.code = Lambda.Code.cfnParameters({
      bucketNameParam: new CDK.CfnParameter(this, 'CodeBucketName'),
      objectKeyParam: new CDK.CfnParameter(this, 'CodeBucketObjectKey'),
    })

    const lambdaVersion = new Lambda.Function(this, 'Renderer', {
      code: this.code,
      handler: 'server/handler/lambda.run',
      runtime: Lambda.Runtime.NODEJS_12_X,
      memorySize: 1024,
      timeout: CDK.Duration.seconds(12),
    }).addVersion(new Date().toISOString())

    const lambdaAlias = new Lambda.Alias(this, 'RendererAlias', {
      aliasName: 'Current',
      version: lambdaVersion,
    })

    new CodeDeploy.LambdaDeploymentGroup(this, 'RendererDeployment', {
      alias: lambdaAlias,
      deploymentConfig: CodeDeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
    })
  }
}
