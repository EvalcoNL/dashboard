import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key_for_build");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "alert@evalco.nl";

export interface IncidentAlertPayload {
    incidentTitle: string;
    incidentCause: string;
    clientName: string;
    startedAt: Date;
    recipients: string[];
}

export async function sendIncidentAlertEmail({
    incidentTitle,
    incidentCause,
    clientName,
    startedAt,
    recipients
}: IncidentAlertPayload) {
    if (!recipients || recipients.length === 0) return;

    // In local dev without a real key, just log
    if (!process.env.RESEND_API_KEY) {
        console.log("[EmailService] No RESEND_API_KEY found. Mocking email to:", recipients);
        console.log(`[EmailService] Subject: [Incident] ${clientName} - ${incidentTitle}`);
        return { success: true, mocked: true };
    }

    try {
        const data = await resend.emails.send({
            from: FROM_EMAIL,
            to: recipients,
            subject: `[Incident Alert] ${clientName} - ${incidentTitle}`,
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <h2 style="color: #ef4444;">Nieuw Incident Gedetecteerd</h2>
                    <p>Er is een nieuw incident gedetecteerd voor de project <strong>${clientName}</strong>.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 16px; border-left: 4px solid #ef4444; margin: 20px 0;">
                        <h3 style="margin-top: 0;">${incidentTitle}</h3>
                        <p style="margin-bottom: 0;"><strong>Oorzaak:</strong> ${incidentCause}</p>
                        <p style="margin-bottom: 0;"><strong>Tijdstip:</strong> ${startedAt.toLocaleString("nl-NL")}</p>
                    </div>
                    
                    <p>Log in op het Evalco dashboard voor meer details en om dit incident af te handelen.</p>
                </div>
            `,
        });

        return { success: true, data };
    } catch (error) {
        console.error("[EmailService] Error sending email:", error);
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

export async function sendClientInviteEmail(email: string, clientName: string, token: string, userExists: boolean = false) {
    const inviteLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${token}`;

    const subjectText = userExists
        ? `Uitnodiging voor ${clientName} op Evalco (Bestaand Account)`
        : `Uitnodiging voor ${clientName} op Evalco`;

    const titleText = userExists
        ? `Je bent uitgenodigd voor ${clientName}!`
        : `Je bent uitgenodigd voor ${clientName}!`;

    const bodyText = userExists
        ? `<p>Je hebt al een Evalco account. Log in om deze uitnodiging te accepteren en toegang te krijgen tot het account van <strong>${clientName}</strong> op het platform.</p>`
        : `<p>Maak een account aan om toegang te krijgen tot het account van <strong>${clientName}</strong> op het Evalco platform.</p>`;

    const actionText = userExists
        ? "Inloggen & Accepteren"
        : "Uitnodiging Accepteren & Account Aanmaken";

    if (!process.env.RESEND_API_KEY) {
        console.log(`[EmailService] Mocking Invite Email to ${email}`);
        console.log(`[EmailService] Body: ${bodyText.replace(/<[^>]+>/g, '')} Klik hier: ${inviteLink}`);
        return { success: true, mocked: true };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [email],
            subject: subjectText,
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <h2>${titleText}</h2>
                    ${bodyText}
                    <p>Klik op de onderstaande knop om verder te gaan (deze link is 7 dagen geldig):</p>
                    <div style="margin: 30px 0;">
                        <a href="${inviteLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">${actionText}</a>
                    </div>
                </div>
            `,
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
