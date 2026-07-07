import { validateEnv, getEnv } from "./utils/env";
import { getLogger, initializeLogger } from "./utils/logger";
import { testDatabaseConnection } from "./db/pool";

async function runStartupChecks() {
  console.log("[v03] Running startup validation checks...\n");

  let passed = 0;
  let failed = 0;

  // Check 1: Environment validation
  try {
    console.log("✓ Validating environment variables...");
    validateEnv();
    const env = getEnv();
    console.log(`  - NODE_ENV: ${env.NODE_ENV}`);
    console.log(`  - DATABASE_URL: ${env.DATABASE_URL.replace(/:[^:@]*@/, ":***@")}`);
    console.log(`  - PORT: ${env.PORT}`);
    passed++;
  } catch (error) {
    console.error(`✗ Environment validation failed: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }

  // Check 2: Logger initialization
  try {
    console.log("\n✓ Initializing logger...");
    initializeLogger();
    const logger = getLogger();
    logger.info("Logger test message");
    passed++;
  } catch (error) {
    console.error(`✗ Logger initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }

  // Check 3: Database connection
  try {
    console.log("\n✓ Testing database connection...");
    const connected = await testDatabaseConnection();
    if (connected) {
      console.log("  - Database connection: OK");
      passed++;
    } else {
      console.error("  - Database connection: FAILED");
      failed++;
    }
  } catch (error) {
    console.error(`✗ Database test failed: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }

  // Check 4: Required directories
  try {
    console.log("\n✓ Checking required directories...");
    const env = getEnv();
    const fs = await import("fs").then((m) => m.promises);
    
    await fs.mkdir(env.STORAGE_PATH, { recursive: true });
    console.log(`  - Storage directory: ${env.STORAGE_PATH}`);
    passed++;
  } catch (error) {
    console.error(`✗ Directory check failed: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }

  // Check 5: Port availability (optional, only warn)
  try {
    console.log("\n✓ Checking port availability...");
    const env = getEnv();
    const net = await import("net");
    
    const server = net.createServer();
    await new Promise<void>((resolve, reject) => {
      server.once("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          reject(new Error(`Port ${env.PORT} is already in use`));
        } else {
          reject(err);
        }
      });
      server.once("listening", () => {
        server.close();
        resolve();
      });
      server.listen(env.PORT, env.HOST);
    });
    console.log(`  - Port ${env.PORT} is available`);
    passed++;
  } catch (error) {
    console.warn(`⚠ Port check warning: ${error instanceof Error ? error.message : String(error)}`);
    // Don't count as failure for port check
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`Startup Validation Summary:`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log("=".repeat(50) + "\n");

  if (failed > 0) {
    console.error("[v03] Startup validation FAILED. Server will not start.");
    process.exit(1);
  } else {
    console.log("[v03] All startup checks PASSED. Ready to start server.\n");
    process.exit(0);
  }
}

runStartupChecks().catch((error) => {
  console.error("[v03] Unexpected error during startup validation:", error);
  process.exit(1);
});
