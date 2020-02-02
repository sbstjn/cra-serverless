import * as CDK from '@aws-cdk/core'
import * as SSM from '@aws-cdk/aws-ssm'

export const getParam = (scope: CDK.Construct, name: string) => {
  return SSM.StringParameter.valueForStringParameter(scope, name)
}
