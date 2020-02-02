import { resolve } from 'path'

const assets = resolve(__dirname, '../build')

export const paths = { assets }
export const files = { index: resolve(assets, 'index.html') }
