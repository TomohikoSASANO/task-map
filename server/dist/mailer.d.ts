import nodemailer from 'nodemailer';
export type SmtpConfig = {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
};
export declare function createTransportFromEnv(): {
    transporter: nodemailer.Transporter<import("nodemailer/lib/smtp-transport").SentMessageInfo, import("nodemailer/lib/smtp-transport").Options>;
    from: string;
};
export declare function sendTestMail(to: string): Promise<string>;
//# sourceMappingURL=mailer.d.ts.map