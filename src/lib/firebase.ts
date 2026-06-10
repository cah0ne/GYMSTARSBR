import { createClient } from "@libsql/client/web";

// Initialize Turso configuration
const tursoUrl = import.meta.env.VITE_TURSO_URL || "libsql://placeholder-url.turso.io";
const tursoAuthToken = import.meta.env.VITE_TURSO_AUTH_TOKEN || "placeholder-token";

if (!import.meta.env.VITE_TURSO_URL || !import.meta.env.VITE_TURSO_AUTH_TOKEN) {
  console.warn(
    "Aviso: VITE_TURSO_URL ou VITE_TURSO_AUTH_TOKEN não foram detectados no ambiente. Certifique-se de adicioná-los no painel de Secrets ou no arquivo .env local."
  );
}

export const turso = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

export function getSupabaseTableName(name: string): string {
  if (
    name === "appContent" ||
    name === "feed" ||
    name === "feed_comments" ||
    name === "chat_rooms" ||
    name === "chat_messages" ||
    name === "chat_presence" ||
    name === "chat_typing"
  ) {
    return "app_content";
  }
  if (name === "liveCommand") return "live_command";
  if (name === "livePerformances") return "live_performances";
  // Fallback to auto-convert camelCase to snake_case (e.g., liveCommand -> live_command)
  return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

interface TableSchema {
  columns: string[];
  packTargetColumn: string;
}

const TABLE_SCHEMAS: Record<string, TableSchema> = {
  users: {
    columns: ['id', 'uid', 'email', 'displayName', 'photoURL', 'role', 'tag', 'createdAt'],
    packTargetColumn: 'displayName'
  },
  competitions: {
    columns: ['id', 'name', 'type', 'date', 'time', 'status', 'createdAt'],
    packTargetColumn: 'name'
  },
  scores: {
    columns: ['id', 'competitionId', 'gymnastId', 'gymnastName', 'category', 'dScore', 'eScore', 'finalScore', 'refereeName', 'createdAt'],
    packTargetColumn: 'refereeName'
  },
  notifications: {
    columns: ['id', 'title', 'body', 'message', 'type', 'createdAt'],
    packTargetColumn: 'title'
  },
  app_content: {
    columns: ['id', 'type', 'title', 'createdAt'],
    packTargetColumn: 'title'
  },
  live_performances: {
    columns: ['id', 'category', 'gymnastName', 'gymnastId', 'competitionId', 'musicBase64', 'sfxUrl', 'updatedAt'],
    packTargetColumn: 'gymnastName'
  },
  live_command: {
    columns: ['id', 'action', 'url', 'updatedAt'],
    packTargetColumn: 'action'
  },
  settings: {
    columns: ['id', 'sfxUrl'],
    packTargetColumn: 'sfxUrl'
  },
  feed: {
    columns: ['id', 'title', 'createdAt'],
    packTargetColumn: 'title'
  },
  feed_comments: {
    columns: ['id', 'postId', 'createdAt'],
    packTargetColumn: 'postId'
  }
};

export function unpackRow(collectionName: string, row: any): any {
  if (!row) return row;
  const config = TABLE_SCHEMAS[getSupabaseTableName(collectionName)] || TABLE_SCHEMAS[collectionName];
  if (!config) return row;

  // Search all string keys in the row for any packed [JSON:] markers.
  // This supports legacy columns gracefully and repairs any column-level truncation.
  Object.keys(row).forEach((col) => {
    const val = row[col];
    if (val && typeof val === "string") {
      if (val.includes("[JSON:")) {
        const idx = val.indexOf("[JSON:");
        const originalValue = val.substring(0, idx).trim();
        const rawJsonPart = val.substring(idx + 6); // past "[JSON:"

        let cleanJson = rawJsonPart.trim();
        if (cleanJson.endsWith("]")) {
          cleanJson = cleanJson.slice(0, -1);
        }

        try {
          const extra = JSON.parse(cleanJson);
          Object.keys(extra).forEach((key) => {
            row[key] = extra[key];
          });
        } catch (err) {
          // Robust regex backup extractor to recover attributes from a truncated/malformed JSON string
          const usernameMatch = rawJsonPart.match(/"username"\s*:\s*"([^"]*)/);
          if (usernameMatch) {
            row.username = usernameMatch[1].replace(/["},]*$/, "");
          }
          const colorMatch = rawJsonPart.match(/"profileColor"\s*:\s*"([^"]*)/);
          if (colorMatch) {
            row.profileColor = colorMatch[1].replace(/["},]*$/, "");
          }
          const tagMatch = rawJsonPart.match(/"tag"\s*:\s*"([^"]*)/);
          if (tagMatch) {
            row.tag = tagMatch[1].replace(/["},]*$/, "");
          }
          const musicMatch = rawJsonPart.match(/"musicBase64"\s*:\s*"([^"]*)/);
          if (musicMatch) {
            row.musicBase64 = musicMatch[1].replace(/["},]*$/, "");
          }
          const compMatch = rawJsonPart.match(/"competitionName"\s*:\s*"([^"]*)/);
          if (compMatch) {
            row.competitionName = compMatch[1].replace(/["},]*$/, "");
          }
          const photoMatch = rawJsonPart.match(/"photoURL"\s*:\s*"([^"]*)/);
          if (photoMatch) {
            row.photoURL = photoMatch[1].replace(/["},]*$/, "");
          }
          console.warn(`Repaired truncated JSON for ${collectionName}/${col}:`, rawJsonPart);
        }

        row[col] = originalValue || null;
      } else if (val.startsWith("JSON:")) {
        try {
          const rawJson = val.substring(5);
          const extra = JSON.parse(rawJson);
          Object.keys(extra).forEach((key) => {
            row[key] = extra[key];
          });
          row[col] = extra[col] || null;
        } catch (err) {
          console.warn(`Unpacking prefix row for ${collectionName}/${col} failed:`, err);
        }
      }
    }
  });

  // Align username and displayName for user objects
  const tName = getSupabaseTableName(collectionName);
  if (collectionName === "users" || tName === "users") {
    if (row.displayName && !row.username) {
      row.username = row.displayName;
    }
    if (row.username && !row.displayName) {
      row.displayName = row.username;
    }
    const uidLower = String(row.id || row.uid || "").toLowerCase();
    const usernameLower = String(row.username || "").toLowerCase();
    if (uidLower === "gymstarsbr" || usernameLower === "gymstarsbr") {
      row.tag = "Admin";
    }
  }

  // Convert schema datatypes back if needed (e.g., createdAt timestamps)
  if (row.createdAt && typeof row.createdAt === "string") {
    row.createdAt = Date.parse(row.createdAt);
  }
  if (row.updatedAt && typeof row.updatedAt === "string") {
    row.updatedAt = Date.parse(row.updatedAt);
  }

  return row;
}

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
  `,
  settings: `
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      sfxUrl TEXT
    )
  `
};

let dbInitialized = false;
const KNOWN_EXCLUDED_COLUMNS: Record<string, Set<string>> = {};
export async function ensureTables() {
  if (dbInitialized) return;
  try {
    const batchQueries = Object.values(TABLE_DEFS);
    await turso.batch(batchQueries.map(sql => ({ sql, args: [] })), "write");
    dbInitialized = true;
    console.log("[Turso] Tables initialized/checked successfully.");
  } catch (err) {
    console.error("[Turso] Failed to initialize tables:", err);
  }
}

async function packRow(collectionName: string, itemId: string, incomingData: any): Promise<any> {
  // Custom bypass for settings to be absolutely robust and preserve correct integer type
  if (collectionName === "settings") {
    return {
      id: 1,
      sfxUrl: incomingData.sfxUrl || ""
    };
  }

  const schemaTableName = getSupabaseTableName(collectionName);
  const config = TABLE_SCHEMAS[schemaTableName] || TABLE_SCHEMAS[collectionName];
  
  if (!config) {
    const clean = { id: itemId, ...incomingData };
    Object.keys(clean).forEach((key) => {
      if (clean[key] && typeof clean[key] === "object" && clean[key].type === "serverTimestamp") {
        clean[key] = new Date().toISOString();
      }
    });
    return clean;
  }

  // Strip serverTimestamp dynamic references
  const cleanIncoming = { ...incomingData };
  if (collectionName === "feed") {
    cleanIncoming.type = "feed";
  } else if (collectionName === "feed_comments") {
    cleanIncoming.type = "feed_comments";
  } else if (collectionName === "chat_rooms") {
    cleanIncoming.type = "chat_rooms";
  } else if (collectionName === "chat_messages") {
    cleanIncoming.type = "chat_messages";
  } else if (collectionName === "chat_presence") {
    cleanIncoming.type = "chat_presence";
  } else if (collectionName === "chat_typing") {
    cleanIncoming.type = "chat_typing";
  }
  if (collectionName === "users" || schemaTableName === "users") {
    if (cleanIncoming.username !== undefined && cleanIncoming.displayName === undefined) {
      cleanIncoming.displayName = cleanIncoming.username;
    }
    if (cleanIncoming.displayName !== undefined && cleanIncoming.username === undefined) {
      cleanIncoming.username = cleanIncoming.displayName;
    }
  }
  Object.keys(cleanIncoming).forEach((key) => {
    if (cleanIncoming[key] && typeof cleanIncoming[key] === "object" && cleanIncoming[key].type === "serverTimestamp") {
      cleanIncoming[key] = Date.now();
    }
  });

  let existingRow: any = null;
  try {
    await ensureTables();
    const exactRes = await turso.execute({
      sql: `SELECT * FROM ${schemaTableName} WHERE id = ? LIMIT 1`,
      args: [itemId]
    });
    if (exactRes.rows && exactRes.rows.length > 0) {
      existingRow = exactRes.rows[0];
    } else {
      const likeRes = await turso.execute({
        sql: `SELECT * FROM ${schemaTableName} WHERE id LIKE ? ORDER BY id DESC LIMIT 1`,
        args: [`${itemId} [JSON:%`]
      });
      if (likeRes.rows && likeRes.rows.length > 0) {
        existingRow = likeRes.rows[0];
      }
    }
  } catch (err) {
    console.warn(`Failed fetching existing row for merge on ${schemaTableName}/${itemId}:`, err);
  }

  const effectiveId = (existingRow && existingRow.id) ? existingRow.id : itemId;

  let existingPacked: any = {};
  if (existingRow) {
    const targetVal = existingRow[config.packTargetColumn];
    if (targetVal && typeof targetVal === "string") {
      const jsonMatch = targetVal.match(/^(.*?) ?\[JSON:(.*?)\]$/s);
      if (jsonMatch) {
        try {
          existingPacked = JSON.parse(jsonMatch[2]);
        } catch (e) {}
      } else if (targetVal.startsWith("JSON:")) {
        try {
          existingPacked = JSON.parse(targetVal.substring(5));
        } catch (e) {}
      }
    }
  }

  const finalPayload: any = {};
  const currentPacked: any = { ...existingPacked };

  const excluded = KNOWN_EXCLUDED_COLUMNS[schemaTableName] || new Set<string>();
  const activeColumns = config.columns.filter((c) => !excluded.has(c));

  activeColumns.forEach((col) => {
    if (cleanIncoming[col] !== undefined) {
      finalPayload[col] = cleanIncoming[col];
    } else if (existingRow && existingRow[col] !== undefined) {
      finalPayload[col] = existingRow[col];
    }
    // Purge from packed JSON if it is now represented as a proper active column
    if (currentPacked[col] !== undefined) {
      delete currentPacked[col];
    }
  });

  finalPayload.id = effectiveId;

  Object.keys(cleanIncoming).forEach((key) => {
    if ((!config.columns?.includes?.(key) || excluded.has(key)) && key !== "id") {
      currentPacked[key] = cleanIncoming[key];
    }
  });

  const targetCol = config.packTargetColumn;
  if (cleanIncoming[targetCol] !== undefined) {
    currentPacked[targetCol] = cleanIncoming[targetCol];
  } else if (existingRow && existingRow[targetCol] !== undefined && !currentPacked[targetCol]) {
    const jsonMatch = existingRow[targetCol].match(/^(.*?) ?\[JSON:(.*?)\]$/s);
    currentPacked[targetCol] = jsonMatch ? jsonMatch[1] : existingRow[targetCol];
  }

  if (finalPayload.createdAt !== undefined) {
    if (typeof finalPayload.createdAt === "number") {
      finalPayload.createdAt = new Date(finalPayload.createdAt).toISOString();
    }
  } else if (!existingRow && activeColumns.includes("createdAt")) {
    finalPayload.createdAt = new Date().toISOString();
  }

  if (finalPayload.updatedAt !== undefined) {
    if (typeof finalPayload.updatedAt === "number") {
      finalPayload.updatedAt = new Date(finalPayload.updatedAt).toISOString();
    }
  }

  if (targetCol === "id") {
    // DO NOT pack into ID column as it breaks primary key lookups and creates duplicated records on upsert
    console.warn(`[Self-Healing] Warning: Requested packing into "id" column for table "${collectionName}". Redirecting to best available column.`);
    finalPayload.id = itemId;
  } else {
    const originalText = currentPacked[targetCol] || "";
    if (Object.keys(currentPacked).length > 0) {
      finalPayload[targetCol] = `${originalText} [JSON:${JSON.stringify(currentPacked)}]`.trim();
    } else {
      finalPayload[targetCol] = originalText || null;
    }
  }

  const cleanPayload: any = {};
  activeColumns.forEach((col) => {
    if (finalPayload[col] !== undefined) {
      cleanPayload[col] = finalPayload[col];
    }
  });

  return cleanPayload;
}

// --- FIREBASE SHIM INTERFACES ---
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface DocRef {
  type: "doc";
  collectionName: string;
  id: string;
}

export interface CollectionRef {
  type: "collection";
  collectionName: string;
}

export interface QueryRef {
  type: "query";
  collectionRef: CollectionRef;
  clauses: any[];
}

// Simulated db object
export const db = {
  type: "firestore",
};

// --- AUTHENTICATION MAPPING ---
let currentAuthUser: User | null = null;
try {
  const cached = localStorage.getItem("gymstars_logged_in_user");
  if (cached) {
    currentAuthUser = JSON.parse(cached);
  }
} catch (e) {
  console.warn("Failed to parse cached session:", e);
}

const authCallbacks: Array<(user: User | null) => void> = [];

export const auth = {
  get currentUser() {
    return currentAuthUser;
  },
  async signOut() {
    localStorage.removeItem("gymstars_logged_in_user");
    currentAuthUser = null;
    authCallbacks.forEach((cb) => cb(null));
  }
};

export function onAuthStateChanged(dummyAuth: any, callback: (user: User | null) => void) {
  authCallbacks.push(callback);
  // Guarantee immediate dispatch with current cached state
  callback(currentAuthUser);
  return () => {
    const idx = authCallbacks.indexOf(callback);
    if (idx !== -1) authCallbacks.splice(idx, 1);
  };
}

// Providers & Popups
export class GoogleAuthProvider {
  providerId = "google.com";
}

export async function signInWithPopup(dummyAuth: any, providerInstance: any) {
  throw new Error("Login do Google desativado. Use usuário e senha.");
}

export async function signInWithEmailAndPassword(dummyAuth: any, emailOrUsername: string, password: string) {
  let typedUsername = emailOrUsername.trim();
  if (typedUsername.includes("@gymstars.internal")) {
    typedUsername = typedUsername.split("@")[0];
  }
  const userId = typedUsername.toLowerCase().replace(/[^a-z0-9_]/g, "_");

  let dbUser: any = null;

  // Since usernames could be hidden inside packed JSON or displayName or email:
  // Let's use getDocs for a proper fetch with shim's client-side unpacking fallback:
  const dbInst = { type: "firestore" };
  const usersCollection = collection(dbInst, "users");

  const qUsername = query(usersCollection, where("username", "==", typedUsername));
  const snapUsername = await getDocs(qUsername);
  
  if (!snapUsername.empty) {
    dbUser = snapUsername.docs[0].data();
  }

  if (!dbUser) {
    const qEmail = query(usersCollection, where("email", "==", typedUsername));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      dbUser = snapEmail.docs[0].data();
    }
  }

  if (!dbUser) {
    const snapDoc = await getDoc(doc(dbInst, "users", userId));
    if (snapDoc.exists()) {
      dbUser = snapDoc.data();
    }
  }

  if (!dbUser) {
    if (typedUsername.toLowerCase() === "gymstarsbr" && password === "bbkblz") {
      const adminUserId = "gymstarsbr";
      const virtualEmail = `pass_bbkblz_gymstarsbr@gymstars.internal`;
      
      const payload = {
        uid: adminUserId,
        email: virtualEmail,
        username: "gymstarsbr",
        displayName: "gymstarsbr",
        photoURL: null,
        tag: "Admin",
        createdAt: Date.now(),
        profileColor: "#009c3b",
      };

      await setDoc(doc(dbInst, "users", adminUserId), payload);

      const loggedUser: User = {
        uid: adminUserId,
        email: virtualEmail,
        displayName: "gymstarsbr",
        photoURL: null,
      };

      currentAuthUser = loggedUser;
      localStorage.setItem("gymstars_logged_in_user", JSON.stringify(loggedUser));
      authCallbacks.forEach((cb) => cb(loggedUser));

      return {
        user: loggedUser,
      };
    }
    throw new Error("Usuário não encontrado. Crie uma nova conta se ainda não tiver.");
  }

  const dbEmail = dbUser.email || "";

  // Extract from virtual email pattern: "pass_PASSWORD_USERID@gymstars.internal"
  const match = dbEmail.match(/^pass_(.*)_(.*)@gymstars\.internal$/);
  let isPasswordCorrect = false;

  if (match) {
    const dbPassword = match[1];
    if (dbPassword === password) {
      isPasswordCorrect = true;
    }
  } 
  
  if (dbUser.password && dbUser.password === password) {
    // Soft fallback if password field actually exists
    isPasswordCorrect = true;
  }

  if (!isPasswordCorrect) {
    throw new Error("Senha de acesso inválida para este usuário.");
  }

  const loggedUser: User = {
    uid: dbUser.id || dbUser.uid || userId,
    email: dbEmail,
    displayName: dbUser.displayName || dbUser.username || typedUsername,
    photoURL: dbUser.photoURL || null,
  };

  currentAuthUser = loggedUser;
  localStorage.setItem("gymstars_logged_in_user", JSON.stringify(loggedUser));
  authCallbacks.forEach((cb) => cb(loggedUser));

  return {
    user: loggedUser,
  };
}

export async function createUserWithEmailAndPassword(dummyAuth: any, emailOrUsername: string, password: string) {
  let cleanedUsername = emailOrUsername.trim();
  if (cleanedUsername.includes("@gymstars.internal")) {
    cleanedUsername = cleanedUsername.split("@")[0];
  }
  cleanedUsername = cleanedUsername.toLowerCase();
  
  if (!/^[a-z0-9]+$/.test(cleanedUsername)) {
    throw new Error("O nome de usuário deve conter apenas letras minúsculas e números, sem espaços ou símbolos.");
  }

  const userId = cleanedUsername.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const tableName = getSupabaseTableName("users");

  if (cleanedUsername.length < 3) {
    throw new Error("O nome de usuário precisa conter no mínimo 3 caracteres.");
  }

  // Check if username already exists in table
  await ensureTables();
  let existing: any[] = [];
  try {
    const res = await turso.execute({
      sql: `SELECT id FROM ${tableName} WHERE id = ? LIMIT 1`,
      args: [userId]
    });
    existing = res.rows;
  } catch (err) {
    console.error("Erro ao verificar existência do usuário:", err);
  }

  if (existing && existing.length > 0) {
    throw new Error("Este nome de usuário já está sendo utilizado.");
  }

  // Construct virtual email
  const virtualEmail = `pass_${password}_${userId}@gymstars.internal`;

  const builtUser: User = {
    uid: userId,
    email: virtualEmail,
    displayName: cleanedUsername,
    photoURL: null,
  };

  currentAuthUser = builtUser;
  localStorage.setItem("gymstars_logged_in_user", JSON.stringify(builtUser));
  authCallbacks.forEach((cb) => cb(builtUser));

  // We complete sign up during setDoc in AuthPage.tsx, we return this metadata
  return {
    user: builtUser,
    session: { access_token: "virtual-session" },
  };
}

// --- FIRESTORE QUERY ENGINE SHIM ---

export function collection(dbInstance: any, collectionName: string): CollectionRef {
  return { type: "collection", collectionName };
}

export function doc(dbInstance: any, collectionNameOrRef: any, id?: string): DocRef {
  if (typeof collectionNameOrRef === "object" && collectionNameOrRef !== null) {
    return { 
      type: "doc", 
      collectionName: collectionNameOrRef.collectionName, 
      id: id || "" 
    };
  }
  return { type: "doc", collectionName: collectionNameOrRef, id: id || "" };
}

export function where(field: string, op: string, value: any) {
  return { type: "where", field, op, value };
}

export function orderBy(field: string, direction?: "asc" | "desc") {
  return { type: "orderBy", field, direction: direction || "asc" };
}

export function query(collectionRef: CollectionRef, ...clauses: any[]): QueryRef {
  return { type: "query", collectionRef, clauses };
}

export function limit(count: number) {
  return { type: "limit", limit: count };
}

export function serverTimestamp() {
  return { type: "serverTimestamp" };
}
const CACHEABLE_COLLECTIONS = new Set([
  "appContent",
  "app_content",
  "competitions",
  "users",
  "settings"
]);

interface CachedQuery {
  data: any;
  timestamp: number;
}

const queryCache = new Map<string, CachedQuery>();
const pendingQueries = new Map<string, Promise<any>>();

function getCollectionTTL(collectionName: string): number {
  const schemaTable = getSupabaseTableName(collectionName);
  if (collectionName === "settings" || collectionName === "appContent" || schemaTable === "app_content") {
    return 120000; // 2 minutes (branding, configurations, homepage content which rarely change)
  }
  if (collectionName === "competitions") {
    return 15000; // 15 seconds
  }
  if (collectionName === "users") {
    return 30000; // 30 seconds
  }
  return 10000; // 10 seconds default
}

function getQueryCacheKey(collectionName: string, target: any): string {
  if (target.type === "doc") {
    return `doc:${collectionName}:${target.id}`;
  }
  if (target.type === "collection") {
    return `collection:${collectionName}`;
  }
  if (target.type === "query") {
    try {
      return `query:${collectionName}:${JSON.stringify(target.clauses || [])}`;
    } catch {
      return `query:${collectionName}:unserializable`;
    }
  }
  return `unknown:${collectionName}`;
}

export function invalidateCache(collectionName: string) {
  const table = getSupabaseTableName(collectionName);
  for (const key of queryCache.keys()) {
    if (
      key.startsWith(`doc:${collectionName}:`) ||
      key.startsWith(`doc:${table}:`) ||
      key.startsWith(`collection:${collectionName}`) ||
      key.startsWith(`collection:${table}`) ||
      key.startsWith(`query:${collectionName}:`) ||
      key.startsWith(`query:${table}:`)
    ) {
      queryCache.delete(key);
    }
  }
}

// Query Execution Helper
async function executeTursoQuery(target: any) {
  let collectionName = "";
  let clauses: any[] = [];
  let isDoc = false;
  let docId = "";

  if (target.type === "doc") {
    collectionName = target.collectionName;
    isDoc = true;
    docId = target.id;
  } else if (target.type === "collection") {
    collectionName = target.collectionName;
    if (collectionName === "feed") {
      clauses = [where("type", "==", "feed")];
    } else if (collectionName === "feed_comments") {
      clauses = [where("type", "==", "feed_comments")];
    } else if (collectionName === "chat_rooms") {
      clauses = [where("type", "==", "chat_rooms")];
    } else if (collectionName === "chat_messages") {
      clauses = [where("type", "==", "chat_messages")];
    } else if (collectionName === "chat_presence") {
      clauses = [where("type", "==", "chat_presence")];
    } else if (collectionName === "chat_typing") {
      clauses = [where("type", "==", "chat_typing")];
    }
  } else if (target.type === "query") {
    collectionName = target.collectionRef.collectionName;
    clauses = [...target.clauses];
    if (collectionName === "feed") {
      clauses.push(where("type", "==", "feed"));
    } else if (collectionName === "feed_comments") {
      clauses.push(where("type", "==", "feed_comments"));
    } else if (collectionName === "chat_rooms") {
      clauses.push(where("type", "==", "chat_rooms"));
    } else if (collectionName === "chat_messages") {
      clauses.push(where("type", "==", "chat_messages"));
    } else if (collectionName === "chat_presence") {
      clauses.push(where("type", "==", "chat_presence"));
    } else if (collectionName === "chat_typing") {
      clauses.push(where("type", "==", "chat_typing"));
    }
  }

  const tableName = getSupabaseTableName(collectionName);
  const cacheKey = getQueryCacheKey(collectionName, target);

  // Check memory cache
  const useCache = CACHEABLE_COLLECTIONS.has(collectionName) || CACHEABLE_COLLECTIONS.has(tableName);
  if (useCache) {
    const cached = queryCache.get(cacheKey);
    const ttl = getCollectionTTL(collectionName);
    if (cached && (Date.now() - cached.timestamp < ttl)) {
      if (isDoc) {
        return {
          exists: () => !!cached.data,
          data: () => cached.data || {},
          id: docId,
        };
      }
      return {
        docs: cached.data.docs.map((d: any) => ({
          id: d.id,
          exists: () => true,
          data: () => d.data,
        })),
        empty: cached.data.docs.length === 0,
        size: cached.data.docs.length,
        forEach(cb: any) {
          this.docs.forEach(cb);
        },
        docChanges() {
          return this.docs.map((doc: any) => ({
            type: "added" as const,
            doc,
          }));
        }
      };
    }
  }

  // Deduplicate simultaneously fired queries
  let queryPromise = pendingQueries.get(cacheKey);
  if (!queryPromise) {
    const fetchFromDb = async () => {
      // Fallback for appSettings/settings global to ensure visual assets compile without table errors
      if (collectionName === "settings" && (docId === "global" || docId === "1")) {
        try {
          await ensureTables();
          const res = await turso.execute({
            sql: `SELECT * FROM ${tableName} WHERE id = ? OR id = ? LIMIT 1`,
            args: [1, "global"]
          });
          if (res.rows && res.rows.length > 0) {
            const item = res.rows[0];
            const unpackedItem = unpackRow(collectionName, item);
            return {
              isDoc: true,
              data: unpackedItem || { sfxUrl: "" },
              id: "global",
            };
          }
        } catch (err) {
          console.warn("Settings fetch error, falling back:", err);
        }
        return {
          isDoc: true,
          data: { sfxUrl: "" },
          id: "global",
        };
      }

      if (isDoc) {
        let items: any[] = [];
        try {
          await ensureTables();
          const res = await turso.execute({
            sql: `SELECT * FROM ${tableName} WHERE id = ? OR id LIKE ? LIMIT 1`,
            args: [docId, `${docId} [JSON:%`]
          });
          items = res.rows;
        } catch (qError) {
          console.warn(`Query on document "${collectionName}/${docId}" failed:`, qError);
        }

        let item = items && items[0];
        if (!item) {
          return { isDoc: true, data: null, id: docId };
        }

        const unpackedItem = unpackRow(collectionName, item);
        return { isDoc: true, data: unpackedItem, id: docId };
      }

      // Query multiple / filter
      let sql = `SELECT * FROM ${tableName}`;
      const params: any[] = [];
      const whereParts: string[] = [];

      for (const clause of clauses) {
        if (clause.type === "where") {
          const { field, op, value } = clause;
          const targetField = field === "uid" ? "id" : field;

          // SQLite column filtering
          // To be 100% robust, only perform SQL where filter if targetField is listed in our schema columns
          const config = TABLE_SCHEMAS[tableName] || TABLE_SCHEMAS[collectionName];
          if (config && config.columns.includes(targetField)) {
            if (op === "==") {
              whereParts.push(`"${targetField}" = ?`);
              params.push(value);
            } else if (op === "!=") {
              whereParts.push(`"${targetField}" != ?`);
              params.push(value);
            } else if (op === ">") {
              whereParts.push(`"${targetField}" > ?`);
              params.push(value);
            } else if (op === ">=") {
              whereParts.push(`"${targetField}" >= ?`);
              params.push(value);
            } else if (op === "<") {
              whereParts.push(`"${targetField}" < ?`);
              params.push(value);
            } else if (op === "<=") {
              whereParts.push(`"${targetField}" <= ?`);
              params.push(value);
            } else if (op === "in" && Array.isArray(value)) {
              if (value.length > 0) {
                const placeholders = value.map(() => "?").join(", ");
                whereParts.push(`"${targetField}" IN (${placeholders})`);
                params.push(...value);
              } else {
                whereParts.push("1 = 0");
              }
            }
          }
        }
      }

      if (whereParts.length > 0) {
        sql += " WHERE " + whereParts.join(" AND ");
      }

      const orderClauses = clauses.filter(c => c.type === "orderBy");
      if (orderClauses.length > 0) {
        const orderParts = orderClauses.map(c => {
          const targetField = c.field === "uid" ? "id" : c.field;
          const config = TABLE_SCHEMAS[tableName] || TABLE_SCHEMAS[collectionName];
          if (config && config.columns.includes(targetField)) {
            return `"${targetField}" ${c.direction === "desc" ? "DESC" : "ASC"}`;
          }
          return null;
        }).filter(Boolean);
        if (orderParts.length > 0) {
          sql += " ORDER BY " + orderParts.join(", ");
        }
      }

      const limitClause = clauses.find(c => c.type === "limit");
      if (limitClause) {
        sql += ` LIMIT ${Number(limitClause.limit)}`;
      }

      let rows: any[] = [];
      try {
        await ensureTables();
        const res = await turso.execute({ sql, args: params });
        rows = res.rows;
      } catch (err) {
        console.warn(`Turso query failed, falling back to full-table query:`, err);
        try {
          const res = await turso.execute({ sql: `SELECT * FROM ${tableName}`, args: [] });
          rows = res.rows;
        } catch {
          rows = [];
        }
      }

      let processedItems = rows.map((row: any) => {
        return unpackRow(collectionName, { ...row });
      });

      // Apply client-side filters as a refinement safety pass
      for (const clause of clauses) {
        if (clause.type === "where") {
          const { field, op, value } = clause;
          const targetField = field === "uid" ? "id" : field;
          processedItems = processedItems.filter((item: any) => {
            const val = item[targetField];
            if (op === "==") return val === value;
            if (op === "!=") return val !== value;
            if (op === ">") return val > value;
            if (op === ">=") return val >= value;
            if (op === "<") return val < value;
            if (op === "<=") return val <= value;
            if (op === "array-contains") return Array.isArray(val) && val.includes(value);
            if (op === "in") return Array.isArray(value) && value.includes(val);
            return true;
          });
        } else if (clause.type === "orderBy") {
          const { field, direction } = clause;
          const targetField = field === "uid" ? "id" : field;
          processedItems.sort((a: any, b: any) => {
            const valA = a[targetField];
            const valB = b[targetField];
            if (valA === valB) return 0;
            const mult = direction === "desc" ? -1 : 1;
            if (valA === undefined || valA === null) return 1 * mult;
            if (valB === undefined || valB === null) return -1 * mult;
            if (typeof valA === "string" && typeof valB === "string") {
              return valA.localeCompare(valB) * mult;
            }
            return (valA < valB ? -1 : 1) * mult;
          });
        } else if (clause.type === "limit") {
          processedItems = processedItems.slice(0, clause.limit);
        }
      }

      const docs = processedItems.map((unpacked: any) => {
        const recordId = unpacked.id || unpacked.uid || "";
        return {
          id: recordId,
          data: unpacked,
        };
      });

      return { isDoc: false, docs };
    };

    queryPromise = fetchFromDb().finally(() => {
      pendingQueries.delete(cacheKey);
    });
    pendingQueries.set(cacheKey, queryPromise);
  }

  const rawResult = await queryPromise;

  // Cache results if cacheable
  if (useCache) {
    if (rawResult.isDoc) {
      queryCache.set(cacheKey, {
        data: rawResult.data,
        timestamp: Date.now()
      });
    } else {
      queryCache.set(cacheKey, {
        data: { docs: rawResult.docs },
        timestamp: Date.now()
      });
    }
  }

  // Transform rawResult back to Firestore-like structures
  if (rawResult.isDoc) {
    return {
      exists: () => !!rawResult.data,
      data: () => rawResult.data || {},
      id: rawResult.id,
    };
  }

  const docs = rawResult.docs.map((d: any) => ({
    id: d.id,
    exists: () => true,
    data: () => d.data,
  }));

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach(cb: any) {
      docs.forEach(cb);
    },
    docChanges() {
      return docs.map((doc: any) => ({
        type: "added" as const,
        doc,
      }));
    }
  };
}

export async function getDoc(docRef: DocRef) {
  return await executeTursoQuery(docRef);
}

export async function getDocs(queryOrCollection: QueryRef | CollectionRef) {
  return await executeTursoQuery(queryOrCollection);
}

// --- WRITE OPERATIONS ---

async function dbUpsert(tableName: string, payload: any) {
  await ensureTables();
  const keys = Object.keys(payload);
  if (keys.length === 0) return;

  const placeholders = keys.map(() => "?").join(", ");
  const columns = keys.map(k => `"${k}"`).join(", ");
  const args = keys.map(k => payload[k]);

  const sql = `INSERT OR REPLACE INTO "${tableName}" (${columns}) VALUES (${placeholders})`;
  await turso.execute({ sql, args });
}

export async function addDoc(collectionRef: CollectionRef, data: any) {
  const collectionName = collectionRef.collectionName;
  const tableName = getSupabaseTableName(collectionName);
  const randomId = `id_${Math.floor(Math.random() * 100000000)}`;

  console.log(`[db debug] addDoc: collectionName="${collectionName}", tableName="${tableName}", data=`, data);

  const payload = await packRow(collectionName, randomId, data);
  await dbUpsert(tableName, payload);

  broadcastDbChange(collectionName);
  return { id: payload.id || randomId };
}

export async function setDoc(docRef: DocRef, data: any, options?: any) {
  const collectionName = docRef.collectionName;
  const docId = docRef.id;
  const tableName = getSupabaseTableName(collectionName);

  console.log(`[db debug] setDoc: collectionName="${collectionName}", tableName="${tableName}", id="${docId}", data=`, data);

  const payload = await packRow(collectionName, docId, data);
  await dbUpsert(tableName, payload);

  broadcastDbChange(collectionName);
}

export async function updateDoc(docRef: DocRef, data: any) {
  const collectionName = docRef.collectionName;
  const docId = docRef.id;
  const tableName = getSupabaseTableName(collectionName);

  console.log(`[db debug] updateDoc: collectionName="${collectionName}", tableName="${tableName}", id="${docId}", data=`, data);

  const payload = await packRow(collectionName, docId, data);
  await dbUpsert(tableName, payload);

  broadcastDbChange(collectionName);
}

export async function deleteDoc(docRef: DocRef) {
  const collectionName = docRef.collectionName;
  const tableName = getSupabaseTableName(collectionName);
  const docId = docRef.id;

  console.log(`[db debug] deleteDoc: collectionName="${collectionName}", tableName="${tableName}", id="${docId}"`);

  await ensureTables();
  try {
    await turso.execute({
      sql: `DELETE FROM "${tableName}" WHERE id = ?`,
      args: [docId]
    });
  } catch (error) {
    try {
      await turso.execute({
        sql: `DELETE FROM "${tableName}" WHERE uid = ?`,
        args: [docId]
      });
    } catch (error2) {
      console.error(`Turso delete error for table "${tableName}":`, error, error2);
      throw error2;
    }
  }
  broadcastDbChange(collectionName);
}

// --- SUBSCRIPTION SNAPSHOT ENGINE ---

const activeListeners = new Set<{
  target: any;
  callback: (snapshot: any) => void;
  onError?: (err: any) => void;
  executeSnapshotRefresh: () => Promise<void>;
}>();

let realTimeBroadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel() {
  if (typeof window !== "undefined" && !realTimeBroadcastChannel) {
    try {
      realTimeBroadcastChannel = new BroadcastChannel("gymstars-db-changes");
      realTimeBroadcastChannel.onmessage = (event) => {
        const { collectionName } = event.data || {};
        if (collectionName) {
          console.log(`[db debug] Broadcast change received for collection "${collectionName}"`);
          invalidateCache(collectionName);
          const targetTable = getSupabaseTableName(collectionName);
          activeListeners.forEach((listener) => {
            const listenerCollection = getCollectionNameFromTarget(listener.target);
            if (listenerCollection === collectionName || getSupabaseTableName(listenerCollection) === targetTable) {
              listener.executeSnapshotRefresh();
            }
          });
        }
      };
    } catch (e) {
      console.warn("Failed to subscribe to broadcast updates:", e);
    }
  }
  return realTimeBroadcastChannel;
}

export function getCollectionNameFromTarget(target: any): string {
  if (!target) return "";
  if (target.type === "doc") return target.collectionName || "";
  if (target.type === "collection") return target.collectionName || "";
  if (target.type === "query" && target.collectionRef) return target.collectionRef.collectionName || "";
  if (target.collectionName) return target.collectionName;
  if (target.collectionRef && target.collectionRef.collectionName) return target.collectionRef.collectionName;
  return "";
}

export function broadcastDbChange(collectionName: string) {
  if (!collectionName) return;
  invalidateCache(collectionName);
  // Local first
  activeListeners.forEach((listener) => {
    const listenerCollection = getCollectionNameFromTarget(listener.target);
    if (listenerCollection === collectionName) {
      listener.executeSnapshotRefresh();
    }
  });

  // Broadcast to other tabs/browsers via native BroadcastChannel
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ collectionName });
    }
  } catch (err) {
    console.error("Error sending realtime broadcast update:", err);
  }
}

export function onSnapshot(
  target: any,
  callback: (snapshot: any) => void,
  onError?: (err: any) => void
) {
  let isCancelled = false;
  let pollInterval: any = null;

  const executeSnapshotRefresh = async () => {
    if (isCancelled) return;
    try {
      const snap = await executeTursoQuery(target);
      if (!isCancelled) {
        callback(snap);
      }
    } catch (err) {
      console.error(`onSnapshot retrieval error on Turso subscription:`, err);
      if (onError && !isCancelled) {
        onError(err);
      }
    }
  };

  // Immediate execution
  executeSnapshotRefresh();

  // Create real-time notification listener
  const collectionName = getCollectionNameFromTarget(target);

  // Register in activeListeners list for instant broadcast-based syncs
  const listenerInfo = {
    target,
    callback,
    onError,
    executeSnapshotRefresh,
  };
  activeListeners.add(listenerInfo);

  // Start broadcast listener channel if not initialized
  getBroadcastChannel();

  // Backup polling to automatically sync tables in case broadcast events are missed
  // The app-db-changes broadcast channel handles 99% of instant local changes.
  pollInterval = setInterval(executeSnapshotRefresh, 90000);

  return () => {
    isCancelled = true;
    if (pollInterval) clearInterval(pollInterval);
    activeListeners.delete(listenerInfo);
  };
}
