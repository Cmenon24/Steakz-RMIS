import "dotenv/config";
import { defineConfig } from "prisma/config";

// Use the dedicated test database for Prisma CLI commands in test mode.
const isTestEnvironment = process.env.NODE_ENV === "test";
const databaseUrl = isTestEnvironment
  ? process.env.DATABASE_URL_TEST
  : process.env.DATABASE_URL;

// Fail closed if test mode is missing its dedicated database connection.
if (isTestEnvironment) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL_TEST is required when NODE_ENV is test.");
  }

  if (new URL(databaseUrl).pathname.replace(/^\//, "") !== "steakz_rmis_test_db") {
    throw new Error(
      "Test commands may only connect to the steakz_rmis_test_db database.",
    );
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",

    // Tell Prisma how to execute the database seed script.
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: databaseUrl,
  },
});
