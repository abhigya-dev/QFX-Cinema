import nodemailer from 'nodemailer';
import dns from 'dns/promises';
import fs from 'fs/promises';

const hasEmailConfig = () =>
    Boolean(
        process.env.EMAIL_HOST &&
        process.env.EMAIL_PORT &&
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASS &&
        process.env.EMAIL_FROM
    );

const hasResendConfig = () =>
    Boolean(
        process.env.RESEND_API_KEY &&
        process.env.EMAIL_FROM
    );

const isIPv4 = (value) => /^\d{1,3}(\.\d{1,3}){3}$/.test(String(value || ''));

const resolveSmtpHosts = async () => {
    const configuredHost = String(process.env.EMAIL_HOST || '').trim();
    const family = Number(process.env.EMAIL_IP_FAMILY || 4);
    const forceIPv4 = String(process.env.EMAIL_FORCE_IPV4 || 'true').toLowerCase() === 'true';
    const explicitHostIp = String(process.env.EMAIL_HOST_IP || '').trim();

    if (explicitHostIp) {
        return [{ host: explicitHostIp, servername: configuredHost || explicitHostIp }];
    }

    if (!configuredHost || !forceIPv4 || family !== 4 || isIPv4(configuredHost)) {
        return [{ host: configuredHost, servername: configuredHost }];
    }

    try {
        const addresses = await dns.resolve4(configuredHost);
        if (addresses?.length) {
            return addresses.map((ip) => ({ host: ip, servername: configuredHost }));
        }
    } catch (error) {
        console.warn(`Could not resolve IPv4 for ${configuredHost}:`, error.message);
    }

    return [{ host: configuredHost, servername: configuredHost }];
};

const createTransporter = ({ host, servername }) =>
    nodemailer.createTransport({
        host,
        port: Number(process.env.EMAIL_PORT || 587),
        secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || Number(process.env.EMAIL_PORT) === 465,
        family: Number(process.env.EMAIL_IP_FAMILY || 4),
        connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 20000),
        greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 20000),
        socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 30000),
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            servername,
        },
    });

export const isEmailConfigured = () => hasResendConfig() || hasEmailConfig();

const toResendAttachments = async (attachments = []) => {
    const items = [];

    for (const attachment of attachments) {
        const filename = attachment?.filename || 'attachment';
        if (attachment?.content) {
            const content = Buffer.isBuffer(attachment.content)
                ? attachment.content.toString('base64')
                : Buffer.from(String(attachment.content)).toString('base64');
            items.push({ filename, content });
            continue;
        }

        if (attachment?.path) {
            const file = await fs.readFile(attachment.path);
            items.push({ filename, content: file.toString('base64') });
        }
    }

    return items;
};

const sendWithResend = async ({ to, subject, html, attachments = [] }) => {
    const payload = {
        from: process.env.EMAIL_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
    };

    const resendAttachments = await toResendAttachments(attachments);
    if (resendAttachments.length > 0) {
        payload.attachments = resendAttachments;
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const body = await response.text();
    if (!response.ok) {
        throw new Error(`Resend API error (${response.status}): ${body}`);
    }

    return body;
};

export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    if (!hasResendConfig() && !hasEmailConfig()) {
        throw new Error('Email service is not configured. Use RESEND_API_KEY + EMAIL_FROM, or SMTP EMAIL_* settings.');
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
        attachments,
    };

    try {
        if (hasResendConfig()) {
            const result = await sendWithResend({ to, subject, html, attachments });
            console.log(`Email sent via Resend: ${result}`);
            return result;
        }

        const smtpTargets = await resolveSmtpHosts();
        let lastError = null;

        for (const target of smtpTargets) {
            try {
                const transporter = createTransporter(target);
                const info = await transporter.sendMail(mailOptions);
                console.log(`Email sent via ${target.host}: ${info.response}`);
                return info;
            } catch (error) {
                lastError = error;
                console.warn(`SMTP send failed via ${target.host}:`, error.message);
            }
        }

        throw lastError || new Error('No SMTP target could send email');
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email could not be sent');
    }
};

export const getOTPTemplate = (name, otp) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #333;">Welcome to QFX Cinemas, ${name}!</h2>
        <p>Your OTP for email verification is:</p>
        <h1 style="color: #e50914; font-size: 40px; letter-spacing: 5px;">${otp}</h1>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
    </div>
`;

export const getResetPasswordTemplate = (name, resetUrl) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>You requested to reset your password. Please click the button below to set a new password:</p>
        <a href="${resetUrl}" style="background-color: #e50914; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Reset Password</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 10 minutes.</p>
    </div>
`;
