import * as cdk from '@aws-cdk/core'

import { config } from '../config'
import { DomainStack } from './stacks/domain'
import { LambdaStack } from './stacks/lambda'
import { PipelineStack } from './stacks/pipeline'

const name = 'cra-serverless'
const app = new cdk.App()

const stackLambda = new LambdaStack(app, `${name}-lambda`, config)
const stackDomain = new DomainStack(app, `${name}-domain`, config)
new PipelineStack(app, `${name}-pipeline`, { ...config, code: stackLambda.code })

app.synth()
