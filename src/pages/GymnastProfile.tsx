import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { UserData } from "../App";
import {
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "../lib/firebase";
import { Medal, Star, UserCircle, Award, Calendar, Shield } from "lucide-react";
import { motion } from "motion/react";
import VerifiedBadge from "../components/VerifiedBadge";

export default function GymnastProfile() {
  const { id } = useParams();
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const [gymnast, setGymnast] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [globalRank, setGlobalRank] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "users", id), (doc) =>
      setGymnast({ id: doc.id, ...doc.data() }),
    );

    const sq = query(collection(db, "scores"), where("gymnastId", "==", id));
    const unsubS = onSnapshot(sq, (snap) =>
      setScores(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    );

    // Get rank among all gymnasts based on medals
    const qRank = query(collection(db, "users"), where("tag", "==", "Ginasta"));
    const unsubRank = onSnapshot(qRank, (snap) => {
      const allGymnasts = snap.docs.map((d) => {
        const data = d.data();
        const medals = data.medals || { gold: 0, silver: 0, bronze: 0 };
        const mGold = medals.gold || 0;
        const mSilver = medals.silver || 0;
        const mBronze = medals.bronze || 0;
        const total = mGold + mSilver + mBronze;
        return {
          id: d.id,
          total,
          gold: mGold,
          silver: mSilver,
          bronze: mBronze,
        };
      });

      allGymnasts.sort(
        (a, b) =>
          b.gold - a.gold ||
          b.silver - a.silver ||
          b.bronze - a.bronze ||
          b.total - a.total,
      );

      let rank = 1;
      let prevProfile = "";
      let myRank = null;

      for (let i = 0; i < allGymnasts.length; i++) {
        const curProfile = `${allGymnasts[i].gold}-${allGymnasts[i].silver}-${allGymnasts[i].bronze}-${allGymnasts[i].total}`;
        if (curProfile !== prevProfile) {
          rank = i + 1;
          prevProfile = curProfile;
        }
        if (allGymnasts[i].id === id && allGymnasts[i].total > 0) {
          myRank = rank;
          break;
        }
      }
      setGlobalRank(myRank);
    });

    return () => {
      unsub();
      unsubS();
      unsubRank();
    };
  }, [id]);

  if (!gymnast) return <div className="p-8 text-slate-400">Carregando...</div>;

  const isGymnastRule = gymnast.tag === "Ginasta";

  const calcMedals = () => {
    if (gymnast.medals) {
      return {
        gold: gymnast.medals.gold || 0,
        silver: gymnast.medals.silver || 0,
        bronze: gymnast.medals.bronze || 0,
      };
    }
    const counts = { gold: 0, silver: 0, bronze: 0 };
    if (!gymnast.badges) return counts;
    gymnast.badges.forEach((b: any) => {
      const name = typeof b === "string" ? b : b.name;
      if (name) {
        if (name.startsWith("🥇") || name.startsWith("Ouro")) counts.gold++;
        else if (name.startsWith("🥈") || name.startsWith("Prata"))
          counts.silver++;
        else if (name.startsWith("🥉") || name.startsWith("Bronze"))
          counts.bronze++;
      }
    });
    return counts;
  };
  const dynamicMedals = calcMedals();

  return (
    <div className="space-y-6">
      {/* Upper Profile Banner */}
      <div className="rounded-3xl p-8 relative overflow-hidden bg-gradient-to-tr from-[#10b981]/20 to-[#000000] border border-white/5">
        {globalRank && (
          <div className="absolute top-4 right-6 sm:top-6 sm:right-8 flex flex-col items-end z-20">
            <span className="text-[9px] text-yellow-500 font-black uppercase tracking-[0.2em] opacity-80 backdrop-blur-sm">
              Rank Brasil
            </span>
            <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 italic tracking-tighter drop-shadow-lg">
              #{globalRank}
            </span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <div className="w-32 h-32 rounded-full flex items-center justify-center text-5xl overflow-hidden border-4 border-slate-900 shadow-xl shrink-0 bg-slate-900">
            {gymnast.photoURL ? (
              <img
                src={gymnast.photoURL || undefined}
                alt="Foto"
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable="false"
                onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
              />
            ) : (
              <UserCircle className="w-16 h-16 text-white/50" />
            )}
          </div>
          <div className="text-center sm:text-left">
            <div className="text-xs font-black uppercase tracking-widest text-[#009c3b] mb-1 gap-1 inline-flex items-center">
              <span>{gymnast.tag}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
              {gymnast.competitionName ||
                gymnast.displayName ||
                gymnast.username}
              {gymnast.verified && (
                <VerifiedBadge className="w-6 h-6 text-blue-500" />
              )}
            </h1>
            <div className="flex flex-col items-center sm:items-start gap-2 mt-1.5">
              <p className="text-slate-400 text-xs">@{gymnast.username}</p>
              {gymnast.team && (
                <div className="inline-flex items-center gap-1.5 text-slate-300 bg-slate-800/50 border border-slate-700/50 px-3 py-1 rounded-full font-medium text-xs">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  EQUIPE {gymnast.team}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isGymnastRule ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Medal className="w-6 h-6 text-yellow-500" /> Quadro de Medalhas
              </h2>

              <div className="flex justify-around text-center">
                <div className="space-y-2">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center border-4 border-black/40 shadow-lg">
                    <span className="text-2xl font-black text-white font-mono">
                      {dynamicMedals.gold}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-neutral-400 uppercase">
                    Ouro
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-slate-300 to-slate-500 rounded-full flex items-center justify-center border-4 border-neutral-950 shadow-lg">
                    <span className="text-2xl font-black text-white font-mono">
                      {dynamicMedals.silver}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-neutral-400 uppercase">
                    Prata
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-400 to-orange-700 rounded-full flex items-center justify-center border-4 border-neutral-950 shadow-lg">
                    <span className="text-2xl font-black text-white font-mono">
                      {dynamicMedals.bronze}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-neutral-400 uppercase">
                    Bronze
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Star className="w-6 h-6 text-blue-500" /> Mural de Emblemas
              </h2>
              {!gymnast.badges?.length ? (
                <div className="text-neutral-500 text-sm italic">
                  Nenhum emblema conquistado ainda.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gymnast.badges.map((b: any, i: number) => {
                    const badgeName = typeof b === "string" ? b : b.name;
                    const badgeImg =
                      typeof b === "object" && b.imageUrl ? b.imageUrl : null;
                    return (
                      <div
                        key={i}
                        className="bg-neutral-950 border border-neutral-850 rounded-xl p-2.5 flex items-center gap-2"
                      >
                        {badgeImg ? (
                          <img
                            src={badgeImg || undefined}
                            alt={badgeName}
                            className="w-8 h-8 rounded-full object-cover select-none pointer-events-none"
                            draggable="false"
                            onContextMenu={(e) => e.preventDefault()}
                            style={{
                              WebkitTouchCallout: "none",
                              WebkitUserSelect: "none",
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                            <Star className="w-4 h-4" />
                          </div>
                        )}
                        <span className="font-medium text-xs text-white">
                          {badgeName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Últimos Resultados</h2>
            <div className="space-y-2">
              {scores.slice(0, 10).map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between items-center bg-neutral-950 p-4 rounded-xl border border-neutral-800"
                >
                  <div>
                    <div className="text-sm text-[#009c3b] font-bold">
                      {s.category}
                    </div>
                    <div className="text-xs text-neutral-500">
                      D: {s.dScore} / E: {s.eScore}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-xl text-white">
                    {s.finalScore?.toFixed(3)}
                  </div>
                </div>
              ))}
              {scores.length === 0 && (
                <div className="text-neutral-500 text-sm italic">
                  O atleta não possui resultados registrados.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Alternate elegant view for Visitors, Admins and Referees */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-900 border border-slate-800 rounded-2xl p-6 md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Shield className="w-5 h-5 text-[#009c3b]" /> Informações Gerais
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-neutral-950 border border-slate-850 p-4 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                  Tipo de Conta
                </span>
                <p className="text-sm font-bold text-slate-200">
                  {gymnast.tag}
                </p>
              </div>

              {gymnast.createdAt && (
                <div className="bg-neutral-950 border border-slate-850 p-4 rounded-xl space-y-1 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">
                      Membro desde
                    </span>
                    <p className="text-xs text-slate-350">
                      {new Date(gymnast.createdAt).toLocaleDateString("pt-BR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl">
              <p className="text-xs text-slate-400 italic">
                Usuário cadastrado na plataforma GYMSTARS BRASIL. Apenas
                ginastas homologados possuem scoreboard público e quadro
                competitivo de medalhas.
              </p>
            </div>
          </div>

          <div className="bg-neutral-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Star className="w-5 h-5 text-blue-500" /> Medalhas & Conquistas
            </h2>

            {!gymnast.badges?.length ? (
              <div className="text-neutral-500 text-xs italic text-center py-8">
                Nenhum emblema ou credencial especial nesta conta.
              </div>
            ) : (
              <div className="space-y-2">
                {gymnast.badges.map((b: any, i: number) => {
                  const badgeName = typeof b === "string" ? b : b.name;
                  const badgeImg =
                    typeof b === "object" && b.imageUrl ? b.imageUrl : null;
                  return (
                    <div
                      key={i}
                      className="bg-neutral-950 border border-neutral-850 rounded-xl p-3 flex items-center gap-2.5 hover:border-slate-800 transition-colors"
                    >
                      {badgeImg ? (
                        <img
                          src={badgeImg || undefined}
                          alt={badgeName}
                          className="w-8 h-8 rounded-full object-cover shrink-0 select-none pointer-events-none"
                          draggable="false"
                          onContextMenu={(e) => e.preventDefault()}
                          style={{
                            WebkitTouchCallout: "none",
                            WebkitUserSelect: "none",
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                          <Award className="w-4 h-4" />
                        </div>
                      )}
                      <span className="font-bold text-xs text-white">
                        {badgeName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
