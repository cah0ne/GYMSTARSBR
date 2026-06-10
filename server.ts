import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@libsql/client";
import 'dotenv/config';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Turso connection
  const tursoUrl = process.env.VITE_TURSO_URL || "";
  const tursoAuthToken = process.env.VITE_TURSO_AUTH_TOKEN || "";
  
  const turso = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  });

  // Allow CORS for the proxy
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  // API routing FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy cached variables
  let liveAudioCache: { data: any; timestamp: number } | null = null;
  const CACHE_TTL_MS = 1000; // 1 second cache for Roblox script poll

  // Proxy endpoint for Roblox Lua script
  app.get("/api/live-audio", async (req, res) => {
    try {
      if (!tursoUrl || !tursoAuthToken) {
        return res.status(500).json({ status: "error", message: "Turso não configurado no backend" });
      }

      const now = Date.now();
      if (liveAudioCache && (now - liveAudioCache.timestamp < CACHE_TTL_MS)) {
        return res.json(liveAudioCache.data);
      }

      // table: live_command
      let data: any[] = [];
      try {
        const resDb = await turso.execute({
          sql: `SELECT * FROM live_command WHERE id = ? OR id LIKE ? ORDER BY updatedAt DESC LIMIT 1`,
          args: ["audio", "audio [JSON:%"]
        });
        data = resDb.rows;
      } catch (err: any) {
        // If there is an error but we have a slightly stale cache, return it to ensure uptime
        if (liveAudioCache) {
          console.warn("Turso query error, returning cached live command:", err.message);
          return res.json(liveAudioCache.data);
        }
        return res.status(500).json({ status: "error", error: err.message });
      }

      const item = data && data[0];
      if (!item) {
        const idleResult = { status: "idle", action: "stop_music" };
        liveAudioCache = { data: idleResult, timestamp: now };
        return res.json(idleResult);
      }

      // Check if it's packed JSON
      let dataToReturn = item;
      const targetVal = item.action;
      if (targetVal && typeof targetVal === "string" && targetVal.includes("[JSON:")) {
          const match = targetVal.match(/^(.*?) ?\[JSON:(.*?)\]$/s);
          if (match) {
              dataToReturn = { ...item, ...JSON.parse(match[2]), action: match[1] };
          }
      }

      const successResult = {
        status: "success",
        action: dataToReturn.action,
        url: dataToReturn.url,
        beepUrl: dataToReturn.beepUrl,
        gymnastName: dataToReturn.gymnastName,
        team: dataToReturn.team,
        category: dataToReturn.category,
        updatedAt: dataToReturn.updatedAt,
        triggerBeep: dataToReturn.triggerBeep
      };

      liveAudioCache = { data: successResult, timestamp: now };
      res.json(successResult);

    } catch (e: any) {
      if (liveAudioCache) {
        return res.json(liveAudioCache.data);
      }
      res.status(500).json({ status: "error", error: e.message });
    }
  });

  // API route for app_content
  app.get("/api/app_content", async (req, res) => {
    try {
      const type = req.query.type;
      let querySql = "SELECT * FROM app_content";
      const args: any[] = [];
      if (type) {
        querySql += " WHERE type = ?";
        args.push(type);
      }
      const dbRes = await turso.execute({ sql: querySql, args });
      const items = dbRes.rows.map(item => {
        let unpacked = { ...item };
        const targetVal = item.title;
        if (typeof targetVal === "string" && targetVal.includes("[JSON:")) {
          const match = targetVal.match(/^(.*?) ?\[JSON:(.*?)\]$/s);
          if (match) {
            try {
              unpacked = { ...unpacked, ...JSON.parse(match[2]), title: match[1] };
            } catch (e) {}
          }
        }
        return unpacked;
      });
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ status: "error", error: e.message });
    }
  });

  // API route for competitions
  app.get("/api/competitions", async (req, res) => {
    try {
      const dbRes = await turso.execute({
        sql: "SELECT * FROM competitions ORDER BY createdAt DESC",
        args: []
      });
      res.json(dbRes.rows);
    } catch (e: any) {
      res.status(500).json({ status: "error", error: e.message });
    }
  });

  // API route for scores
  app.get("/api/scores", async (req, res) => {
    try {
      const competitionId = req.query.competitionId;
      let querySql = "SELECT * FROM scores";
      const args: any[] = [];
      if (competitionId) {
        querySql += " WHERE competitionId = ?";
        args.push(competitionId);
      }
      const dbRes = await turso.execute({ sql: querySql, args });
      res.json(dbRes.rows);
    } catch (e: any) {
      res.status(500).json({ status: "error", error: e.message });
    }
  });

  // API route for self-migration from Supabase to Turso
  app.get("/api/migrate", async (req, res) => {
    console.log("[Migration] Iniciando processo de migração via API...");
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://upaosjgfeaacznrqjfsw.supabase.co";
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_rB5nAu6FdUivpGh1kT6DVw_FnUcz8XR";

    const TABLE_SCHEMAS: Record<string, string[]> = {
      users: ['id', 'uid', 'email', 'displayName', 'photoURL', 'role', 'tag', 'createdAt'],
      competitions: ['id', 'name', 'type', 'date', 'time', 'status', 'createdAt'],
      scores: ['id', 'competitionId', 'gymnastId', 'gymnastName', 'category', 'dScore', 'eScore', 'finalScore', 'refereeName', 'createdAt'],
      notifications: ['id', 'title', 'body', 'message', 'type', 'createdAt'],
      app_content: ['id', 'type', 'title', 'createdAt'],
      settings: ['id', 'sfxUrl']
    };

    const TABLE_DEFS: Record<string, string> = {
      users: `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          uid TEXT,
          email TEXT,
          displayName TEXT,
          photoURL TEXT,
          role TEXT,
          tag TEXT,
          createdAt TEXT
        )
      `,
      competitions: `
        CREATE TABLE IF NOT EXISTS competitions (
          id TEXT PRIMARY KEY,
          name TEXT,
          type TEXT,
          date TEXT,
          time TEXT,
          status TEXT,
          createdAt TEXT
        )
      `,
      scores: `
        CREATE TABLE IF NOT EXISTS scores (
          id TEXT PRIMARY KEY,
          competitionId TEXT,
          gymnastId TEXT,
          gymnastName TEXT,
          category TEXT,
          dScore REAL,
          eScore REAL,
          finalScore REAL,
          refereeName TEXT,
          createdAt TEXT
        )
      `,
      notifications: `
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          title TEXT,
          body TEXT,
          message TEXT,
          type TEXT,
          createdAt TEXT
        )
      `,
      app_content: `
        CREATE TABLE IF NOT EXISTS app_content (
          id TEXT PRIMARY KEY,
          type TEXT,
          title TEXT,
          createdAt TEXT
        )
      `,
      settings: `
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY,
          sfxUrl TEXT
        )
      `,
      live_performances: `
        CREATE TABLE IF NOT EXISTS live_performances (
          id TEXT PRIMARY KEY,
          category TEXT,
          gymnastName TEXT,
          gymnastId TEXT,
          competitionId TEXT,
          musicBase64 TEXT,
          sfxUrl TEXT,
          updatedAt TEXT
        )
      `,
      live_command: `
        CREATE TABLE IF NOT EXISTS live_command (
          id TEXT PRIMARY KEY,
          action TEXT,
          url TEXT,
          updatedAt TEXT
        )
      `
    };

    const results: Record<string, any> = {
      tablesCreated: [] as string[],
      tablesMigrated: {} as Record<string, { total: number; success: number; failed: number }>,
      robloxCleared: false,
      status: "success"
    };

    try {
      // 1. Criar tabelas no Turso
      for (const [tableName, createSql] of Object.entries(TABLE_DEFS)) {
        await turso.execute(createSql);
        results.tablesCreated.push(tableName);
      }

      // 2. Limpar Roblox script tables
      await turso.execute("DELETE FROM live_command");
      await turso.execute("DELETE FROM live_performances");
      results.robloxCleared = true;

      // 3. Migrar dados de cada tabela do Supabase
      for (const [tableName, columns] of Object.entries(TABLE_SCHEMAS)) {
        const restUrl = `${supabaseUrl}/rest/v1/${tableName}?select=*`;
        let data: any[] = [];
        
        try {
          const response = await fetch(restUrl, {
            method: "GET",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`
            }
          });
          if (response.ok) {
            data = await response.json();
          } else {
            console.warn(`[Migration] Supabase return-status ${response.status} para tabela ${tableName}`);
          }
        } catch (fetchErr: any) {
          console.error(`[Migration] Erro de fetch na tabela ${tableName}:`, fetchErr.message);
        }

        if (data && data.length > 0) {
          let success = 0;
          let failed = 0;

          for (const row of data) {
            const payload: Record<string, any> = {};
            for (const col of columns) {
              if (row[col] !== undefined) {
                payload[col] = row[col];
              }
            }

            if (tableName === 'settings') {
              payload.id = Number(payload.id) || 1;
            }

            const keys = Object.keys(payload);
            if (keys.length === 0) continue;

            const columnsStr = keys.map(k => `"${k}"`).join(", ");
            const placeholdersStr = keys.map(() => "?").join(", ");
            const args = keys.map(k => payload[k]);

            const sql = `INSERT OR REPLACE INTO "${tableName}" (${columnsStr}) VALUES (${placeholdersStr})`;

            try {
              await turso.execute({ sql, args });
              success++;
            } catch (dbErr: any) {
              console.error(`[Migration] Falha ao inserir ID "${row.id}" na tabela "${tableName}":`, dbErr.message);
              failed++;
            }
          }
          results.tablesMigrated[tableName] = { total: data.length, success, failed };
        } else {
          results.tablesMigrated[tableName] = { total: 0, success: 0, failed: 0 };
        }
      }

      res.json(results);
    } catch (err: any) {
      console.error("[Migration] Erro geral na migração:", err);
      res.status(500).json({ status: "error", message: err.message, results });
    }
  });

  // API route for database verification stats
  app.get("/api/db-stats", async (req, res) => {
    try {
      const getCount = async (table: string) => {
        try {
          const r = await turso.execute(`SELECT COUNT(*) as count FROM "${table}"`);
          return Number(r.rows[0]?.count ?? 0);
        } catch (e: any) {
          console.warn(`Error counting table ${table}:`, e.message);
          return -1;
        }
      };

      const tables = ["users", "competitions", "scores", "notifications", "app_content", "settings", "live_performances", "live_command"];
      const stats: Record<string, number> = {};
      for (const t of tables) {
        stats[t] = await getCount(t);
      }

      res.json({
        status: "success",
        url: tursoUrl ? `${tursoUrl.substring(0, 15)}...` : "Não configurado",
        stats
      });
    } catch (e: any) {
      res.status(500).json({ status: "error", error: e.message });
    }
  });

  // Explicit route to download the production build zip directly from mobile or desktop
  app.get(["/dist.zip", "/GYMSTARS_BRASIL.zip", "/gymstars-brasil.zip"], (req, res) => {
    const zipPath = path.join(process.cwd(), "public", "dist.zip");
    res.download(zipPath, "GYMSTARS_BRASIL.zip", (err) => {
      if (err) {
        console.error("Erro ao transferir o arquivo:", err);
        if (!res.headersSent) {
          res.status(404).send("<h1 style='font-family:sans-serif;text-align:center;margin-top:100px;'>Arquivo de exportação (dist.zip) não encontrado no servidor.<br><span style='font-size:16px;color:#aaa;'>Por favor, aguarde alguns segundos e tente novamente.</span></h1>");
        }
      }
    });
  });

  // Explicit route to download the complete clean source code zip
  app.get(["/codigo.zip", "/GYMSTARS_BRASIL_CODIGO_FONTE.zip"], (req, res) => {
    const srcZipPath = path.join(process.cwd(), "public", "GYMSTARS_BRASIL_CODIGO_FONTE.zip");
    res.download(srcZipPath, "GYMSTARS_BRASIL_CODIGO_FONTE.zip", (err) => {
      if (err) {
        console.error("Erro ao transferir o código fonte:", err);
        if (!res.headersSent) {
          res.status(404).send("<h1 style='font-family:sans-serif;text-align:center;margin-top:100px;'>Código fonte não encontrado no servidor.<br><span style='font-size:16px;color:#aaa;'>Por favor, aguarde e tente novamente.</span></h1>");
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
