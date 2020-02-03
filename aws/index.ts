import * as cdk from '@aws-cdk/core'

import { config } from '../config'
import { DomainStack } from './stacks/domain'
import { RenderStack } from './stacks/render'
import { PipelineStack } from './stacks/pipeline'

const name = config.name
const app = new cdk.App()

const render = new RenderStack(app, `${name}-render`, config)
new DomainStack(app, `${name}-domain`, config)
new PipelineStack(app, `${name}-pipeline`, { ...config, code: render.code })

app.synth()
