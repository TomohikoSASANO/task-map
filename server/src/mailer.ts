import nodemailer from 'nodemailer'

export type SmtpConfig = {
    host: string
    port: number
    secure: boolean
    user: string
    pass: string
    from: string
}

export function createTransportFromEnv() {
    const host = process.env.SMTP_HOST || ''
    const port = Number(process.env.SMTP_PORT || 587)
    const secure = String(process.env.SMTP_SECURE || 'false') === 'true'
    const user = process.env.SMTP_USER || ''
    const pass = process.env.SMTP_PASS || ''
    const from = process.env.SMTP_FROM || ''
    if (!host || !user || !pass || !from) {
        throw new Error('SMTP env missing. Please set SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_PASS/SMTP_FROM')
    }
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
    })
    return { transporter, from }
}

export async function sendTestMail(to: string) {
    const { transporter, from } = createTransportFromEnv()
    const info = await transporter.sendMail({ from, to, subject: 'Task Map SMTP test', text: 'This is a test email.' })
    return info.messageId
}






