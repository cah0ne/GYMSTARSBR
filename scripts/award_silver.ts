import { createClient } from "@libsql/client";

const c = createClient({url: process.env.VITE_TURSO_URL!, authToken: process.env.VITE_TURSO_AUTH_TOKEN!});

async function run() {
  const compId = "id_19233402";
  const compName = "PANAMERICANO DE GINÁSTICA ARTÍSTICA 2026 (QF - TF)";
  const res = await c.execute(`SELECT * FROM users WHERE displayName LIKE '%"team":"CAN"%'`);
  
  for (const r of res.rows) {
      let displayName = String(r.displayName || "");
      if(displayName.includes("sunisa") || displayName.includes("yui") || displayName.includes("fiore")) {
         // do not award
         continue;
      }
      if (displayName.includes("[JSON:")) {
          const idx = displayName.indexOf("[JSON:");
          const pureName = displayName.substring(0, idx).trim();
          let packed = displayName.substring(idx + 6);
          if (packed.endsWith("]")) packed = packed.slice(0, -1);
          let obj = JSON.parse(packed);
          
          if(!obj.badges) obj.badges = [];
          
          const hasSilver = obj.badges.find((b:any) => b.competitionId === compId && b.name.includes("TF Equipes"));
          if (!hasSilver) {
              obj.badges.push({
                   id: Date.now().toString() + Math.random(),
                   name: `🥈 Final TF Equipes - ${compName}`,
                   imageUrl: "",
                   competitionId: compId
              });
              if(!obj.medals) obj.medals = {gold:0, silver:0, bronze:0};
              obj.medals.silver = (obj.medals.silver || 0) + 1;
              
              const newDisp = pureName + " [JSON:" + JSON.stringify(obj) + "]";
              await c.execute({
                 sql: "UPDATE users SET displayName = ? WHERE id = ?",
                 args: [newDisp, r.id]
              });
              console.log("Awarded Silver TF to", pureName);
          }
      }
  }
}
run();
