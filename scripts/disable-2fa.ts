import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const client = createClient({
        url: process.env.DATABASE_URL!,
        authToken: process.env.DATABASE_AUTH_TOKEN!,
    });

    console.log("Disabling 2FA for admin@evalco.nl...");

    await client.execute(
        "UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE email = 'admin@evalco.nl'"
    );

    // Verify
    const result = await client.execute(
        "SELECT email, two_factor_enabled, two_factor_secret FROM users WHERE email = 'admin@evalco.nl'"
    );

    for (const row of result.rows) {
        console.log(`User: ${row.email}`);
        console.log(`  2FA Enabled: ${row.two_factor_enabled}`);
        console.log(`  2FA Secret: ${row.two_factor_secret}`);
    }

    console.log("\n✅ 2FA disabled successfully!");
    client.close();
}

main().catch(console.error);
