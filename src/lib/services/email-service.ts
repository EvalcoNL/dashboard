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
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 767 767" width="32" height="32"><path d="M 494 419 L 492 419 L 490 421 L 486 423 L 483 426 L 482 426 L 478 430 L 477 430 L 470 437 L 469 437 L 462 444 L 461 444 L 430 475 L 430 476 L 425 481 L 425 482 L 420 487 L 420 488 L 414 494 L 412 498 L 408 502 L 408 503 L 405 506 L 401 513 L 398 516 L 398 517 L 390 528 L 389 531 L 387 533 L 383 541 L 381 543 L 375 555 L 373 557 L 373 559 L 359 587 L 359 589 L 357 592 L 357 594 L 355 597 L 355 599 L 351 607 L 351 609 L 350 610 L 348 618 L 346 621 L 345 627 L 344 628 L 344 631 L 343 632 L 343 634 L 342 635 L 342 637 L 340 641 L 340 644 L 339 645 L 339 648 L 338 649 L 338 652 L 337 653 L 337 656 L 336 657 L 336 660 L 335 661 L 335 664 L 334 665 L 333 672 L 332 673 L 332 678 L 331 679 L 330 689 L 329 690 L 328 704 L 327 705 L 327 713 L 326 714 L 326 721 L 325 722 L 325 730 L 324 731 L 324 760 L 323 761 L 323 764 L 325 766 L 433 766 L 434 765 L 434 762 L 435 761 L 434 759 L 434 715 L 435 714 L 434 713 L 434 696 L 435 695 L 435 693 L 434 692 L 434 649 L 435 648 L 434 647 L 434 625 L 435 624 L 434 623 L 434 611 L 435 610 L 435 603 L 434 602 L 434 559 L 435 558 L 435 541 L 434 540 L 434 538 L 435 537 L 434 536 L 434 515 L 435 514 L 436 514 L 539 617 L 540 617 L 546 623 L 546 624 L 562 640 L 563 640 L 568 645 L 571 644 L 644 571 L 645 569 L 551 475 L 550 475 L 548 473 L 548 472 L 547 472 L 545 470 L 545 469 L 531 455 L 530 455 L 526 451 L 526 450 L 522 446 L 521 446 L 517 442 L 517 441 L 502 426 L 501 426 Z" fill="white"/><path d="M 0 324 L 0 430 L 1 431 L 1 435 L 251 435 L 252 436 L 216 472 L 215 472 L 214 474 L 186 502 L 185 502 L 184 504 L 121 567 L 121 568 L 128 575 L 128 576 L 130 577 L 131 579 L 132 579 L 197 644 L 199 644 L 331 512 L 332 512 L 334 510 L 334 509 L 348 495 L 348 492 L 341 484 L 341 483 L 334 476 L 334 475 L 324 464 L 324 463 L 296 435 L 295 435 L 289 429 L 288 429 L 280 421 L 279 421 L 275 417 L 274 417 L 271 414 L 270 414 L 267 411 L 266 411 L 262 407 L 261 407 L 254 401 L 253 401 L 245 395 L 242 394 L 228 384 L 216 378 L 214 376 L 184 361 L 182 361 L 177 358 L 172 357 L 170 355 L 168 355 L 165 353 L 163 353 L 158 350 L 153 349 L 150 347 L 147 347 L 146 346 L 144 346 L 143 345 L 141 345 L 137 343 L 134 343 L 133 342 L 131 342 L 130 341 L 128 341 L 124 339 L 121 339 L 117 337 L 113 337 L 112 336 L 109 336 L 108 335 L 105 335 L 104 334 L 101 334 L 100 333 L 96 333 L 95 332 L 92 332 L 91 331 L 87 331 L 86 330 L 83 330 L 82 329 L 76 329 L 75 328 L 67 328 L 66 327 L 60 327 L 59 326 L 53 326 L 52 325 L 45 325 L 44 324 L 33 324 L 32 323 L 1 323 Z" fill="white"/><path d="M 419 272 L 419 275 L 421 277 L 421 278 L 428 286 L 428 287 L 431 290 L 431 291 L 436 296 L 436 297 L 443 304 L 443 305 L 444 305 L 445 307 L 467 329 L 468 329 L 475 336 L 476 336 L 484 344 L 485 344 L 489 348 L 490 348 L 493 351 L 497 353 L 500 356 L 501 356 L 504 359 L 505 359 L 508 362 L 509 362 L 512 365 L 513 365 L 521 371 L 524 372 L 529 376 L 532 377 L 534 379 L 537 380 L 539 382 L 542 383 L 549 388 L 558 392 L 560 394 L 572 400 L 574 400 L 587 407 L 589 407 L 592 409 L 594 409 L 604 414 L 607 414 L 610 416 L 612 416 L 613 417 L 615 417 L 616 418 L 618 418 L 619 419 L 621 419 L 622 420 L 624 420 L 625 421 L 627 421 L 628 422 L 630 422 L 634 424 L 637 424 L 638 425 L 645 426 L 649 428 L 652 428 L 656 430 L 664 431 L 665 432 L 668 432 L 669 433 L 679 434 L 680 435 L 685 435 L 686 436 L 691 436 L 692 437 L 697 437 L 698 438 L 711 439 L 712 440 L 723 440 L 724 441 L 739 441 L 740 442 L 766 442 L 766 331 L 517 331 L 516 330 L 530 316 L 530 315 L 539 306 L 540 306 L 558 288 L 558 287 L 560 285 L 561 285 L 577 269 L 577 268 L 584 261 L 585 261 L 599 247 L 599 246 L 601 244 L 602 244 L 602 243 L 604 242 L 645 201 L 646 198 L 620 172 L 620 171 L 619 171 L 570 122 L 569 122 Z" fill="white"/><path d="M 441 0 L 440 1 L 406 1 L 405 0 L 386 0 L 385 1 L 384 0 L 383 1 L 346 1 L 345 0 L 339 0 L 338 1 L 332 1 L 331 2 L 331 250 L 330 251 L 200 121 L 198 121 L 182 137 L 181 137 L 181 138 L 166 153 L 165 153 L 165 154 L 163 155 L 163 156 L 161 157 L 161 158 L 159 159 L 159 160 L 153 166 L 152 166 L 147 171 L 147 172 L 145 173 L 141 177 L 141 178 L 124 194 L 124 195 L 122 197 L 122 198 L 144 220 L 144 221 L 146 222 L 147 224 L 148 224 L 194 270 L 195 270 L 200 275 L 200 276 L 201 276 L 203 278 L 203 279 L 217 293 L 218 293 L 219 295 L 220 295 L 227 302 L 227 303 L 238 314 L 239 314 L 251 326 L 251 327 L 252 327 L 255 330 L 255 331 L 256 331 L 257 333 L 258 333 L 260 335 L 261 337 L 262 337 L 265 340 L 265 341 L 267 343 L 268 343 L 273 348 L 278 344 L 279 344 L 284 339 L 285 339 L 288 336 L 289 336 L 292 333 L 293 333 L 313 314 L 314 314 L 330 298 L 330 297 L 339 288 L 339 287 L 352 273 L 352 272 L 356 268 L 356 267 L 362 260 L 364 256 L 370 249 L 370 248 L 380 234 L 381 231 L 383 229 L 384 226 L 386 224 L 390 216 L 392 214 L 408 182 L 408 180 L 410 177 L 410 175 L 413 170 L 413 168 L 417 160 L 418 155 L 420 152 L 420 150 L 421 149 L 421 147 L 422 146 L 422 144 L 423 143 L 423 141 L 424 140 L 424 138 L 425 137 L 425 135 L 427 131 L 427 128 L 429 124 L 429 121 L 430 120 L 430 117 L 431 116 L 431 112 L 432 111 L 432 108 L 433 107 L 433 104 L 434 103 L 434 99 L 435 98 L 435 94 L 436 93 L 436 90 L 437 89 L 437 85 L 438 84 L 438 79 L 439 78 L 439 71 L 440 70 L 440 62 L 441 61 L 441 54 L 442 53 L 442 45 L 443 44 L 443 33 L 444 32 L 444 3 L 443 1 Z" fill="white"/></svg>
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
                
                <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/" class="button">Open Dashboard</a>
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
                
                <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/" class="button">Bekijk Rapportages</a>
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

export async function sendProjectInviteEmail(email: string, clientName: string, token: string, userExists: boolean = false) {
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

export async function sendEmailChangeVerification(newEmail: string, token: string) {
    const verifyLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/user/verify-email-change?token=${token}`;

    if (!process.env.RESEND_API_KEY) {
        console.log(`[EmailService] Mocking Email Change Verification to ${newEmail}`);
        return { success: true, mocked: true };
    }

    try {
        const html = renderEmailTemplate(
            "E-mailadres bevestigen",
            `
                <p>Je hebt een verzoek ingediend om je e-mailadres te wijzigen naar <strong>${newEmail}</strong>.</p>
                <p>Klik op de onderstaande knop om je nieuwe e-mailadres te bevestigen. Deze link is <strong>1 uur geldig</strong>.</p>
                
                <div style="text-align: center;">
                    <a href="${verifyLink}" class="button">E-mailadres Bevestigen</a>
                </div>
                
                <p style="margin-top: 32px; color: #64748b; font-size: 0.8125rem;">
                    Als je dit verzoek niet hebt gedaan, kun je deze e-mail veilig negeren. Je e-mailadres blijft ongewijzigd.
                </p>
            `
        );

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [newEmail],
            subject: "📧 E-mailadres bevestigen - Evalco Dashboard",
            html,
        });

        if (error) {
            console.error("[EmailService] Resend API Warning/Error:", error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error("[EmailService] Error sending email change verification:", error);
        return { success: false, error };
    }
}

// ──────────────────────────────────────────────────────────────
// Weekly Digest Email
// ──────────────────────────────────────────────────────────────

export interface WeeklyDigestPayload {
    recipientEmail: string;
    recipientName: string;
    projects: {
        name: string;
        targetCPA: number | null;
        incidentsThisWeek: number;
        openIncidents: number;
        activeRules: number;
    }[];
    periodStart: Date;
    periodEnd: Date;
}

export async function sendWeeklyDigestEmail(payload: WeeklyDigestPayload) {
    const { recipientEmail, recipientName, projects, periodStart, periodEnd } = payload;

    if (!process.env.RESEND_API_KEY) {
        console.log(`[EmailService] Mocking Weekly Digest to ${recipientEmail}`);
        return { success: true, mocked: true };
    }

    const formatDate = (d: Date) => d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
    const period = `${formatDate(periodStart)} — ${formatDate(periodEnd)}`;

    const totalIncidents = projects.reduce((sum, p) => sum + p.incidentsThisWeek, 0);
    const totalOpen = projects.reduce((sum, p) => sum + p.openIncidents, 0);
    const totalRules = projects.reduce((sum, p) => sum + p.activeRules, 0);

    // Build projects table rows
    const projectRows = projects.map(p => {
        const statusColor = p.openIncidents > 0 ? "#ef4444" : "#10b981";
        const statusLabel = p.openIncidents > 0 ? `${p.openIncidents} open` : "✓ OK";
        return `
            <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">
                    ${p.name}
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                    ${p.incidentsThisWeek}
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                    <span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                    ${p.activeRules}
                </td>
            </tr>
        `;
    }).join("\n");

    try {
        const html = renderEmailTemplate(
            "Wekelijks Performance Overzicht",
            `
                <p>Hallo <strong>${recipientName}</strong>,</p>
                <p>Hier is je wekelijkse samenvatting voor de periode <strong>${period}</strong>.</p>
                
                <!-- Summary Stats -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background: #6366f1; color: white; padding: 16px; text-align: center; width: 33%;">
                            <div style="font-size: 1.5rem; font-weight: 700;">${projects.length}</div>
                            <div style="font-size: 0.75rem; opacity: 0.9; text-transform: uppercase;">Projecten</div>
                        </td>
                        <td style="background: ${totalOpen > 0 ? "#ef4444" : "#10b981"}; color: white; padding: 16px; text-align: center; width: 33%;">
                            <div style="font-size: 1.5rem; font-weight: 700;">${totalIncidents}</div>
                            <div style="font-size: 0.75rem; opacity: 0.9; text-transform: uppercase;">Incidenten</div>
                        </td>
                        <td style="background: #0ea5e9; color: white; padding: 16px; text-align: center; width: 34%;">
                            <div style="font-size: 1.5rem; font-weight: 700;">${totalRules}</div>
                            <div style="font-size: 0.75rem; opacity: 0.9; text-transform: uppercase;">Actieve Regels</div>
                        </td>
                    </tr>
                </table>
                
                <!-- Projects Table -->
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 24px 0;">
                    <thead>
                        <tr style="background-color: #f8fafc;">
                            <th style="padding: 12px 16px; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600;">Project</th>
                            <th style="padding: 12px 16px; text-align: center; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600;">Incidenten</th>
                            <th style="padding: 12px 16px; text-align: center; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600;">Status</th>
                            <th style="padding: 12px 16px; text-align: center; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600;">Regels</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projectRows}
                    </tbody>
                </table>
                
                ${totalOpen > 0 ? `
                    <div class="alert-box">
                        <p style="margin: 0;"><strong>Let op:</strong> Er ${totalOpen === 1 ? "is" : "zijn"} ${totalOpen} open incident${totalOpen !== 1 ? "en" : ""} die aandacht vereist${totalOpen !== 1 ? "en" : ""}.</p>
                    </div>
                ` : `
                    <div class="success-box">
                        <p style="margin: 0;">✅ Alle projecten draaien zonder openstaande incidenten. Goed bezig!</p>
                    </div>
                `}
                
                <div style="text-align: center;">
                    <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/" class="button">Open Dashboard</a>
                </div>
            `
        );

        const data = await resend.emails.send({
            from: FROM_EMAIL,
            to: [recipientEmail],
            subject: `📊 Wekelijks Overzicht — ${period}`,
            html,
        });

        return { success: true, data };
    } catch (error) {
        console.error("[EmailService] Error sending weekly digest:", error);
        return { success: false, error };
    }
}
