// Load the backend environment variables before checking the database connection.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { hashPassword } from "../src/utils/password.js";

// Allow this script to run only in the explicitly selected test environment.
if (process.env.NODE_ENV !== "test") {
  throw new Error("Test seeding is allowed only when NODE_ENV=test.");
}

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const developmentDatabaseUrl = process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST is required to seed the test database.");
}

if (!developmentDatabaseUrl) {
  throw new Error("DATABASE_URL is required for the development-database safety check.");
}

// Verify the exact database name before opening a connection.
const testUrl = new URL(testDatabaseUrl);
const developmentUrl = new URL(developmentDatabaseUrl);
const testDatabaseName = testUrl.pathname.replace(/^\/+/, "");

if (testDatabaseName !== "steakz_rmis_test_db") {
  throw new Error("Refusing to seed: the database must be steakz_rmis_test_db.");
}

if (
  testUrl.hostname === developmentUrl.hostname &&
  testUrl.port === developmentUrl.port &&
  testUrl.pathname === developmentUrl.pathname
) {
  throw new Error("Refusing to seed: the test database URL matches the development database.");
}

// Connect directly to the verified test database, never the development database.
const adapter = new PrismaPg({ connectionString: testDatabaseUrl });
const prisma = new PrismaClient({ adapter });

// Use a password reserved for local automated testing only.
const testPassword = "SteakzTest!2026";

// Define the five demonstration branches used by the test suite.
const branches = [
  {
    branchCode: "LON001",
    name: "London",
    address: "Demo address, London, UK",
    contactNumber: "0000000001",
    email: "london@test.steakz.com",
    timeZone: "Europe/London",
  },
  {
    branchCode: "MAN001",
    name: "Manchester",
    address: "Demo address, Manchester, UK",
    contactNumber: "0000000002",
    email: "manchester@test.steakz.com",
    timeZone: "Europe/London",
  },
  {
    branchCode: "LIV001",
    name: "Liverpool",
    address: "Demo address, Liverpool, UK",
    contactNumber: "0000000003",
    email: "liverpool@test.steakz.com",
    timeZone: "Europe/London",
  },
  {
    branchCode: "BHM001",
    name: "Birmingham",
    address: "Demo address, Birmingham, UK",
    contactNumber: "0000000004",
    email: "birmingham@test.steakz.com",
    timeZone: "Europe/London",
  },
  {
    branchCode: "LDS001",
    name: "Leeds",
    address: "Demo address, Leeds, UK",
    contactNumber: "0000000005",
    email: "leeds@test.steakz.com",
    timeZone: "Europe/London",
  },
] as const;

// Define the central Admin and Headquarters Manager test accounts.
const centralUsers = [
  {
    firstName: "Test",
    lastName: "Administrator",
    email: "admin@test.steakz.com",
    role: "ADMIN" as const,
  },
  {
    firstName: "Test",
    lastName: "Headquarters Manager",
    email: "hqmanager@test.steakz.com",
    role: "HEADQUARTERS_MANAGER" as const,
  },
];

// Define one Branch Manager, Server, and Cook account for every branch.
const branchUsers = [
  {
    role: "BRANCH_MANAGER" as const,
    prefix: "bmanager",
    firstName: "Test Branch",
    lastName: "Manager",
  },
  {
    role: "SERVER" as const,
    prefix: "server",
    firstName: "Test Restaurant",
    lastName: "Server",
  },
  {
    role: "COOK" as const,
    prefix: "cook",
    firstName: "Test Kitchen",
    lastName: "Cook",
  },
];

// Create or update only the test branches and test accounts.
async function seedTestDatabase() {
  console.log("Starting Steakz RMIS TEST database seeding...");
  console.log(`Verified database: ${testDatabaseName}`);

  const createdBranches = [];

  // Create branches first so employee accounts can reference them.
  for (const branch of branches) {
    const result = await prisma.branch.upsert({
      where: { branchCode: branch.branchCode },
      update: { ...branch, isActive: true, deactivatedAt: null },
      create: { ...branch },
    });

    createdBranches.push(result);
    console.log(`Test branch ready: ${result.name}`);
  }

  // Create the two central test accounts.
  const centralPasswordHash = await hashPassword(testPassword);

  for (const user of centralUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: centralPasswordHash,
        role: user.role,
        branchId: null,
        isActive: true,
        deactivatedAt: null,
      },
      create: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        passwordHash: centralPasswordHash,
        role: user.role,
        branchId: null,
      },
    });

    console.log(`Central test account ready: ${user.email}`);
  }

  // Create one test employee for each operational role at every branch.
  const branchPasswordHash = await hashPassword(testPassword);

  for (const branch of createdBranches) {
    const branchName = branch.name.toLowerCase();

    for (const employee of branchUsers) {
      const email = `${employee.prefix}.${branchName}@test.steakz.com`;

      await prisma.user.upsert({
        where: { email },
        update: {
          firstName: employee.firstName,
          lastName: `${employee.lastName} - ${branch.name}`,
          passwordHash: branchPasswordHash,
          role: employee.role,
          branchId: branch.id,
          isActive: true,
          deactivatedAt: null,
        },
        create: {
          firstName: employee.firstName,
          lastName: `${employee.lastName} - ${branch.name}`,
          email,
          passwordHash: branchPasswordHash,
          role: employee.role,
          branchId: branch.id,
        },
      });

      console.log(`Branch test account ready: ${email}`);
    }
  }

  console.log("\nTest database seeding completed!");
  console.log("Created or updated 5 test branches and 17 test accounts.");
  console.log(`Test-only password for all accounts: ${testPassword}`);
}

// Always disconnect from the test database after seeding finishes or fails.
seedTestDatabase()
  .catch((error) => {
    console.error("Test database seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
