import { config } from 'dotenv';
config();
import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const turso = createClient({
  url: process.env.VITE_TURSO_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN!
});

const luaCode = fs.readFileSync(path.join(__dirname, 'delta_ranking.lua'), 'utf-8');

async function run() {
  console.log("Upserting new Roblox script to app_content as a 'codigo' collection...");
  const packTarget = "Script Delta Executor - Live Rankings";
  const packJson = {
    text: luaCode,
    link: "",
    photoUrl: ""
  };
  const payloadFormat = `${packTarget} [JSON:${JSON.stringify(packJson)}]`;
  try {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO app_content (id, type, title, createdAt) VALUES (?, ?, ?, ?)`,
      args: ['codigo_roblox_ranking_v3', 'codigo', payloadFormat, new Date().toISOString()]
    });
    console.log("Result: Upserted successfully to Turso");
  } catch (err) {
    console.error("Error upserting to Turso:", err);
  }
}

run();
