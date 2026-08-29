import { serve } from '@hono/node-server'
import { Server } from 'socket.io'
import { app } from './app.ts'
import { attachSockets, type TetrisServer } from './socket.ts'

const port = Number(process.env.PORT ?? 3000)
const hostname = process.env.HOST ?? '0.0.0.0'

const httpServer = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`[server] listening on http://${info.address}:${info.port}`)
})

const io: TetrisServer = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? '*', methods: ['GET', 'POST'] },
})

attachSockets(io)