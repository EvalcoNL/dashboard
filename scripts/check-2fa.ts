import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const client = createClient({
        url: process.env.DATABASE_URL!,
        authToken: process.env.DATABASE_AUTH_TOKEN!,
    });

    console.log("Checking 2FA status for all users...\n");

    const result = await client.execute(
        "SELECT id, email, name, role, two_factor_enabled, two_factor_secret, password_hash FROM users"
    );

    for (const row of result.rows) {
        console.log(`User: ${row.email}`);
        console.log(`  Name: ${row.name}`);
        console.log(`  Role: ${row.role}`);
        console.log(`  2FA Enabled: ${row.two_factor_enabled}`);
        console.log(`  2FA Secret set: ${!!row.two_factor_secret}`);
        console.log(`  2FA Secret value: ${row.two_factor_secret ? (row.two_factor_secret as string).substring(0, 5) + "..." : "null"}`);
        console.log(`  Password hash exists: ${!!row.password_hash}`);
        console.log(`  Password hash: ${(row.password_hash as string).substring(0, 15)}...`);
        console.log("");
    }

    client.close();
}

main().catch(console.error);
