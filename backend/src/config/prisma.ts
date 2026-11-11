// Validate application configuration before initializing the database connection.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

// Select the dedicated database only when running automated tests.
const connectionString =
  env.NODE_ENV === "test" ? env.DATABASE_URL_TEST! : env.DATABASE_URL;

// Create the PostgreSQL adapter using the selected database URL.
const adapter = new PrismaPg({
  connectionString,
});

// Create one shared Prisma Client instance.
export const prisma = new PrismaClient({
  adapter,
});
