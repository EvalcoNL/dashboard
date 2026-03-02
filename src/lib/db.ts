import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const prismaClientSingleton = () => {
    const dbUrl = process.env.DATABASE_URL || "file:./data/evalco.db";
    const authToken = process.env.DATABASE_AUTH_TOKEN;

    // Use libsql adapter for both local file and Turso cloud
    let resolvedUrl = dbUrl;
    if (dbUrl.startsWith("file:") && !dbUrl.startsWith("file:/")) {
        const relativePath = dbUrl.replace("file:", "");
        resolvedUrl = "file:" + path.resolve(relativePath);
    }

    const adapter = new PrismaLibSql({
        url: resolvedUrl,
        ...(authToken ? { authToken } : {}),
    });
    return new PrismaClient({ adapter });
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

