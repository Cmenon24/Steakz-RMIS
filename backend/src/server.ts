
import { env } from "./config/env.js";
import app from "./app.js";
import { prisma } from "./config/prisma.js";

// Verify the database connection before starting the API.
async function startServer() {
  try {
    await prisma.$connect();

    console.log("Database connection successful!");

    // Start the HTTP server.
    const server = app.listen(env.PORT, () => {
      console.log(`
========================================
       STEAKZ RMIS BACKEND
========================================
  Environment: ${env.NODE_ENV}
  Port:        ${env.PORT}
  API:         http://localhost:${env.PORT}
  Health:      http://localhost:${env.PORT}/api/v1/health
========================================
      `);
    });

    // Close the server and database connection safely.
    const shutdown = (signal: string) => {
      console.log(`\n${signal} received. Shutting down...`);

      server.close(async (error) => {
        if (error) {
          console.error("Error closing HTTP server:", error);
          await prisma.$disconnect();
          process.exitCode = 1;
          return;
        }

        try {
          await prisma.$disconnect();
          console.log("Database connection closed.");
          console.log("Server shut down successfully.");
          process.exitCode = 0;
        } catch (disconnectError) {
          console.error("Error disconnecting Prisma:", disconnectError);
          process.exitCode = 1;
        }
      });
    };

    // Handle terminal interruption and system shutdown signals.
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start the server:", error);

    await prisma.$disconnect();
    process.exitCode = 1;
  }
}

startServer();
