import "dotenv/config";
import { defineConfig } from "prisma/config";

// A placeholder URL keeps `prisma generate` working before a real `.env`
// exists. At runtime the application only connects when DATABASE_URL is set.
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/reconshield";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
