import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const prismaClientSingleton = () => {
    let dbUrl = process.env.DATABASE_URL || "file:./dev.db";
    // Resolve relative file: URLs to absolute paths for libsql
    if (dbUrl.startsWith("file:") && !dbUrl.startsWith("file:/")) {
        const relativePath = dbUrl.replace("file:", "");
        dbUrl = "file:" + path.resolve(relativePath);
    }
    const adapter = new PrismaLibSql({
        url: dbUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN
    });
    return new PrismaClient({ adapter });
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

