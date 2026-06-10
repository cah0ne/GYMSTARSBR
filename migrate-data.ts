import { config } from 'dotenv';
config();
import { createClient as createTursoClient } from '@libsql/client';

// Load Supabase configuration with hardcoded fallbacks
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://upaosjgfeaacznrqjfsw.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_rB5nAu6FdUivpGh1kT6DVw_FnUcz8XR";

// Load Turso configuration
const tursoUrl = process.env.VITE_TURSO_URL;
const tursoAuthToken = process.env.VITE_TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
  console.error("Erro: VITE_TURSO_URL e VITE_TURSO_AUTH_TOKEN devem estar configurados!");
  process.exit(1);
}

console.log("Iniciando processo de migração de dados leve com Fetch API...");
console.log("Supabase URL:", supabaseUrl);
console.log("Turso URL:", tursoUrl);

const turso = createTursoClient({
  url: tursoUrl,
  authToken: tursoAuthToken
});

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

async function runMigration() {
  try {
    // 1. Garantir que todas as tabelas existem no Turso
    console.log("\n1. Criando tabelas no Turso se não existirem...");
    for (const [tableName, createSql] of Object.entries(TABLE_DEFS)) {
      await turso.execute(createSql);
      console.log(`Tabela "${tableName}" verificada/criada.`);
    }

    // 2. Limpar os sistemas de script do Roblox no Turso
    console.log("\n2. Limpando tabelas de script do Roblox (live_command, live_performances)...");
    await turso.execute("DELETE FROM live_command");
    await turso.execute("DELETE FROM live_performances");
    console.log("Tabelas de script do Roblox zeradas com sucesso.");

    // 3. Obter e migrar as demais tabelas do Supabase usando Fetch API com cancelamento por timeout
    console.log("\n3. Iniciando migração das tabelas por REST API de forma otimizada...");
    for (const [tableName, columns] of Object.entries(TABLE_SCHEMAS)) {
      console.log(`\nBuscando dados da tabela: "${tableName}"...`);

      const restUrl = `${supabaseUrl}/rest/v1/${tableName}?select=*`;
      let data: any[] = [];
      
      try {
        const response = await fetch(restUrl, {
          method: "GET",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          },
          signal: AbortSignal.timeout(6000) // 6 segundos de limite por consulta
        });

        if (!response.ok) {
          throw new Error(`Chamada HTTP falhou com status ${response.status}`);
        }

        data = await response.json();
      } catch (err: any) {
        console.error(`Erro ao buscar dados da tabela "${tableName}":`, err.message);
        console.log(`Pulando tabela "${tableName}" devido ao erro de conexão.`);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`Nenhum registro encontrado para a tabela "${tableName}" no Supabase.`);
        continue;
      }

      console.log(`Encontrado(s) ${data.length} registro(s) para "${tableName}". Iniciando escrita no Turso...`);

      // Vamos inserir os registros no Turso
      let successCount = 0;
      let failCount = 0;

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
          successCount++;
        } catch (dbErr: any) {
          console.error(`Erro ao inserir registro id="${row.id}" em "${tableName}":`, dbErr.message);
          failCount++;
        }
      }

      console.log(`Progresso da tabela "${tableName}": ${successCount} salvos, ${failCount} falhas.`);
    }

    console.log("\nProcesso de migração concluído!");
  } catch (err: any) {
    console.error("Erro geral na migração:", err.message);
  } finally {
    // Certifique-se de fechar a conexão com o Turso para o processo terminar imediatamente e não travar
    try {
      console.log("Fechando conexões e finalizando script...");
      process.exit(0);
    } catch (e) {}
  }
}

runMigration();
