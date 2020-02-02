import * as APIGateway from '@aws-cdk/aws-apigateway'
import * as Lambda from '@aws-cdk/aws-lambda'
import * as CDK from '@aws-cdk/core'
import * as SSM from '@aws-cdk/aws-ssm'

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

    const api = new APIGateway.RestApi(this, 'API')
    const integration = new APIGateway.LambdaIntegration(render)

    const root = api.root
    const path = api.root.addResource('{proxy+}')

    root.addMethod('ANY', integration)
    path.addMethod('ANY', integration)

    new SSM.StringParameter(this, 'SSMAPIID', {
      description: 'API Gateway ID',
      parameterName: `/cra-serverless/API/ID`,
      stringValue: api.restApiId,
    })
  }
}
