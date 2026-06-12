import { createClient } from "@libsql/client";
const c = createClient({url: process.env.VITE_TURSO_URL!, authToken: process.env.VITE_TURSO_AUTH_TOKEN!});
async function run() {
  const res = await c.execute("SELECT * FROM scores WHERE competitionId = 'id_19233402'");
  const scores = res.rows.map(r => {
    let team = "IND";
    try {
      team = JSON.parse(String(r.refereeName).split('[JSON:')[1].slice(0, -1)).team;
    } catch(e) {}
    return { team, finalScore: Number(r.finalScore), category: String(r.category) };
  });

  const byTeam: Record<string, any> = {};
  scores.forEach(s => {
    if(s.team && s.team !== 'IND') {
      if(!byTeam[s.team]) byTeam[s.team] = {VT:[], UB:[], BB:[], FX:[]};
      if(byTeam[s.team][s.category]) byTeam[s.team][s.category].push(s.finalScore);
    }
  });

  const totals = Object.keys(byTeam).map(team => {
    let total = 0;
    Object.keys(byTeam[team]).forEach(app => {
      const top3 = byTeam[team][app].sort((a: number, b: number) => b - a).slice(0, 3);
      total += top3.reduce((sum: number, v: number) => sum + v, 0);
    });
    return {team, total};
  });

  console.log(totals.sort((a,b) => b.total - a.total));
}
run();
