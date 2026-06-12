import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db, collection, query, where, onSnapshot } from "../lib/firebase";
import { Search, Medal, UserCircle } from "lucide-react";
import { motion } from "motion/react";

export default function GymnastsPage() {
  const [gymnasts, setGymnasts] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"), where("tag", "==", "Ginasta"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      data.sort((a, b) =>
        (a.competitionName || a.displayName || a.username).localeCompare(
          b.competitionName || b.displayName || b.username,
        ),
      );
      setGymnasts(data);
    });
    return () => unsub();
  }, []);

  const filtered = gymnasts.filter((g) =>
    (g.competitionName || g.displayName || g.username)
      ?.toLowerCase?.()
      ?.includes?.(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            Ginastas
          </h1>
          <p className="text-slate-400 text-sm">
            Atletas cadastrados na plataforma.
          </p>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar ginasta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-[#009c3b]/50 transition-all text-base shadow-inner"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filtered.map((g, i) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/gymnasts/${g.id}`}
              className="block bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-green-500/50 transition-colors text-center group"
            >
              <div className="w-20 h-20 mx-auto rounded-full mb-3 flex items-center justify-center text-3xl overflow-hidden bg-slate-800">
                {g.photoURL ? (
                  <img
                    src={g.photoURL || undefined}
                    alt={g.username}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <UserCircle className="w-10 h-10 text-white/50" />
                )}
              </div>
              <h2 className="font-bold text-white group-hover:text-green-400 transition-colors truncate">
                {g.competitionName || g.displayName || g.username}
              </h2>
              <div className="flex items-center justify-center gap-1 mt-2 text-sm text-yellow-500">
                <Medal className="w-4 h-4" />
                <span>
                  {
                    (g.badges || []).filter((b: any) => {
                      const name = typeof b === "string" ? b : b.name;
                      return (
                        name && name.match(/^(🥇|🥈|🥉|Ouro|Prata|Bronze)/)
                      );
                    }).length
                  }{" "}
                  Medalhas
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="py-20 text-center text-neutral-500">
          Nenhuma ginasta encontrada.
        </div>
      )}
    </div>
  );
}
