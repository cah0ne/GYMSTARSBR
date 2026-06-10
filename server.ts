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
