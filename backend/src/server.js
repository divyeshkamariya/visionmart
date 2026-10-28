import "dotenv/config";

import app from "./app.js";
import { connectDB } from "./config/db.js";

// Fail fast if required configuration is missing.
for (const name of ["MONGODB_URI", "JWT_SECRET"]) {
  if (!process.env[name]) {
    console.error(`API startup failed: ${name} is missing from the environment.`);
    process.exit(1);
  }
}

if (process.env.JWT_SECRET.length < 16) {
  console.warn("Warning: JWT_SECRET is short. Use a long random value (32+ characters).");
}

const port = Number(process.env.PORT || 5000);

try {
  await connectDB();

  app.listen(port, () => {
    console.log(`VisionMart API listening on port ${port}`);
  });
} catch (error) {
  console.error(`API startup failed: ${error.message}`);
  process.exit(1);
}
