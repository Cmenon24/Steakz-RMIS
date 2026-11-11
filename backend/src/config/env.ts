import "dotenv/config";
import { z } from "zod";

// Define and validate the required environment variables.
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    PORT: z.coerce.number().int().positive().default(5000),

    FRONTEND_URL: z.url().default("http://localhost:5173"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    DATABASE_URL_TEST: z.string().url().optional(),

    JWT_SECRET: z
      .string()
      .min(32, "JWT_SECRET must contain at least 32 characters"),
  })
  .superRefine((values, context) => {
    // Tests must use the dedicated test database, never the development database.
    if (values.NODE_ENV !== "test") return;

    if (!values.DATABASE_URL_TEST) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL_TEST"],
        message: "DATABASE_URL_TEST is required when NODE_ENV is test",
      });
      return;
    }

    try {
      const developmentUrl = new URL(values.DATABASE_URL);
      const testUrl = new URL(values.DATABASE_URL_TEST);

      if (testUrl.pathname.replace(/^\//, "") !== "steakz_rmis_test_db") {
        context.addIssue({
          code: "custom",
          path: ["DATABASE_URL_TEST"],
          message: "Tests may only connect to the steakz_rmis_test_db database",
        });
      }

      if (
        developmentUrl.hostname === testUrl.hostname &&
        developmentUrl.port === testUrl.port &&
        developmentUrl.pathname === testUrl.pathname
      ) {
        context.addIssue({
          code: "custom",
          path: ["DATABASE_URL_TEST"],
          message: "DATABASE_URL_TEST must not point to the development database",
        });
      }
    } catch {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL_TEST"],
        message: "DATABASE_URL_TEST must be a valid PostgreSQL connection URL",
      });
    }
  });

// Stop startup if the environment configuration is invalid.
export const env = envSchema.parse(process.env);
