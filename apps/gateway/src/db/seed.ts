import "dotenv/config";
import { ensureAdminSystemSeeded } from "./bootstrap";

async function run() {
  await ensureAdminSystemSeeded({
    superAdminEmail: process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL,
  });
  console.log("Admin system seed completed.");
}

run().catch((error) => {
  console.error("Admin system seed failed.", error);
  process.exit(1);
});
