import * as APIGateway from '@aws-cdk/aws-apigateway'
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

    const render = new Lambda.Function(this, 'Renderer', {
      code: this.code,
      handler: 'server/handler/lambda.run',
      runtime: Lambda.Runtime.NODEJS_12_X,
      memorySize: 1024,
      timeout: CDK.Duration.seconds(3),
    })

    // API Gateway
    const api = new APIGateway.RestApi(this, 'API')

    // API Gateway - /
    const root = api.root
    root.addMethod('ANY', new APIGateway.LambdaIntegration(render))

    // API Gateway - /*
    const resource = api.root.addResource('{proxy+}')
    resource.addMethod('ANY', new APIGateway.LambdaIntegration(render))
  }
}
