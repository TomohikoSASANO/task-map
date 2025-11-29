"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const zod_1 = require("zod");
const argon2_1 = __importDefault(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    name: zod_1.z.string().optional(),
});
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
async function authRoutes(app) {
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    app.post('/api/auth/register', async (req, reply) => {
        const parse = RegisterSchema.safeParse(req.body);
        if (!parse.success)
            return reply.status(400).send({ error: 'invalid_body' });
        const { email, password, name } = parse.data;
        const existing = await db_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            return reply.status(409).send({ error: 'email_exists' });
        const passwordHash = await argon2_1.default.hash(password);
        const user = await db_1.prisma.user.create({ data: { email, passwordHash, name } });
        return reply.send({ id: user.id, email: user.email, name: user.name });
    });
    app.post('/api/auth/login', async (req, reply) => {
        const parse = LoginSchema.safeParse(req.body);
        if (!parse.success)
            return reply.status(400).send({ error: 'invalid_body' });
        const { email, password } = parse.data;
        const user = await db_1.prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash)
            return reply.status(401).send({ error: 'invalid_credentials' });
        const ok = await argon2_1.default.verify(user.passwordHash, password);
        if (!ok)
            return reply.status(401).send({ error: 'invalid_credentials' });
        const token = jsonwebtoken_1.default.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' });
        reply.setCookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/' });
        return reply.send({ ok: true });
    });
    app.post('/api/auth/logout', async (_req, reply) => {
        reply.clearCookie('token', { path: '/' });
        return reply.send({ ok: true });
    });
}
//# sourceMappingURL=auth.js.map