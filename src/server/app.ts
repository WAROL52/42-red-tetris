import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

const DIST_ROOT = path.resolve(process.cwd(), 'dist')
const DIST_INDEX = path.join(DIST_ROOT, 'index.html')

export const app = new Hono()

app.get('/health', (c) => c.text('ok'))

if (existsSync(DIST_ROOT)) {
  app.use('/*', serveStatic({ root: DIST_ROOT }))
}

app.notFound((c) => {
  if (existsSync(DIST_INDEX)) {
    return new Response(readFileSync(DIST_INDEX, 'utf8'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  return c.text('Client bundle not found. Run `pnpm build` or use `pnpm dev`.', 404)
})