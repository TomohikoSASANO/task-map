import argon2 from 'argon2'
import type { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../db'

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
})

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
})

export async function authRoutes(app: FastifyInstance) {
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret'

    app.post('/api/auth/register', async (req, reply) => {
        const parse = RegisterSchema.safeParse(req.body)
        if (!parse.success) return reply.status(400).send({ error: 'invalid_body' })
        const { email, password, name } = parse.data

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) return reply.status(409).send({ error: 'email_exists' })

        const passwordHash = await argon2.hash(password)
        const user = await prisma.user.create({ data: { email, passwordHash, name } })
        return reply.send({ id: user.id, email: user.email, name: user.name })
    })

    app.post('/api/auth/login', async (req, reply) => {
        const parse = LoginSchema.safeParse(req.body)
        if (!parse.success) return reply.status(400).send({ error: 'invalid_body' })
        const { email, password } = parse.data

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash) return reply.status(401).send({ error: 'invalid_credentials' })
        const ok = await argon2.verify(user.passwordHash, password)
        if (!ok) return reply.status(401).send({ error: 'invalid_credentials' })

        const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' })
        reply.setCookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/' })
        return reply.send({ ok: true })
    })

    app.post('/api/auth/logout', async (_req, reply) => {
        reply.clearCookie('token', { path: '/' })
        return reply.send({ ok: true })
    })

    app.get('/api/auth/me', async (req, reply) => {
        try {
            const token = (req.cookies?.token as string) || ''
            if (!token) return reply.status(401).send({ error: 'unauthorized' })
            const payload = jwt.verify(token, jwtSecret) as { sub: string }
            const user = await prisma.user.findUnique({ where: { id: payload.sub } })
            if (!user) return reply.status(401).send({ error: 'unauthorized' })
            return reply.send({ id: user.id, email: user.email, name: user.name })
        } catch {
            return reply.status(401).send({ error: 'unauthorized' })
        }
    })
}


