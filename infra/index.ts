import * as cdk from '@aws-cdk/core'

import { config } from '../config'
import { DomainStack } from './stacks/domain'
import { RenderStack } from './stacks/render'
import { PipelineStack } from './stacks/pipeline'

const name = 'cra-serverless'
const app = new cdk.App()

const stackRender = new RenderStack(app, `${name}-render`, config)
const stackDomain = new DomainStack(app, `${name}-domain`, config)
new PipelineStack(app, `${name}-pipeline`, { ...config, code: stackRender.code })

app.synth()
