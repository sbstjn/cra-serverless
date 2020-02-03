import koa from 'koa'
import http from 'koa-route'
import serve from 'koa-static'

import App from '../src/App'
import { paths } from './config'
import { render } from './lib/render'

export const Router = new koa()

const handler = (ctx: koa.Context) => {
  ctx.body = render(App, ctx.request.path)
}

Router.use(http.get('/', handler))
Router.use(http.get('/index.html', handler))

Router.use(serve(paths.assets))

Router.use(http.get('*', handler))
