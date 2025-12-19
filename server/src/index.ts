import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { sendTestMail } from './mailer'
import { authRoutes } from './routes/auth'
import { collabRoutes } from './routes/collab'

const app = Fastify({ logger: true })

async function main() {
    await app.register(cors, { origin: true, credentials: true })
    await app.register(cookie)
    await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })

    app.get('/healthz', async () => ({ ok: true }))
    app.post('/api/test-email', async (req, reply) => {
        try {
            const to = (req.headers['x-test-to'] as string) || ''
            if (!to) return reply.status(400).send({ error: 'missing x-test-to header' })
            const id = await sendTestMail(to)
            return { ok: true, id }
        } catch (e: any) {
            req.log.error(e)
            return reply.status(500).send({ ok: false, error: e?.message || 'send failed' })
        }
    })

    await authRoutes(app)
    await collabRoutes(app)

    const port = Number(process.env.PORT || 8080)
    const host = process.env.HOST || '0.0.0.0'
    await app.listen({ port, host })
}

main().catch((err) => {
    app.log.error(err)
    process.exit(1)
})


