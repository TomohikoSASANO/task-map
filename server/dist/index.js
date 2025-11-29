"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const fastify_1 = __importDefault(require("fastify"));
const mailer_1 = require("./mailer");
const cookie_1 = __importDefault(require("@fastify/cookie"));
const auth_1 = require("./routes/auth");
const app = (0, fastify_1.default)({ logger: true });
async function main() {
    await app.register(cors_1.default, { origin: true, credentials: true });
    await app.register(cookie_1.default);
    await app.register(rate_limit_1.default, { max: 100, timeWindow: '1 minute' });
    app.get('/healthz', async () => ({ ok: true }));
    app.post('/api/test-email', async (req, reply) => {
        try {
            const to = req.headers['x-test-to'] || '';
            if (!to)
                return reply.status(400).send({ error: 'missing x-test-to header' });
            const id = await (0, mailer_1.sendTestMail)(to);
            return { ok: true, id };
        }
        catch (e) {
            req.log.error(e);
            return reply.status(500).send({ ok: false, error: e?.message || 'send failed' });
        }
    });
    await (0, auth_1.authRoutes)(app);
    const port = Number(process.env.PORT || 8080);
    const host = process.env.HOST || '0.0.0.0';
    await app.listen({ port, host });
}
main().catch((err) => {
    app.log.error(err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map