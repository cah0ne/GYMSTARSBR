import { useEffect, useState } from "react";
import { db, collection, query, where, onSnapshot } from "../lib/firebase";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Trophy, ArrowLeft } from "lucide-react";

export default function RankingPage() {
  const [gymnasts, setGymnasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), where("tag", "==", "Ginasta"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const u = d.data();
        const m = u.medals || { gold: 0, silver: 0, bronze: 0 };
        const total = (m.gold || 0) + (m.silver || 0) + (m.bronze || 0);
        return {
          id: d.id,
          ...u,
          totalMedals: total,
          mGold: m.gold || 0,
          mSilver: m.silver || 0,
          mBronze: m.bronze || 0,
        };
      });

      const sorted = data
        .filter((g) => g.totalMedals > 0)
        .sort(
          (a, b) =>
            (b.mGold || 0) - (a.mGold || 0) ||
            (b.mSilver || 0) - (a.mSilver || 0) ||
            (b.mBronze || 0) - (a.mBronze || 0) ||
            b.totalMedals - a.totalMedals,
        );

      let currentRank = 1;
      let prevProfile = "";
      const ranked = sorted.map((g, index) => {
        const curProfile = `${g.mGold || 0}-${g.mSilver || 0}-${g.mBronze || 0}-${g.totalMedals}`;
        if (curProfile !== prevProfile) {
          currentRank = index + 1;
          prevProfile = curProfile;
        }
        return { ...g, rank: currentRank };
      });

      setGymnasts(ranked);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
            Estrelas
          </h1>
          <p className="text-xs text-yellow-500/80 font-bold uppercase tracking-[0.2em] mt-1">
            Ranking Completo de Medalhas
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 font-mono text-sm uppercase tracking-widest">
          Carregando ranking...
        </div>
      ) : gymnasts.length === 0 ? (
        <div className="text-center p-12 bg-slate-900/50 border border-slate-800 rounded-3xl">
          <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nenhuma Estrela</h3>
          <p className="text-slate-500 text-sm">
            As medalhas ainda não foram distribuídas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {gymnasts.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/gymnasts/${g.id}`}
                className={`flex sm:items-center flex-col sm:flex-row gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${
                  g.rank === 1
                    ? "bg-gradient-to-br from-yellow-500/10 via-slate-900 to-slate-900 border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.05)] hover:border-yellow-400/60"
                    : g.rank === 2
                      ? "bg-slate-900 border-slate-600/30 hover:border-slate-500/50"
                      : g.rank === 3
                        ? "bg-orange-950/20 border-orange-900/30 hover:border-orange-800/50"
                        : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700"
                } group`}
              >
                <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                  <div className="w-12 text-center shrink-0">
                    <span
                      className={`text-4xl font-black italic tracking-tighter ${
                        g.rank === 1
                          ? "text-yellow-500 drop-shadow-md"
                          : g.rank === 2
                            ? "text-slate-300"
                            : g.rank === 3
                              ? "text-orange-500"
                              : "text-slate-600"
                      }`}
                    >
                      {g.rank}
                    </span>
                  </div>

                  <div
                    className={`shrink-0 rounded-full border-2 ${
                      g.rank === 1
                        ? "border-yellow-500"
                        : g.rank === 2
                          ? "border-slate-300"
                          : g.rank === 3
                            ? "border-orange-500"
                            : "border-slate-700"
                    } w-16 h-16 overflow-hidden bg-slate-950 shadow-md flex items-center justify-center`}
                  >
                    {g.photoURL ? (
                      <img
                        src={g.photoURL || undefined}
                        alt={g.competitionName || g.competitionname || g.displayName || g.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-black text-2xl italic text-slate-500">
                        {(
                          g.competitionName ||
                          g.competitionname ||
                          g.displayName ||
                          g.username ||
                          "?"
                        ).substring(0, 1)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3
                      className={`text-lg sm:text-xl font-black truncate leading-tight ${g.rank === 1 ? "text-yellow-400" : "text-white"}`}
                    >
                      {g.competitionName || g.competitionname || g.displayName || g.username}
                    </h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest truncate mt-1">
                      {g.team || "Independente"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:w-auto shrink-0 pl-[72px] sm:pl-0">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">
                      Totais
                    </p>
                    <p className="text-2xl font-black text-white leading-none">
                      {g.totalMedals}
                    </p>
                  </div>

                  <div className="flex gap-3 bg-slate-950/50 p-2 sm:p-3 rounded-xl border border-white/5">
                    <div className="text-center font-mono flex flex-col items-center gap-1">
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-500 w-5 h-5 rounded-full flex items-center justify-center">
                        🥇
                      </span>
                      <span className="text-sm font-bold text-slate-300">
                        {g.mGold}
                      </span>
                    </div>
                    <div className="text-center font-mono flex flex-col items-center gap-1">
                      <span className="text-[10px] bg-slate-400/20 text-slate-300 w-5 h-5 rounded-full flex items-center justify-center">
                        🥈
                      </span>
                      <span className="text-sm font-bold text-slate-300">
                        {g.mSilver}
                      </span>
                    </div>
                    <div className="text-center font-mono flex flex-col items-center gap-1">
                      <span className="text-[10px] bg-orange-500/20 text-orange-500 w-5 h-5 rounded-full flex items-center justify-center">
                        🥉
                      </span>
                      <span className="text-sm font-bold text-slate-300">
                        {g.mBronze}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
