import { readFileSync } from 'fs'
import { HelmetData } from 'react-helmet'

import { files } from '../config'
const html = readFileSync(files.index).toString()

export interface WrapProps {
  styles: string
  markup: string
  helmet: HelmetData
}

export const wrap = ({ styles, markup, helmet }: WrapProps) => {
  return html
    .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
    .replace('<title>React App</title>', helmet.title.toString())
    .replace('</head>', `${helmet.meta.toString()}</head>`)
    .replace('</head>', `${helmet.link.toString()}</head>`)
    .replace('</head>', `${styles}</head>`)
    .replace('<body>', `<body ${helmet.bodyAttributes.toString()}>`)
}
