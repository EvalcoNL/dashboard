import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key_for_build");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "alert@evalco.nl";

export interface IncidentAlertPayload {
    incidentTitle: string;
    incidentCause: string;
    clientName: string;
    startedAt: Date;
    recipients: string[];
    duration?: string;
}

/**
 * Helper to render consistently styled emails with logo and footer
 */
function renderEmailTemplate(title: string, contentHtml: string) {
    const year = new Date().getFullYear();
    const primaryColor = "#6366f1";

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; color: white; }
                .logo-container { display: inline-flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px; }
                .logo-icon { background-color: rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 8px; display: inline-block; }
                .content { padding: 40px; }
                .footer { background-color: #f1f5f9; padding: 24px; text-align: center; color: #64748b; font-size: 0.875rem; border-top: 1px solid #e2e8f0; }
                .button { display: inline-block; background-color: ${primaryColor}; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px; }
                .alert-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
                .success-box { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
                h1 { margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em; }
                h2 { color: #0f172a; margin-top: 0; }
                p { margin-bottom: 16px; }
                @media only screen and (max-width: 600px) {
                    .container { margin-top: 0; border-radius: 0; }
                    .content { padding: 24px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo-container">
                        <div class="logo-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path></svg>
                        </div>
                        <span style="font-size: 1.25rem; font-weight: 800; letter-spacing: -0.025em;">Evalco Dashboard</span>
                    </div>
                    <h1>${title}</h1>
                </div>
                <div class="content">
                    ${contentHtml}
                </div>
                <div class="footer">
                    <p style="margin: 0 0 8px 0;">© ${year} Evalco &bull; Beveiligd Intern Platform</p>
                    <p style="margin: 0; font-size: 0.75rem;">Dit is een automatisch verzonden bericht vanuit het Evalco Dashboard.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

export async function sendIncidentAlertEmail({
    incidentTitle,
    incidentCause,
    clientName,
    startedAt,
    recipients
}: IncidentAlertPayload) {
    if (!recipients || recipients.length === 0) return;

    if (!process.env.RESEND_API_KEY) {
        console.log("[EmailService] No RESEND_API_KEY found. Mocking email to:", recipients);
        return { success: true, mocked: true };
    }

    try {
        const html = renderEmailTemplate(
            "Nieuw Incident Gedetecteerd",
            `
                <p>Er is een nieuw incident gedetecteerd voor het project <strong>${clientName}</strong>.</p>
                
                <div class="alert-box">
                    <h3 style="margin-top: 0; color: #991b1b;">${incidentTitle}</h3>
                    <p style="margin-bottom: 4px;"><strong>Oorzaak:</strong> ${incidentCause}</p>
                    <p style="margin-bottom: 0;"><strong>Tijdstip:</strong> ${startedAt.toLocaleString("nl-NL")}</p>
                </div>
                
                <p>Log in op het Evalco dashboard voor meer details en om dit incident af te handelen.</p>
                
                <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard" class="button">Open Dashboard</a>
            `
        );

        const data = await resend.emails.send({
            from: FROM_EMAIL,
            to: recipients,
            subject: `🚨 [Incident Alert] ${clientName} - ${incidentTitle}`,
            html,
        });

        return { success: true, data };
    } catch (error) {
        console.error("[EmailService] Error sending email:", error);
        return { success: false, error };
    }
}

export async function sendIncidentResolvedEmail({
    incidentTitle,
    incidentCause,
    clientName,
    startedAt,
    recipients,
    duration
}: IncidentAlertPayload) {
    if (!recipients || recipients.length === 0) return;

    if (!process.env.RESEND_API_KEY) {
        console.log("[EmailService] No RESEND_API_KEY found. Mocking resolution email to:", recipients);
        return { success: true, mocked: true };
    }

    try {
        const html = renderEmailTemplate(
            "Incident Opgelost",
            `
                <p>Goed nieuws! Het incident voor <strong>${clientName}</strong> is succesvol opgelost.</p>
                
                <div class="success-box">
                    <h3 style="margin-top: 0; color: #166534;">${incidentTitle}</h3>
                    <p style="margin-bottom: 4px;"><strong>Oorspronkelijke oorzaak:</strong> ${incidentCause}</p>
                    <p style="margin-bottom: 4px;"><strong>Opgelost op:</strong> ${new Date().toLocaleString("nl-NL")}</p>
                    ${duration ? `<p style="margin-bottom: 0;"><strong>Totale duur:</strong> ${duration}</p>` : ""}
                </div>

                <p>De monitoring blijft actief om de stabiliteit te waarborgen.</p>
                
                <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard" class="button">Bekijk Rapportages</a>
            `
        );

        const data = await resend.emails.send({
            from: FROM_EMAIL,
            to: recipients,
            subject: `✅ [Incident Opgelost] ${clientName} - ${incidentTitle}`,
            html,
        });

        return { success: true, data };
    } catch (error) {
        console.error("[EmailService] Error sending resolution email:", error);
        return { success: false, error };
    }
}

export async function sendSlackAlert(webhookUrl: string, payload: IncidentAlertPayload) {
    if (!webhookUrl) return;

    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `🚨 *Nieuw Incident voor ${payload.clientName}*\n*${payload.incidentTitle}*\n> Oorzaak: _${payload.incidentCause}_\n> Tijd: _${payload.startedAt.toLocaleString('nl-NL')}_`
            })
        });

        if (!res.ok) {
            console.error("[SlackService] Failed to send to Slack:", res.statusText);
        }
    } catch (error) {
        console.error("[SlackService] Error sending to Slack:", error);
    }
}

export async function sendSlackResolvedAlert(webhookUrl: string, payload: IncidentAlertPayload) {
    if (!webhookUrl) return;

    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `✅ *Incident Opgelost voor ${payload.clientName}*\n*${payload.incidentTitle}*\n> De site is weer bereikbaar.${payload.duration ? `\n> Totale duur: _${payload.duration}_` : ''}`
            })
        });

        if (!res.ok) {
            console.error("[SlackService] Failed to send resolution to Slack:", res.statusText);
        }
    } catch (error) {
        console.error("[SlackService] Error sending resolution to Slack:", error);
    }
}

export async function sendClientInviteEmail(email: string, clientName: string, token: string, userExists: boolean = false) {
    const inviteLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${token}`;

    const subjectText = userExists
        ? `Uitnodiging voor ${clientName} op Evalco (Bestaand Account)`
        : `Uitnodiging voor ${clientName} op Evalco`;

    const titleText = "Je bent uitgenodigd!";

    const bodyHtml = userExists
        ? `
            <p>Je bent uitgenodigd om toegang te krijgen tot het account van <strong>${clientName}</strong> op het platform.</p>
            <p>Omdat je al een account hebt bij Evalco, hoef je alleen in te loggen om de uitnodiging te accepteren.</p>
        `
        : `
            <p>Je bent uitgenodigd om toegang te krijgen tot het account van <strong>${clientName}</strong> op het Evalco platform.</p>
            <p>Klik op de onderstaande knop om je account aan te maken en de uitnodiging te accepteren.</p>
        `;

    const actionText = userExists
        ? "Inloggen & Accepteren"
        : "Account Aanmaken & Accepteren";

    if (!process.env.RESEND_API_KEY) {
        console.log(`[EmailService] Mocking Invite Email to ${email}`);
        return { success: true, mocked: true };
    }

    try {
        const html = renderEmailTemplate(
            titleText,
            `
                ${bodyHtml}
                <p>Deze uitnodiging is 7 dagen geldig.</p>
                <div style="text-align: center;">
                    <a href="${inviteLink}" class="button">${actionText}</a>
                </div>
            `
        );

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [email],
            subject: subjectText,
            html,
        });

        if (error) {
            console.error("[EmailService] Resend API Warning/Error:", error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error("[EmailService] Error sending invite email:", error);
        return { success: false, error };
    }
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    if (!process.env.RESEND_API_KEY) {
        console.log(`[EmailService] Mocking Password Reset Email to ${email}`);
        return { success: true, mocked: true };
    }

    try {
        const html = renderEmailTemplate(
            "Wachtwoord herstellen",
            `
                <p>Je hebt een verzoek ingediend om je wachtwoord voor het Evalco Dashboard te herstellen.</p>
                <p>Klik op de onderstaande knop om een nieuw wachtwoord in te stellen. Deze link is <strong>1 uur geldig</strong>.</p>
                
                <div style="text-align: center;">
                    <a href="${resetLink}" class="button">Wachtwoord Opnieuw Instellen</a>
                </div>
                
                <p style="margin-top: 32px; color: #64748b; font-size: 0.8125rem;">
                    Als je dit verzoek niet hebt gedaan, kun je deze e-mail veilig negeren. Je wachtwoord blijft ongewijzigd.
                </p>
            `
        );

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [email],
            subject: "🔐 Wachtwoord herstellen - Evalco Dashboard",
            html,
        });

        if (error) {
            console.error("[EmailService] Resend API Warning/Error:", error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error("[EmailService] Error sending password reset email:", error);
        return { success: false, error };
    }
}
