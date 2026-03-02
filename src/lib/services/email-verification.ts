import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key_for_build");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "alert@evalco.nl";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

function renderEmailTemplate(title: string, contentHtml: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
            <div style="text-align:center;margin-bottom:32px;">
                <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);width:48px;height:48px;border-radius:12px;line-height:48px;font-weight:700;font-size:1.2rem;color:white;">E</div>
                <h1 style="color:#f1f5f9;font-size:1.4rem;margin:16px 0 0;">Evalco</h1>
            </div>
            <div style="background:#1e293b;border-radius:16px;border:1px solid #334155;padding:32px;">
                <h2 style="color:#f1f5f9;font-size:1.2rem;margin:0 0 16px;">${title}</h2>
                ${contentHtml}
            </div>
            <p style="text-align:center;color:#64748b;font-size:0.75rem;margin-top:24px;">
                © ${new Date().getFullYear()} Evalco — AI-Powered Analytics
            </p>
        </div>
    </body>
    </html>`;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${APP_URL}/verify-email/${token}`;

    const contentHtml = `
        <p style="color:#94a3b8;font-size:0.9rem;line-height:1.6;margin:0 0 24px;">
            Bedankt voor je registratie bij Evalco. Klik op de onderstaande knop om je e-mailadres te bevestigen en aan de slag te gaan.
        </p>
        <div style="text-align:center;margin:32px 0;">
            <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:10px;font-weight:600;font-size:0.95rem;">
                E-mail Bevestigen
            </a>
        </div>
        <p style="color:#64748b;font-size:0.8rem;margin:0;">
            Of kopieer deze link: <a href="${verifyUrl}" style="color:#818cf8;">${verifyUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #334155;margin:24px 0;">
        <p style="color:#64748b;font-size:0.75rem;margin:0;">
            Deze link is 24 uur geldig. Als je geen account hebt aangemaakt, kun je deze e-mail negeren.
        </p>
    `;

    if (!process.env.RESEND_API_KEY) {
        console.log("[EmailVerification] No RESEND_API_KEY. Mock email to:", email);
        console.log("[EmailVerification] Verify URL:", verifyUrl);
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: `Evalco <${FROM_EMAIL}>`,
            to: [email],
            subject: "Bevestig je e-mailadres — Evalco",
            html: renderEmailTemplate("E-mail Verificatie", contentHtml),
        });

        if (error) {
            console.error("[EmailVerification] Resend error:", error);
        } else {
            console.log("[EmailVerification] Email sent:", data?.id);
        }
    } catch (err) {
        console.error("[EmailVerification] Failed:", err);
    }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
    const dashboardUrl = `${APP_URL}/dashboard`;

    const contentHtml = `
        <p style="color:#94a3b8;font-size:0.9rem;line-height:1.6;margin:0 0 16px;">
            Welkom bij Evalco, <strong style="color:#f1f5f9;">${name}</strong>! 🎉
        </p>
        <p style="color:#94a3b8;font-size:0.9rem;line-height:1.6;margin:0 0 24px;">
            Je account is succesvol geverifieerd. Je kunt nu inloggen en je eerste project instellen.
        </p>
        <div style="text-align:center;margin:32px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:10px;font-weight:600;font-size:0.95rem;">
                Ga naar Dashboard
            </a>
        </div>
    `;

    if (!process.env.RESEND_API_KEY) {
        console.log("[EmailVerification] No RESEND_API_KEY. Mock welcome email to:", email);
        return;
    }

    try {
        await resend.emails.send({
            from: `Evalco <${FROM_EMAIL}>`,
            to: [email],
            subject: `Welkom bij Evalco, ${name}!`,
            html: renderEmailTemplate("Welkom bij Evalco!", contentHtml),
        });
    } catch (err) {
        console.error("[EmailVerification] Welcome email failed:", err);
    }
}
