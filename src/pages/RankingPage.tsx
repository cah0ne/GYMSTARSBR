import { useEffect, useState, useRef } from "react";
import { db, collection, query, where, onSnapshot } from "../lib/firebase";
import { Link, useOutletContext } from "react-router-dom";
import { motion } from "motion/react";
import { Trophy, ArrowLeft, Download } from "lucide-react";
import { UserData } from "../App";
import * as htmlToImage from "html-to-image";
import download from "downloadjs";
import clsx from "clsx";

export default function RankingPage() {
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const isAdmin = userData?.tag === "Admin";
  const [gymnasts, setGymnasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [downloadingImg, setDownloadingImg] = useState<"9:16" | "3:4" | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  const handleDownload = async (ratio: "9:16" | "3:4") => {
    setDownloadingImg(ratio);
    setTimeout(async () => {
      if (downloadRef.current) {
        try {
          const dataUrl = await htmlToImage.toJpeg(downloadRef.current, {
            quality: 0.95,
            pixelRatio: 2,
            skipFonts: true,
          });
          download(dataUrl, `medal-ranking-${ratio}.jpg`);
        } catch (e) {
          console.error("error download", e);
        }
        setDownloadingImg(null);
      }
    }, 1500);
  };

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

  const exportGymnasts = gymnasts.slice(0, 10); // Top 10 for export

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-neutral-800 pb-8">
        <div className="flex items-start gap-6">
          <Link
            to="/"
            className="p-3 bg-neutral-900 border border-neutral-800 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0 mt-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <p className="text-sm font-mono text-neutral-500 uppercase tracking-[0.3em] font-bold mb-2">
              // Histórico Geral
            </p>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-none">
              Quadro de <br className="hidden md:block" />
              Medalhas
            </h1>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-3 shrink-0">
            <span className="text-xs font-mono text-neutral-600 uppercase tracking-widest text-right">
              Exportar Imagem
            </span>
            <div className="flex gap-2">
               <button
                  onClick={() => handleDownload("9:16")}
                  disabled={!!downloadingImg}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-black text-sm font-mono font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {downloadingImg === "9:16" ? (
                    "GERANDO..."
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> 9:16 IG
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload("3:4")}
                  disabled={!!downloadingImg}
                  className="flex items-center gap-2 px-5 py-3 bg-neutral-900 border border-neutral-800 text-white text-sm font-mono font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  {downloadingImg === "3:4" ? (
                    "GERANDO..."
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> 3:4 POST
                    </>
                  )}
                </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-neutral-800 border-t-white rounded-full animate-spin mb-6"></div>
          <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest animate-pulse">
            Sincronizando dados...
          </p>
        </div>
      ) : gymnasts.length === 0 ? (
        <div className="text-center py-32 border-2 border-dashed border-neutral-800">
          <Trophy className="w-16 h-16 text-neutral-800 mx-auto mb-6" />
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Sem Registros</h3>
          <p className="text-neutral-500 font-mono uppercase tracking-widest text-sm">
            Nenhuma medalha foi distribuída ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {gymnasts.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: "easeOut" }}
            >
              <Link
                to={`/gymnasts/${g.id}`}
                className={clsx(
                  "group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-4 md:p-6 rounded-2xl border transition-all duration-300",
                  g.rank === 1
                    ? "bg-gradient-to-br from-yellow-500/10 via-neutral-900 to-[#0a0a0a] border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.05)] hover:border-yellow-400/60"
                    : g.rank === 2
                      ? "bg-neutral-900 border-neutral-700 hover:border-slate-500"
                      : g.rank === 3
                        ? "bg-orange-950/20 border-orange-900/30 hover:border-orange-800"
                        : "bg-[#0a0a0a] border-neutral-800 hover:border-neutral-700"
                )}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 md:w-16 text-center shrink-0">
                    <span
                      className={clsx(
                        "text-4xl md:text-5xl font-black italic tracking-tighter",
                        g.rank === 1
                          ? "text-yellow-500 drop-shadow-md"
                          : g.rank === 2
                            ? "text-slate-300"
                            : g.rank === 3
                              ? "text-orange-500"
                              : "text-neutral-700"
                      )}
                    >
                      {g.rank}
                    </span>
                  </div>

                  <div
                    className={clsx(
                      "shrink-0 rounded-full border-2 flex items-center justify-center overflow-hidden bg-neutral-900 shadow-md",
                      "w-14 h-14 md:w-16 md:h-16",
                      g.rank === 1
                        ? "border-yellow-500"
                        : g.rank === 2
                          ? "border-slate-300"
                          : g.rank === 3
                            ? "border-orange-500"
                            : "border-neutral-700"
                    )}
                  >
                    {g.photoURL ? (
                      <img
                        src={g.photoURL || undefined}
                        alt={g.competitionName || g.competitionname || g.displayName || g.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-black text-2xl italic text-neutral-600">
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

                  <div className="min-w-0 flex-1 pl-2">
                    <h3
                      className={clsx(
                        "text-xl md:text-2xl font-black uppercase tracking-tighter truncate leading-tight",
                        g.rank === 1 ? "text-yellow-400" : "text-white"
                      )}
                    >
                      {g.competitionName || g.competitionname || g.displayName || g.username}
                    </h3>
                    <p className="text-xs md:text-sm text-neutral-500 font-mono uppercase tracking-widest truncate mt-1">
                      {g.team || "Independente"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:w-auto shrink-0 pl-[88px] sm:pl-0 border-t border-neutral-800 sm:border-0 pt-4 sm:pt-0 mt-2 sm:mt-0">
                  <div className="text-center">
                    <p className="text-[10px] text-neutral-500 uppercase font-mono font-black tracking-widest mb-1">
                      Totais
                    </p>
                    <p className="text-2xl font-black text-white leading-none tabular-nums">
                      {g.totalMedals}
                    </p>
                  </div>

                  <div className="flex gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                    <div className="text-center font-mono flex flex-col items-center gap-1.5 min-w-[24px]">
                      <span className="w-4 h-4 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
                         <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      </span>
                      <span className="text-sm font-bold text-slate-300">
                        {g.mGold}
                      </span>
                    </div>
                    <div className="text-center font-mono flex flex-col items-center gap-1.5 min-w-[24px]">
                      <span className="w-4 h-4 rounded-full bg-slate-400/20 border border-slate-400/50 flex items-center justify-center">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      </span>
                      <span className="text-sm font-bold text-slate-300">
                        {g.mSilver}
                      </span>
                    </div>
                    <div className="text-center font-mono flex flex-col items-center gap-1.5 min-w-[24px]">
                      <span className="w-4 h-4 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
                         <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
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

      {/* HIDDEN EXPORT BLOCK */}
      {downloadingImg && (
        <div
          style={{ position: "fixed", top: "-9999px", left: "-9999px" }}
          aria-hidden="true"
        >
          <div
            ref={downloadRef}
            className={clsx(
              "bg-[#030303] flex flex-col items-center justify-start border-8 border-neutral-900 relative overflow-hidden",
              downloadingImg === "3:4" ? "p-10" : "p-16"
            )}
            style={{
              width: "1080px",
              height: downloadingImg === "9:16" ? "1920px" : "1440px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {/* Background elements */}
            <div className="absolute top-[-100px] right-[-100px] text-[300px] font-black text-white/[0.02] uppercase tracking-tighter leading-none select-none z-0">
              RK
            </div>

            {/* Header */}
            <div className={clsx(
              "w-full bg-transparent border-b-2 border-neutral-800 z-10",
              downloadingImg === "3:4" ? "pb-8 mb-8" : "pb-12 mb-12"
            )}>
              <div className="flex justify-between items-end">
                  <div>
                      <div className={clsx(
                        "text-xl font-mono border-l-4 border-yellow-500 px-4 py-1 uppercase font-bold text-neutral-400 tracking-[0.2em]",
                        downloadingImg === "3:4" ? "mb-4" : "mb-6"
                      )}>
                        // ESTATÍSTICA OFICIAL
                      </div>
                      <h1 className={clsx(
                        "font-black uppercase tracking-tighter text-white leading-none",
                        downloadingImg === "3:4" ? "text-6xl" : "text-7xl"
                      )}>
                        RANKING DE<br />
                        <span className="text-yellow-500">MEDALHAS</span>
                      </h1>
                  </div>
                  <div className="text-right">
                     <p className="font-mono text-neutral-600 uppercase tracking-[0.3em] font-bold text-2xl whitespace-nowrap">
                        GYMSTARS BRASIL
                     </p>
                  </div>
              </div>
            </div>

            {/* Sub Header row */}
            <div className="w-full flex justify-end gap-[70px] pr-8 pb-4 text-sm font-mono font-bold text-neutral-500 uppercase tracking-widest z-10">
               <span className="w-16 text-center text-yellow-500">OURO</span>
               <span className="w-16 text-center text-slate-300">PRATA</span>
               <span className="w-16 text-center text-orange-500">BRONZE</span>
               <span className="w-16 text-center text-white">TOTAL</span>
            </div>

            {/* List */}
            <div className={clsx(
              "w-full flex-1 flex flex-col justify-start z-10",
              downloadingImg === "3:4" ? "space-y-4" : "space-y-6"
            )}>
              {exportGymnasts.map((g, i) => (
                <div
                  key={g.id}
                  className={clsx(
                    "w-full flex items-center justify-between border-l-[8px] overflow-hidden",
                    downloadingImg === "3:4" ? "py-4 px-6" : "py-5 px-8",
                    i === 0 ? "border-yellow-400 bg-yellow-400/5 text-yellow-400" : "border-neutral-800 bg-[#0a0a0a]",
                  )}
                >
                  <div className="flex items-center gap-6 min-w-0">
                    <span
                      className={clsx(
                        "text-5xl font-black tracking-tighter w-12 tabular-nums leading-none",
                        i === 0 ? "text-yellow-500" : "text-neutral-700",
                      )}
                    >
                      {String(g.rank).padStart(2, "0")}
                    </span>

                    <div
                      className={clsx(
                        "shrink-0 rounded-full border-2 flex items-center justify-center overflow-hidden bg-neutral-900 shadow-md",
                        downloadingImg === "3:4" ? "w-14 h-14" : "w-16 h-16",
                        i === 0 ? "border-yellow-500" : "border-neutral-700"
                      )}
                    >
                      {g.photoURL ? (
                        <img
                          src={g.photoURL || undefined}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-black text-2xl italic text-neutral-600">
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
                      <p
                        className={clsx(
                          "font-black leading-none text-white uppercase tracking-tighter whitespace-nowrap truncate",
                          downloadingImg === "3:4" ? "text-3xl" : "text-4xl"
                        )}
                      >
                        {g.competitionName || g.competitionname || g.displayName || g.username}
                      </p>
                      <p className={clsx(
                        "text-neutral-500 uppercase tracking-widest font-mono font-bold truncate",
                        downloadingImg === "3:4" ? "text-lg mt-1" : "text-xl mt-2"
                      )}>
                        {g.team || "Independente"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-[70px] shrink-0 pr-2">
                     <span className="w-16 text-center text-3xl font-black text-yellow-500 tabular-nums leading-none">{g.mGold}</span>
                     <span className="w-16 text-center text-3xl font-black text-slate-300 tabular-nums leading-none">{g.mSilver}</span>
                     <span className="w-16 text-center text-3xl font-black text-orange-500 tabular-nums leading-none">{g.mBronze}</span>
                     <span className="w-16 text-center text-4xl font-black text-white tabular-nums leading-none">{g.totalMedals}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className={clsx(
              "mt-auto border-t-2 border-neutral-800 w-full flex justify-between items-end z-10",
              downloadingImg === "3:4" ? "pt-6 pb-2" : "pt-8 pb-4"
            )}>
              <div className="font-mono text-neutral-500 uppercase tracking-widest flex flex-col">
                 <span className="text-white font-black">// SISTEMA GYMSTARS BRASIL</span>
                 <span className="text-xs">TODOS OS DIREITOS RESERVADOS</span>
              </div>
              <div className="font-black text-3xl uppercase tracking-tighter text-neutral-700 text-right">
                RANKING ATUALIZADO
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
