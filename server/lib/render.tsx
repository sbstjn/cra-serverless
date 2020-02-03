import { readFileSync } from 'fs'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { HelmetData } from 'react-helmet'
import { HelmetProvider } from 'react-helmet-async'
import { StaticRouter } from 'react-router-dom'
import { ServerStyleSheet } from 'styled-components'

import { files } from '../config'
const html = readFileSync(files.index).toString()

export const render = (Tree: React.ElementType, path: string) => {
  const context = { helmet: {} as HelmetData }
  const sheets = new ServerStyleSheet()

  const markup = renderToString(
    sheets.collectStyles(
      <HelmetProvider context={context}>
        <StaticRouter location={path}>
          <Tree />
        </StaticRouter>
      </HelmetProvider>,
    ),
  )

  return html
    .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
    .replace('<title>React App</title>', context.helmet.title.toString())
    .replace('</head>', `${context.helmet.meta.toString()}</head>`)
    .replace('</head>', `${context.helmet.link.toString()}</head>`)
    .replace('</head>', `${sheets.getStyleTags()}</head>`)
    .replace('<body>', `<body ${context.helmet.bodyAttributes.toString()}>`)
}
