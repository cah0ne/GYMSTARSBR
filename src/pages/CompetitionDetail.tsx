import { useEffect, useState, useRef } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { UserData } from "../App";
import {
  db,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  setDoc,
} from "../lib/firebase";
import { Activity, ShieldAlert, XCircle, Music, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import * as htmlToImage from "html-to-image";
import download from "downloadjs";

const CATEGORIES = ["TF", "AA", "VT", "UB", "BB", "FX"];

export default function CompetitionDetail() {
  const { id } = useParams();
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const isAdmin = userData?.tag === "Admin";
  const isReferee = userData?.tag === "Árbitro";
  const canStopMusic = isAdmin || isReferee;

  const [comp, setComp] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("TF");
  const [scores, setScores] = useState<any[]>([]); // All scores for the competition
  const [livePerformances, setLivePerformances] = useState<any[]>([]);
  const [selectedScore, setSelectedScore] = useState<any>(null);
  const [globalSfx, setGlobalSfx] = useState("");
  const [statusMsg, setStatusMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const [downloadingImg, setDownloadingImg] = useState<"9:16" | "3:4" | null>(
    null,
  );
  const downloadRef = useRef<HTMLDivElement>(null);

  const handleDownload = async (ratio: "9:16" | "3:4") => {
    setDownloadingImg(ratio);
    setTimeout(async () => {
      if (downloadRef.current) {
        try {
          const dataUrl = await htmlToImage.toJpeg(downloadRef.current, {
            quality: 0.9,
            pixelRatio: 2, // better quality
          });
          download(dataUrl, `ranking-${comp?.name}-${activeTab}.jpg`);
        } catch (e) {
          console.error("error download", e);
        }
        setDownloadingImg(null);
      }
    }, 1500); // Wait for fonts and layout to settle
  };

  const handleStopMusic = async () => {
    try {
      await setDoc(doc(db, "liveCommand", "audio"), {
        action: "stop_music",
        updatedAt: Date.now(),
      });
      setStatusMsg({
        text: "Música interrompida para todos!",
        type: "success",
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (e: any) {
      console.error("Error stopping music:", e);
      setStatusMsg({
        text: "Erro ao parar música: " + e.message,
        type: "error",
      });
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (d) => {
      if (d.exists()) {
        setGlobalSfx(d.data().sfxUrl || "");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "competitions", id), (d) =>
      setComp({ id: d.id, ...(d.data() as any) }),
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const sq = query(
      collection(db, "scores"),
      where("competitionId", "==", id),
    );
    const unsubScores = onSnapshot(sq, (snap) =>
      setScores(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    );
    return () => unsubScores();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const lq = query(
      collection(db, "livePerformances"),
      where("competitionId", "==", id),
    );
    const unsubLive = onSnapshot(lq, (snap) => {
      const perfs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      console.log("Live performances updated:", perfs);
      setLivePerformances(perfs);
    });
    return () => unsubLive();
  }, [id]);

  // Find the performance that matches active tab, or fallback to first one
  const activeLivePerf =
    livePerformances.find((p) => p.category === activeTab) ||
    livePerformances[0];

  const setStatus = async (status: string) => {
    if (!isAdmin || !id) return;

    try {
      await updateDoc(doc(db, "competitions", id), { status });

      if (
        status === "encerrada" &&
        (comp?.type?.includes("Finais") ||
          comp?.type === "Final AA" ||
          comp?.type === "Final TF")
      ) {
        let msg = "";

        if (comp?.type === "Final AA") {
          const byGymnast: Record<
            string,
            { id: string; name: string; total: number }
          > = {};
          scores.forEach((s) => {
            if (s.gymnastId) {
              if (!byGymnast[s.gymnastId]) {
                byGymnast[s.gymnastId] = {
                  id: s.gymnastId,
                  name: s.gymnastName,
                  total: 0,
                };
              }
              byGymnast[s.gymnastId].total += s.finalScore;
            }
          });

          const sorted = Object.values(byGymnast).sort(
            (a, b) => b.total - a.total,
          );
          const top3 = sorted.slice(0, 3);

          for (let i = 0; i < top3.length; i++) {
            const badgeColor = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
            const newBadge = {
              id: Date.now().toString() + Math.random(),
              name: `${badgeColor} Final AA - ${comp?.name}`,
              imageUrl: "",
              competitionId: id,
            };
            const userRef = doc(db, "users", top3[i].id);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              const badges = uData.badges || [];
              const medals = uData.medals || { gold: 0, silver: 0, bronze: 0 };
              if (i === 0) medals.gold = (medals.gold || 0) + 1;
              if (i === 1) medals.silver = (medals.silver || 0) + 1;
              if (i === 2) medals.bronze = (medals.bronze || 0) + 1;
              await updateDoc(userRef, {
                badges: [...badges, newBadge],
                medals,
              });
            }
          }
          msg =
            "Competição encerrada e medalhas distribuídas para os 3 melhores do Final AA!";
        } else if (comp?.type === "Final TF") {
          const byTeamCat: Record<string, Record<string, number[]>> = {};
          scores.forEach((s) => {
            const tName = s.team;
            if (
              tName &&
              tName.toLowerCase() !== "independente" &&
              s.category !== "AA" &&
              s.category !== "TF"
            ) {
              if (!byTeamCat[tName]) byTeamCat[tName] = {};
              if (!byTeamCat[tName][s.category])
                byTeamCat[tName][s.category] = [];
              byTeamCat[tName][s.category].push(s.finalScore || 0);
            }
          });

          const byTeam: Record<string, { team: string; total: number }> = {};
          Object.keys(byTeamCat).forEach((tName) => {
            let total = 0;
            Object.keys(byTeamCat[tName]).forEach((cat) => {
              const catScores = byTeamCat[tName][cat]
                .sort((a, b) => b - a)
                .slice(0, 3);
              total += catScores.reduce((acc, val) => acc + val, 0);
            });
            byTeam[tName] = { team: tName, total };
          });

          const sorted = Object.values(byTeam).sort(
            (a, b) => b.total - a.total,
          );
          const top3 = sorted.slice(0, 3);

          if (top3.length > 0) {
            const usersSnap = await getDocs(collection(db, "users"));
            const allUsers = usersSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            }));

            for (let i = 0; i < top3.length; i++) {
              const badgeColor = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
              const newBadge = {
                id: Date.now().toString() + Math.random(),
                name: `${badgeColor} Final TF Equipes - ${comp?.name}`,
                imageUrl: "",
                competitionId: id,
              };

              const teamMembers = allUsers.filter(
                (u) =>
                  u.team === top3[i].team &&
                  scores.some((s) => s.gymnastId === u.id),
              );

              for (const member of teamMembers) {
                const userRef = doc(db, "users", member.id);
                const badges = member.badges || [];
                const medals = member.medals || {
                  gold: 0,
                  silver: 0,
                  bronze: 0,
                };
                if (i === 0) medals.gold = (medals.gold || 0) + 1;
                if (i === 1) medals.silver = (medals.silver || 0) + 1;
                if (i === 2) medals.bronze = (medals.bronze || 0) + 1;
                await updateDoc(userRef, {
                  badges: [...badges, newBadge],
                  medals,
                });
              }
            }
          }
          msg =
            "Competição encerrada e medalhas distribuídas para os membros das 3 melhores equipes na Final TF!";
        } else {
          const byCat: Record<string, any[]> = {};
          scores.forEach((s) => {
            if (!byCat[s.category]) byCat[s.category] = [];
            byCat[s.category].push(s);
          });

          for (const cat of Object.keys(byCat)) {
            const sorted = byCat[cat].sort(
              (a, b) => b.finalScore - a.finalScore,
            );
            const top3 = sorted.slice(0, 3);

            for (let i = 0; i < top3.length; i++) {
              const s = top3[i];
              if (s.gymnastId) {
                const badgeColor = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
                const newBadge = {
                  id: Date.now().toString() + Math.random(),
                  name: `${badgeColor} Finais ${cat} - ${comp?.name}`,
                  imageUrl: "",
                  competitionId: id,
                };

                const userRef = doc(db, "users", s.gymnastId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  const uData = userSnap.data();
                  const badges = uData.badges || [];
                  const medals = uData.medals || {
                    gold: 0,
                    silver: 0,
                    bronze: 0,
                  };
                  if (i === 0) medals.gold = (medals.gold || 0) + 1;
                  if (i === 1) medals.silver = (medals.silver || 0) + 1;
                  if (i === 2) medals.bronze = (medals.bronze || 0) + 1;

                  await updateDoc(userRef, {
                    badges: [...badges, newBadge],
                    medals,
                  });
                }
              }
            }
          }
          msg =
            "Competição encerrada e medalhas distribuídas (Ouro, Prata, Bronze) para os 3 melhores de cada aparelho!";
        }

        setStatusMsg({
          text: msg,
          type: "success",
        });
        setTimeout(() => setStatusMsg(null), 8000);
      }

      await addDoc(collection(db, "notifications"), {
        title:
          status === "ao vivo" ? "⚠ AO VIVO AGORA!" : "Competição Atualizada",
        message: `A competição "${comp?.name}" está agora: ${status.toUpperCase()}!`,
        type: "live",
        link: `/competitions/${id}`,
        createdAt: Date.now(),
        senderId: userData?.uid,
      });
    } catch (e: any) {
      setStatusMsg({
        text: "Erro ao mudar status: " + e.message,
        type: "error",
      });
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  let availableTabs = CATEGORIES;
  if (comp?.type?.startsWith("Finais ")) {
    availableTabs = [comp.type.split(" ")[1]];
  } else if (comp?.type === "Final AA") {
    availableTabs = ["AA", "VT", "UB", "BB", "FX"];
  } else if (comp?.type === "Final TF") {
    availableTabs = ["TF", "AA", "VT", "UB", "BB", "FX"];
  }

  useEffect(() => {
    if (comp?.type?.startsWith("Finais ")) {
      setActiveTab(comp?.type?.split(" ")[1]);
    } else if (comp?.type === "Final AA") {
      setActiveTab("AA");
    } else if (comp?.type === "Final TF") {
      setActiveTab("TF");
    }
  }, [comp?.type]);

  if (!comp) return <div className="p-8 text-slate-400">Carregando...</div>;

  // Process scores for the active tab
  let displayScores: any[] = [];
  if (activeTab === "AA") {
    const aaMap = new Map();
    scores.forEach((s) => {
      if (s.category === "AA" || s.category === "TF") return;
      if (!aaMap.has(s.gymnastId)) {
        aaMap.set(s.gymnastId, {
          id: s.gymnastId,
          gymnastName: s.gymnastName,
          team: s.team,
          finalScore: 0,
          dScore: 0,
          eScore: 0,
          categoryCount: 0,
          isAA: true,
        });
      }
      const item = aaMap.get(s.gymnastId);
      item.finalScore += s.finalScore || 0;
      item.dScore += s.dScore || 0;
      item.eScore += s.eScore || 0;
      item.categoryCount += 1;
    });
    displayScores = Array.from(aaMap.values()).sort(
      (a, b) => b.finalScore - a.finalScore,
    );
  } else if (activeTab === "TF") {
    const tfCatScores = new Map();
    const tfMap = new Map();

    scores.forEach((s) => {
      if (s.category === "AA" || s.category === "TF") return;
      const teamLabel =
        s.team && s.team !== "Independente" ? s.team : s.gymnastName; // Fallback so independent don't get merged

      if (!tfMap.has(teamLabel)) {
        tfMap.set(teamLabel, {
          id: teamLabel,
          gymnastName: teamLabel, // Treating the row name as the Team name
          team: "Equipe",
          finalScore: 0,
          dScore: 0, // Not super relevant for TF but keep shape
          eScore: 0,
          isTF: true,
        });
        tfCatScores.set(teamLabel, {});
      }

      const teamCats = tfCatScores.get(teamLabel);
      if (!teamCats[s.category]) {
        teamCats[s.category] = [];
      }
      teamCats[s.category].push({
        finalScore: s.finalScore || 0,
        dScore: s.dScore || 0,
        eScore: s.eScore || 0,
      });
    });

    Array.from(tfMap.keys()).forEach((teamLabel) => {
      const item = tfMap.get(teamLabel);
      const teamCats = tfCatScores.get(teamLabel);

      Object.keys(teamCats).forEach((cat) => {
        const catScores = teamCats[cat]
          .sort((a: any, b: any) => b.finalScore - a.finalScore)
          .slice(0, 3);
        catScores.forEach((cs: any) => {
          item.finalScore += cs.finalScore;
          item.dScore += cs.dScore;
          item.eScore += cs.eScore;
        });
      });
    });

    displayScores = Array.from(tfMap.values()).sort(
      (a, b) => b.finalScore - a.finalScore,
    );
  } else {
    displayScores = scores
      .filter((s) => s.category === activeTab)
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  if (comp?.type?.includes("Finais")) {
    displayScores = displayScores.slice(0, 8);
  }

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm font-bold border transition-all ${
            statusMsg.type === "success"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col">
        {comp.status === "ao vivo" && (
          <div className="absolute top-0 right-0 bg-red-600/20 border border-red-500/50 text-red-500 text-xs font-bold px-4 py-1.5 pb-2 rounded-bl-3xl shadow-lg flex items-center gap-2 uppercase tracking-widest">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            AO VIVO
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
          <div>
            <div className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded w-max mb-3 uppercase font-bold text-slate-300 tracking-wider">
              {comp.type}
            </div>
            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white leading-tight">
              {comp.name}
            </h1>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {comp.status !== "ao vivo" && (
                <button
                  onClick={() => setStatus("ao vivo")}
                  className="bg-red-600/20 border border-red-500/50 hover:bg-red-600/40 text-red-500 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Iniciar (AO VIVO)
                </button>
              )}
              {comp.status !== "encerrada" && (
                <button
                  onClick={() => setStatus("encerrada")}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Encerrar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 bg-black/40 p-1 rounded-lg shrink-0">
          {availableTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={clsx(
                "px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap",
                activeTab === cat
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:text-white",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {activeLivePerf && (
        <div className="bg-[#009c3b] p-4 rounded-2xl shadow-lg shadow-green-900/20 space-y-3">
          {/* Header row: "Em quadra agora" and status */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#d8f3dc] flex items-center gap-1.5">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Em quadra agora
            </span>
            <span className="text-[10px] bg-black/30 px-2.5 py-1 rounded-full text-white font-bold uppercase tracking-wider shrink-0">
              Ginasta em julgamento
            </span>
          </div>

          {/* Gymnast and Team details */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="space-y-1">
              <span className="text-base sm:text-lg font-black text-white block leading-tight">
                {activeLivePerf.gymnastName} ({activeLivePerf.category})
              </span>
              <span className="text-xs text-white/90 font-medium bg-black/20 px-2.5 py-0.5 rounded-md inline-block">
                Equipe:{" "}
                {activeLivePerf.team ||
                  scores.find((s) => s.gymnastId === activeLivePerf.gymnastId)
                    ?.team ||
                  "Independente"}
              </span>
            </div>

            {activeLivePerf.category === "FX" && canStopMusic && (
              <button
                onClick={handleStopMusic}
                className="bg-red-700 hover:bg-red-600 border border-red-500/30 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-red-950/20 shrink-0 w-full sm:w-auto"
              >
                <Music className="w-3.5 h-3.5" /> Parar Música
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex flex-wrap space-x-2 items-center">
            <h2 className="font-black italic uppercase tracking-tighter text-2xl text-white">
              Ranking em Tempo Real
            </h2>
            <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-mono mt-1 sm:mt-0">
              {activeTab === "TF"
                ? "FINAL POR EQUIPES (SOMA)"
                : activeTab === "AA"
                  ? "INDIVIDUAL GERAL (SOMA)"
                  : `CATEGORIA: ${activeTab}`}
            </span>
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleDownload("9:16")}
                disabled={!!downloadingImg}
                className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                {downloadingImg === "9:16" ? (
                  <Activity className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}{" "}
                9:16
              </button>
              <button
                onClick={() => handleDownload("3:4")}
                disabled={!!downloadingImg}
                className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                {downloadingImg === "3:4" ? (
                  <Activity className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}{" "}
                3:4
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {displayScores.map((s, i) => (
            <div
              key={s.id}
              onClick={() => {
                if (!s.isTF && !s.isAA) setSelectedScore(s);
              }}
              className={clsx(
                "p-4 mx-2 sm:mx-4 my-2 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors group border border-transparent active:scale-[0.98] transition-transform",
                !s.isTF && !s.isAA && "cursor-pointer",
                i === 0 ? "bg-white/5 border-yellow-400/20" : "",
              )}
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <span className="font-mono text-sm opacity-50 w-6 flex justify-center shrink-0">
                  {comp.status === "encerrada" &&
                    (comp.type?.includes("Finais") ||
                      (comp.type === "Final AA" && activeTab === "AA") ||
                      (comp.type === "Final TF" && activeTab === "TF")) &&
                    i === 0 && (
                      <span className="text-xl" title="Ouro">
                        🥇
                      </span>
                    )}
                  {comp.status === "encerrada" &&
                    (comp.type?.includes("Finais") ||
                      (comp.type === "Final AA" && activeTab === "AA") ||
                      (comp.type === "Final TF" && activeTab === "TF")) &&
                    i === 1 && (
                      <span className="text-xl" title="Prata">
                        🥈
                      </span>
                    )}
                  {comp.status === "encerrada" &&
                    (comp.type?.includes("Finais") ||
                      (comp.type === "Final AA" && activeTab === "AA") ||
                      (comp.type === "Final TF" && activeTab === "TF")) &&
                    i === 2 && (
                      <span className="text-xl" title="Bronze">
                        🥉
                      </span>
                    )}
                  {!(
                    comp.status === "encerrada" &&
                    (comp.type?.includes("Finais") ||
                      (comp.type === "Final AA" && activeTab === "AA") ||
                      (comp.type === "Final TF" && activeTab === "TF")) &&
                    i < 3
                  ) && String(i + 1).padStart(2, "0")}
                </span>
                <div className="overflow-hidden">
                  <p className="font-bold text-sm sm:text-base leading-tight text-white truncate">
                    {s.gymnastName}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate uppercase tracking-wider">
                    {s.team || "Independente"}
                  </p>
                  {s.isAA && (
                    <p className="text-[9px] text-[#009c3b] mt-1 font-bold">
                      {s.categoryCount} APARELHOS
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-6 shrink-0 ml-2">
                {!s.isTF && !s.isAA && (
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] text-slate-500 uppercase mb-0.5">
                      D+E
                    </p>
                    <p className="font-mono text-xs text-slate-400">
                      {s.dScore?.toFixed(2)} + {s.eScore?.toFixed(2)}
                    </p>
                  </div>
                )}
                <div
                  className={clsx(
                    "px-3 py-1.5 rounded-lg border text-right transition-colors min-w-[70px]",
                    i === 0
                      ? "bg-yellow-400/10 border-yellow-400/20"
                      : "bg-black/20 border-white/5",
                  )}
                >
                  <p
                    className={clsx(
                      "text-[9px] uppercase font-black tracking-tighter",
                      i === 0 ? "text-yellow-500" : "text-slate-500",
                    )}
                  >
                    Total
                  </p>
                  <p
                    className={clsx(
                      "text-base sm:text-lg font-mono font-black",
                      i === 0 ? "text-yellow-400" : "text-white",
                    )}
                  >
                    {s.finalScore?.toFixed(3)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {displayScores.length === 0 && (
            <div className="p-12 text-center text-slate-500 font-mono text-sm">
              Nenhum resultado registrado nesta categoria.
            </div>
          )}
        </div>
      </div>
      {comp?.type === "Qualificações" && scores.length > 8 && (
        <div className="text-sm font-medium text-slate-500 text-center">
          Apenas os 8 melhores avançam para as Finais.
        </div>
      )}

      {/* Hidden container for image export */}
      {downloadingImg && (
        <div
          style={{ position: "fixed", top: "-9999px", left: "-9999px" }}
          aria-hidden="true"
        >
          <div
            ref={downloadRef}
            className="bg-[#070F1C] flex flex-col items-center justify-start p-16"
            style={{
              width: "1080px",
              height: downloadingImg === "9:16" ? "1920px" : "1440px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {/* Header */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-10 mb-8 relative overflow-hidden flex flex-col items-center shadow-2xl">
              <div className="text-2xl font-mono bg-white/10 px-4 py-2 rounded-lg mb-6 uppercase font-bold text-slate-300 tracking-wider">
                {comp.type}
              </div>
              <h1 className="text-6xl font-black italic uppercase tracking-tighter text-white leading-tight text-center">
                {comp.name}
              </h1>
              <div className="mt-8 bg-indigo-500/20 text-indigo-400 px-6 py-3 rounded-xl border border-indigo-500/50 text-3xl font-black uppercase tracking-widest">
                {activeTab === "TF"
                  ? "FINAL POR EQUIPES"
                  : activeTab === "AA"
                    ? "INDIVIDUAL GERAL"
                    : `CATEGORIA: ${activeTab}`}
              </div>
            </div>

            {/* List */}
            <div className="w-full flex-1 flex flex-col justify-start gap-6">
              {displayScores.slice(0, 8).map((s, i) => (
                <div
                  key={s.id}
                  className={clsx(
                    "p-8 rounded-3xl flex items-center justify-between border shadow-xl bg-slate-900 border-slate-800",
                    i === 0 ? "bg-white/5 border-yellow-400/40" : "",
                    i === 1 ? "bg-white/5 border-slate-400/40" : "",
                    i === 2 ? "bg-white/5 border-orange-400/40" : "",
                  )}
                >
                  <div className="flex items-center space-x-8">
                    <span className="font-mono text-4xl opacity-50 w-16 flex justify-center shrink-0">
                      {comp.status === "encerrada" &&
                        (comp.type?.includes("Finais") ||
                          (comp.type === "Final AA" && activeTab === "AA") ||
                          (comp.type === "Final TF" && activeTab === "TF")) &&
                        i === 0 && (
                          <span className="text-5xl" title="Ouro">
                            🥇
                          </span>
                        )}
                      {comp.status === "encerrada" &&
                        (comp.type?.includes("Finais") ||
                          (comp.type === "Final AA" && activeTab === "AA") ||
                          (comp.type === "Final TF" && activeTab === "TF")) &&
                        i === 1 && (
                          <span className="text-5xl" title="Prata">
                            🥈
                          </span>
                        )}
                      {comp.status === "encerrada" &&
                        (comp.type?.includes("Finais") ||
                          (comp.type === "Final AA" && activeTab === "AA") ||
                          (comp.type === "Final TF" && activeTab === "TF")) &&
                        i === 2 && (
                          <span className="text-5xl" title="Bronze">
                            🥉
                          </span>
                        )}
                      {!(
                        comp.status === "encerrada" &&
                        (comp.type?.includes("Finais") ||
                          (comp.type === "Final AA" && activeTab === "AA") ||
                          (comp.type === "Final TF" && activeTab === "TF")) &&
                        i < 3
                      ) && String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-black text-4xl leading-tight text-white uppercase truncate max-w-[500px]">
                        {s.gymnastName}
                      </p>
                      <p className="text-2xl text-slate-500 mt-2 truncate uppercase tracking-widest font-bold">
                        {s.team || "Independente"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 shrink-0 ml-4">
                    {!s.isTF && !s.isAA && (
                      <div className="text-right mr-4">
                        <p className="text-xl text-slate-500 uppercase mb-1 font-bold">
                          D+E
                        </p>
                        <p className="font-mono text-2xl text-slate-400">
                          {s.dScore?.toFixed(2)} + {s.eScore?.toFixed(2)}
                        </p>
                      </div>
                    )}
                    <div
                      className={clsx(
                        "px-8 py-4 rounded-2xl border text-right",
                        i === 0
                          ? "bg-yellow-400/10 border-yellow-400/30"
                          : "bg-black/40 border-white/10",
                      )}
                    >
                      <p
                        className={clsx(
                          "text-xl uppercase font-black tracking-tighter mb-1",
                          i === 0 ? "text-yellow-500" : "text-slate-500",
                        )}
                      >
                        Total
                      </p>
                      <p
                        className={clsx(
                          "text-5xl font-mono font-black",
                          i === 0 ? "text-yellow-400" : "text-white",
                        )}
                      >
                        {s.finalScore?.toFixed(3)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center opacity-40">
              <p className="text-2xl font-bold uppercase tracking-widest text-white">
                Powered by GymStars
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedScore && (
        <ScoreModal
          score={selectedScore}
          onClose={() => setSelectedScore(null)}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

function ScoreModal({
  score,
  onClose,
  isAdmin,
}: {
  score: any;
  onClose: () => void;
  isAdmin: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDScore, setEditDScore] = useState(String(score.dScore || ""));
  const [editEScore, setEditEScore] = useState(String(score.eScore || ""));
  const [statusMsg, setStatusMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const [selectedVault, setSelectedVault] = useState<1 | 2>(1);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "scores", score.id));
      onClose();
    } catch (e: any) {
      setStatusMsg({ text: "Erro ao apagar: " + e.message, type: "error" });
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const d = parseFloat(editDScore) || 0;
      const e = parseFloat(editEScore) || 0;
      await updateDoc(doc(db, "scores", score.id), {
        dScore: d,
        eScore: e,
        finalScore: d + e,
      });
      setIsEditing(false);
      onClose();
    } catch (err: any) {
      setStatusMsg({
        text: "Erro ao editar nota: " + err.message,
        type: "error",
      });
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#070F1C] border border-white/5 p-6 sm:p-8 rounded-2xl flex-shrink-0 break-words relative shadow-2xl overflow-y-auto max-h-[90dvh]"
        style={{ width: "90%", maxWidth: "512px" }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 sm:right-6 sm:top-6 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors z-10"
        >
          <XCircle className="w-6 h-6" />
        </button>

        {statusMsg && (
          <div
            className={`p-4 mb-4 rounded-xl text-sm font-bold border transition-all ${
              statusMsg.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {statusMsg.text}
          </div>
        )}
        <div className="mb-6 mt-4 sm:mt-0">
          <div className="text-[10px] text-yellow-500 font-bold mb-2 uppercase tracking-widest bg-yellow-500/10 px-2 py-1 rounded w-max">
            {score.category}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tighter mb-1">
            {score.gymnastName}
          </h2>
          <div className="text-slate-400 text-xs sm:text-sm">
            {score.team || "Independente"}
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-2 gap-4 mb-8 bg-black/40 p-4 rounded-2xl border border-indigo-500/30">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Nota D
              </label>
              <input
                type="number"
                step="0.1"
                value={editDScore}
                onChange={(e) => setEditDScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Nota E
              </label>
              <input
                type="number"
                step="0.1"
                value={editEScore}
                onChange={(e) => setEditEScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div className="col-span-2 flex gap-2 mt-2">
              <button
                onClick={handleSaveEdit}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg flex-1 text-sm"
              >
                Salvar Nota
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : score.vtDetails && score.category === "VT" ? (
          <>
            {/* VT FINALS DISPLAY */}
            <div className="mb-8">
              <div className="bg-gradient-to-br from-[#009c3b]/20 to-green-900/20 shadow-inner border border-[#009c3b]/30 p-6 rounded-2xl text-center mb-6">
                <div className="text-xs text-[#009c3b] font-black uppercase tracking-widest mb-2">
                  Nota Média (Total)
                </div>
                <div className="text-4xl font-mono font-black text-white leading-none">
                  {score.finalScore?.toFixed(3)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setSelectedVault(1)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selectedVault === 1
                      ? "bg-slate-800 border-indigo-500 shadow-md shadow-indigo-900/20"
                      : "bg-black/40 border-white/5 hover:bg-slate-900"
                  }`}
                >
                  <div className="text-[10px] text-slate-400 uppercase mb-2 font-bold">
                    Salto 1
                  </div>
                  <div className="font-mono text-sm text-white flex flex-col gap-1">
                    <div>
                      <span className="text-slate-400 font-sans text-xs">
                        D:
                      </span>{" "}
                      {score.vtDetails.vault1?.dScore?.toFixed(3)}
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans text-xs">
                        E:
                      </span>{" "}
                      {score.vtDetails.vault1?.eScore?.toFixed(3)}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedVault(2)}
                  disabled={!score.vtDetails.vault2}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    !score.vtDetails.vault2
                      ? "opacity-50 cursor-not-allowed bg-black/20 border-white/5"
                      : selectedVault === 2
                        ? "bg-slate-800 border-indigo-500 shadow-md shadow-indigo-900/20"
                        : "bg-black/40 border-white/5 hover:bg-slate-900"
                  }`}
                >
                  <div className="text-[10px] text-slate-400 uppercase mb-2 font-bold">
                    Salto 2
                  </div>
                  {score.vtDetails.vault2 ? (
                    <div className="font-mono text-sm text-white flex flex-col gap-1">
                      <div>
                        <span className="text-slate-400 font-sans text-xs">
                          D:
                        </span>{" "}
                        {score.vtDetails.vault2.dScore?.toFixed(3)}
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans text-xs">
                          E:
                        </span>{" "}
                        {score.vtDetails.vault2.eScore?.toFixed(3)}
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-sm text-slate-600 italic mt-2">
                      Pendente
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-black text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                Deduções Aplicadas{" "}
                <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                  SALTO {selectedVault}
                </span>
              </h4>
              {(() => {
                const currentVaultDetails =
                  selectedVault === 1
                    ? score.vtDetails.vault1
                    : score.vtDetails.vault2;
                const deductions = currentVaultDetails?.deductions || [];
                return !deductions.length ? (
                  <div className="text-slate-600 text-sm font-mono bg-white/5 p-3 rounded-xl">
                    Nenhuma dedução registrada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deductions.map((d: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-black/40 border border-white/5 px-4 py-2 text-sm rounded-xl"
                      >
                        <span className="text-slate-300 font-medium">
                          {d.label}
                        </span>
                        <span className="font-mono font-bold text-red-500">
                          -{d.value?.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </>
        ) : (
          <>
            {/* STANDARD DISPLAY */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-black/40 border border-white/5 p-4 rounded-2xl text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">
                  Nota D
                </div>
                <div className="text-2xl font-mono text-white leading-none">
                  {score.dScore?.toFixed(3)}
                </div>
              </div>
              <div className="bg-black/40 border border-white/5 p-4 rounded-2xl text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">
                  Nota E
                </div>
                <div className="text-2xl font-mono text-white leading-none">
                  {score.eScore?.toFixed(3)}
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#009c3b]/20 to-green-900/20 shadow-inner border border-[#009c3b]/30 p-4 rounded-2xl text-center">
                <div className="text-[10px] text-[#009c3b] font-black uppercase mb-2">
                  Total
                </div>
                <div className="text-2xl font-mono font-black text-white leading-none">
                  {score.finalScore?.toFixed(3)}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">
                Deduções Aplicadas
              </h4>
              {!score.deductions?.length && (
                <div className="text-slate-600 text-sm font-mono bg-white/5 p-3 rounded-xl">
                  Nenhuma dedução registrada.
                </div>
              )}
              <div className="space-y-2">
                {score.deductions?.map((d: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-black/40 border border-white/5 px-4 py-2 text-sm rounded-xl"
                  >
                    <span className="text-slate-300 font-medium">
                      {d.label}
                    </span>
                    <span className="font-mono font-bold text-red-500">
                      -{d.value?.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="text-xs text-slate-500 flex justify-between items-end border-t border-slate-800 pt-6 mt-6">
          <div>
            Árbitro responsável:
            <br />
            <span className="text-slate-300 font-medium mt-1 inline-block">
              {score.refereeName || "Sistema"}
            </span>
          </div>
          {isAdmin && (
            <div className="flex gap-4">
              {isConfirmingDelete ? (
                <>
                  <button
                    onClick={handleDelete}
                    className="text-red-500 font-bold uppercase tracking-wider text-[10px]"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setIsConfirmingDelete(false)}
                    className="text-slate-400 hover:text-white font-bold uppercase tracking-wider text-[10px]"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider text-[10px]"
                    >
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="text-red-500 hover:text-red-400 font-bold uppercase tracking-wider text-[10px]"
                  >
                    Apagar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
