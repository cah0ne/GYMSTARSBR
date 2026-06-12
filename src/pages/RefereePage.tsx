import { useState, useEffect, useRef, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { UserData } from "../App";
import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  setDoc,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  updateDoc,
} from "../lib/firebase";
import {
  unlockGlobalAudio,
  processAudioCommand,
} from "../components/GlobalAudioListener";
import {
  Play,
  Square,
  Save,
  Activity,
  ShieldAlert,
  ChevronDown,
  Check,
  Search,
  User,
} from "lucide-react";
import clsx from "clsx";

const CATEGORIES = ["VT", "UB", "BB", "FX"];
const DEDUCTIONS = [0.1, 0.3, 0.5, 1.0];

export default function RefereePage() {
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  if (userData?.tag !== "Árbitro" && userData?.tag !== "Admin") {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Acesso restrito.
      </div>
    );
  }

  const [competitions, setCompetitions] = useState<any[]>([]);
  const [gymnasts, setGymnasts] = useState<any[]>([]);

  const [selectedCompId, setSelectedCompId] = useState("");
  const [selectedGymnastId, setSelectedGymnastId] = useState("");
  const [selectedCat, setSelectedCat] = useState("VT");

  const [isCompOpen, setIsCompOpen] = useState(false);
  const [isGymnastOpen, setIsGymnastOpen] = useState(false);
  const [compSearch, setCompSearch] = useState("");
  const [gymnastSearch, setGymnastSearch] = useState("");

  const compRef = useRef<HTMLDivElement>(null);
  const gymnastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (compRef.current && !compRef.current.contains(event.target as Node)) {
        setIsCompOpen(false);
      }
      if (
        gymnastRef.current &&
        !gymnastRef.current.contains(event.target as Node)
      ) {
        setIsGymnastOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredCompetitions = useMemo(() => {
    return competitions.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(compSearch.toLowerCase()) ||
        (c.type || "").toLowerCase().includes(compSearch.toLowerCase()),
    );
  }, [competitions, compSearch]);

  const filteredGymnasts = useMemo(() => {
    return gymnasts.filter(
      (g) =>
        (g.competitionName || g.username || "")
          .toLowerCase()
          .includes(gymnastSearch.toLowerCase()) ||
        (g.club || "").toLowerCase().includes(gymnastSearch.toLowerCase()),
    );
  }, [gymnasts, gymnastSearch]);

  const [isLive, setIsLive] = useState(false);
  const [dScore, setDScore] = useState<string>("");
  const [globalSfx, setGlobalSfx] = useState(
    "https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3",
  );
  const [deductions, setDeductions] = useState<
    { value: number; label: string }[]
  >([]);
  const [customDeduction, setCustomDeduction] = useState("");
  const [statusMsg, setStatusMsg] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [vault1DocId, setVault1DocId] = useState<string | null>(null);

  // VT specific
  const [vaultScores, setVaultScores] = useState<any[]>([]);

  useEffect(() => {
    // Load active competitions
    const cq = query(
      collection(db, "competitions"),
      where("status", "==", "ao vivo"),
    );
    const unsubC = onSnapshot(cq, (snap) =>
      setCompetitions(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      ),
    );

    // Load gymnasts (users with Ginasta tag)
    const gq = query(collection(db, "users"), where("tag", "==", "Ginasta"));
    const unsubG = onSnapshot(gq, (snap) =>
      setGymnasts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    );

    // Load global settings for beep
    const unsubS = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const val = snap.data().sfxUrl;
        if (val) setGlobalSfx(val);
      }
    });

    return () => {
      unsubC();
      unsubG();
      unsubS();
    };
  }, []);

  const eScore = 10.0 - deductions.reduce((acc, curr) => acc + curr.value, 0);
  const dVal = parseFloat((dScore || "").replace(",", ".")) || 0;
  const finalScore = dVal + eScore;

  const currentGymnast = gymnasts.find((g) => g.id === selectedGymnastId);
  const comp = competitions.find((c) => c.id === selectedCompId);

  const notifyScoreInChat = async (
    gymnastName: string,
    rawScore: number,
    category: string,
    suffix = "",
    gymnastPhotoURL?: string,
  ) => {
    try {
      const roomsSnap = await getDocs(collection(db, "chat_rooms"));
      const formattedScore =
        typeof rawScore === "number" ? rawScore.toFixed(3) : rawScore;
      const text = `📊 **RESULTADO EM TEMPO REAL!${suffix ? ` (${suffix})` : ""}**\n\n🤸‍♂️ **Ginasta:** ${gymnastName}\n🎯 **Categoria:** ${category}\n⭐ **Nota:** ${formattedScore}`;

      const promises: any[] = [];
      roomsSnap.forEach((roomDoc) => {
        const roomId = roomDoc.id;
        promises.push(
          addDoc(collection(db, "chat_messages"), {
            channelId: roomId,
            senderId: "system",
            senderName: "Arbitragem 📣",
            senderTag: "Arbitragem",
            senderPhotoURL: gymnastPhotoURL || null,
            senderColor: "#009c3b",
            text: text,
            createdAt: Date.now(),
            reactions: {},
            isAnnouncement: true,
            isReported: false,
            pinned: false,
            replyToId: null,
            replyToName: null,
            replyToText: null,
          }).then(() => {
            return updateDoc(doc(db, "chat_rooms", roomId), {
              lastMessageText: `📢 [Resultado] ${gymnastName} - ${category}: ${formattedScore}`,
              lastMessageAt: Date.now(),
              lastMessageAuthorName: "Arbitragem",
            });
          }),
        );
      });
      await Promise.all(promises);
    } catch (err) {
      console.error("Erro ao enviar resultado ao chat:", err);
    }
  };

  const handleBeep = async () => {
    // Force immediate local audio context unlock via user gesture boundary
    unlockGlobalAudio();
    try {
      const data = { action: "beep", url: globalSfx, updatedAt: Date.now() };
      await setDoc(doc(db, "liveCommand", "audio"), data);
    } catch (e: any) {
      console.error("Error triggering beep:", e);
      setStatusMsg({
        text: "Erro ao tocar beep: " + (e.message || "Erro desconhecido"),
        type: "error",
      });
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const handleStopMusic = async () => {
    try {
      const data = { action: "stop_music", updatedAt: Date.now() };
      await setDoc(doc(db, "liveCommand", "audio"), data);
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

  const startLive = async () => {
    // Force immediate local audio context unlock via user gesture boundary
    unlockGlobalAudio();

    if (!selectedCompId || !selectedGymnastId) {
      setStatusMsg({
        text: "Selecione competição e ginasta antes de iniciar.",
        type: "error",
      });
      setTimeout(() => setStatusMsg(null), 5000);
      return;
    }

    try {
      // Update live singleton
      await setDoc(
        doc(db, "livePerformances", selectedCompId + "_" + selectedCat),
        {
          competitionId: selectedCompId,
          category: selectedCat,
          gymnastId: selectedGymnastId,
          gymnastName:
            currentGymnast?.competitionName || currentGymnast?.username,
          team: currentGymnast?.team || null,
          musicBase64: currentGymnast?.musicBase64 || null,
          sfxUrl: currentGymnast?.sfxUrl || null,
          updatedAt: Date.now(),
        },
      );

      setIsLive(true);

      // Play music globally if there is any and category is FX
      if (selectedCat === "FX" && currentGymnast?.musicBase64) {
        try {
          const cmdData = {
            action: "play_music",
            url: currentGymnast.musicBase64,
            gymnastName:
              currentGymnast?.competitionName || currentGymnast?.username || "",
            team: currentGymnast?.team || "Independente",
            category: selectedCat,
            triggerBeep: false,
            updatedAt: Date.now(),
          };
          await setDoc(doc(db, "liveCommand", "audio"), cmdData);
        } catch (e) {
          console.log("Error triggering global music:", e);
        }
      }
      // Automations removed: The referee will manually click the beep button when desired.
    } catch (err: any) {
      console.error("Error starting live performance:", err);
      setStatusMsg({
        text: "Erro ao iniciar atleta em quadra: " + err.message,
        type: "error",
      });
      setTimeout(() => setStatusMsg(null), 8000);
    }
  };

  const endLive = async () => {
    setIsLive(false);
    try {
      await deleteDoc(
        doc(db, "livePerformances", selectedCompId + "_" + selectedCat),
      );
    } catch (err) {
      console.error("Error clearing live status", err);
    }

    // Stop music globally for everyone
    try {
      await setDoc(doc(db, "liveCommand", "audio"), {
        action: "stop_music",
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.error("Error stopping music on endLive:", e);
    }
  };

  const addDeduction = (val: number, label: string) => {
    setDeductions((prev) => [...prev, { value: val, label }]);
  };

  const removeDeduction = (index: number) => {
    setDeductions((prev) => prev.filter((_, i) => i !== index));
  };

  const saveScore = async () => {
    if (!comp) {
      setStatusMsg({
        text: "Competição não encontrada ou inválida.",
        type: "error",
      });
      setTimeout(() => setStatusMsg(null), 5000);
      return;
    }

    const isFinals =
      comp?.type &&
      typeof comp.type === "string" &&
      comp.type.includes("Finais");

    if (selectedCat === "VT" && isFinals && vault1DocId === null) {
      // Save Vault 1 to DB right now, but remain live to judge vault 2
      let totalV1 = eScore + dVal;
      try {
        const docRef = await addDoc(collection(db, "scores"), {
          competitionId: selectedCompId,
          gymnastId: selectedGymnastId,
          gymnastName:
            currentGymnast?.competitionName ||
            currentGymnast?.username ||
            "Ginasta Sem Nome",
          team: currentGymnast?.team || "Independente",
          category: selectedCat,
          dScore: dVal,
          eScore: eScore,
          finalScore: totalV1,
          deductions,
          vtDetails: {
            vault1: { dScore: dVal, eScore, deductions },
            vault2: null,
          },
          refereeName: userData?.username || "Árbitro",
          createdAt: Date.now(),
        });
        setVault1DocId(docRef.id);
        notifyScoreInChat(
          currentGymnast?.competitionName ||
            currentGymnast?.username ||
            "Ginasta Sem Nome",
          totalV1,
          "VT",
          "Salto 1",
          currentGymnast?.photoURL,
        );
        setVaultScores([{ dScore: dVal, eScore }]);
        setDScore("");
        setDeductions([]);
        setStatusMsg({
          text: "Salto 1 salvo e publicado! Avalie o Salto 2 agora.",
          type: "success",
        });
        setTimeout(() => setStatusMsg(null), 5000);
      } catch (err: any) {
        setStatusMsg({
          text: "Erro ao salvar Salto 1: " + (err.message || err),
          type: "error",
        });
        setTimeout(() => setStatusMsg(null), 8000);
      }
      return;
    }

    let finalDStr = dVal;
    let finalEStr = eScore;
    let totalScore = finalScore;
    let vtDetails = null;

    if (selectedCat === "VT" && isFinals && vault1DocId !== null) {
      vtDetails = {
        vault1: vaultScores[0],
        vault2: { dScore: dVal, eScore, deductions },
      };
      // Average
      const v1Total =
        vaultScores[0].dScore +
          vaultScores[0].eScore -
          vaultScores[0].deductions?.reduce(
            (acc: any, curr: any) => acc + curr.value,
            0,
          ) || 0;
      const deduct1 = vaultScores[0].deductions
        ? vaultScores[0].deductions.reduce((ac: any, c: any) => ac + c.value, 0)
        : 0;
      const v1Actual = vaultScores[0].dScore + vaultScores[0].eScore - deduct1;

      const deduct2 = deductions.reduce((ac, c) => ac + c.value, 0);
      const v2Actual = dVal + eScore - deduct2;
      totalScore = (v1Actual + v2Actual) / 2;

      try {
        await updateDoc(doc(db, "scores", vault1DocId), {
          vtDetails: vtDetails,
          dScore: finalDStr, // this saves the latest jump's D score, not ideal but mostly display
          eScore: finalEStr,
          finalScore: totalScore,
          deductions: deductions, // the latest deductions
        });
        await addDoc(collection(db, "notifications"), {
          title: "Média Publicada! 🤸‍♂️",
          message: `Médias consolidadas no Salto! ${currentGymnast?.competitionName || currentGymnast?.username || "Ginasta Sem Nome"} tirou ${totalScore.toFixed(3)}.`,
          type: "score",
          link: `/competitions/${selectedCompId}`,
          createdAt: Date.now(),
          senderId: userData?.uid,
        });
        notifyScoreInChat(
          currentGymnast?.competitionName ||
            currentGymnast?.username ||
            "Ginasta Sem Nome",
          totalScore,
          "VT",
          "Média VT",
          currentGymnast?.photoURL,
        );
        setStatusMsg({
          text: "Salto 2 publicado com sucesso! Média calculada.",
          type: "success",
        });
        setTimeout(() => setStatusMsg(null), 6000);
        endLive();
        setDScore("");
        setDeductions([]);
        setVaultScores([]);
        setVault1DocId(null);
        setSelectedGymnastId("");
      } catch (err: any) {
        setStatusMsg({
          text: "Erro ao salvar Salto 2: " + (err.message || err),
          type: "error",
        });
        setTimeout(() => setStatusMsg(null), 8000);
      }
      return; // end here
    }

    try {
      await addDoc(collection(db, "scores"), {
        competitionId: selectedCompId,
        gymnastId: selectedGymnastId,
        gymnastName:
          currentGymnast?.competitionName ||
          currentGymnast?.username ||
          "Ginasta Sem Nome",
        team: currentGymnast?.team || "Independente",
        category: selectedCat,
        dScore: finalDStr,
        eScore: finalEStr,
        finalScore: totalScore,
        deductions,
        vtDetails: vtDetails || null,
        refereeName: userData?.username || "Árbitro",
        createdAt: Date.now(),
      });

      await addDoc(collection(db, "notifications"), {
        title: "Nota Publicada! 📊",
        message: `Nova nota na categoria ${selectedCat}! ${currentGymnast?.competitionName || currentGymnast?.username || "Ginasta Sem Nome"} tirou ${totalScore.toFixed(3)}.`,
        type: "score",
        link: `/competitions/${selectedCompId}`,
        createdAt: Date.now(),
        senderId: userData?.uid,
      });

      notifyScoreInChat(
        currentGymnast?.competitionName ||
          currentGymnast?.username ||
          "Ginasta Sem Nome",
        totalScore,
        selectedCat,
        "",
        currentGymnast?.photoURL,
      );
      setStatusMsg({
        text: "Nota publicada com sucesso! Você pode iniciar uma nova avaliação.",
        type: "success",
      });
      setTimeout(() => setStatusMsg(null), 6000);
      endLive();
      setDScore("");
      setDeductions([]);
      setVaultScores([]);
      setVault1DocId(null);
      setSelectedGymnastId("");
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        text: "Erro ao salvar nota: " + (err.message || err),
        type: "error",
      });
      setTimeout(() => setStatusMsg(null), 8000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 italic uppercase tracking-tighter">
          <ShieldAlert className="w-8 h-8 text-[#009c3b]" /> Painel
          Administrativo
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          Gerencie competições ativas e deduções ao vivo.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm font-bold border transition-all ${
            statusMsg.type === "success"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : statusMsg.type === "info"
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Setup Panel */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-5">
          <h2 className="text-xs uppercase font-black tracking-widest text-slate-500 flex items-center justify-between">
            Configuração
            <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
          </h2>
          <div className="relative" ref={compRef}>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Competição (Ao Vivo)
            </label>
            <button
              type="button"
              disabled={isLive}
              onClick={() => {
                setIsCompOpen(!isCompOpen);
                setIsGymnastOpen(false);
              }}
              className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-white flex items-center justify-between text-left focus:outline-none focus:border-[#009c3b] disabled:opacity-50 transition-all font-sans text-sm select-none"
            >
              <span className="truncate font-bold">
                {comp ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#009c3b] animate-pulse"></span>
                    {comp.name}{" "}
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded">
                      {comp.type}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-500 font-medium">
                    Selecione uma competição...
                  </span>
                )}
              </span>
              <ChevronDown
                className={clsx(
                  "w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ml-2",
                  isCompOpen && "rotate-180",
                )}
              />
            </button>

            {isCompOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-72">
                {/* Search Header */}
                <div className="p-2.5 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1.5" />
                  <input
                    type="text"
                    placeholder="Buscar competição..."
                    value={compSearch}
                    onChange={(e) => setCompSearch(e.target.value)}
                    className="w-full bg-transparent border-0 text-xs text-white focus:outline-none placeholder-slate-500 py-1"
                    autoFocus
                  />
                </div>
                {/* Scrollable List */}
                <div className="overflow-y-auto max-h-56 custom-scrollbar p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCompId("");
                      setIsCompOpen(false);
                      setCompSearch("");
                    }}
                    className={clsx(
                      "w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                      !selectedCompId
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-900",
                    )}
                  >
                    <span>Limpar Seleção</span>
                    {!selectedCompId && (
                      <Check className="w-3.5 h-3.5 text-[#00a84c]" />
                    )}
                  </button>

                  <div className="border-t border-slate-900 my-1"></div>

                  {filteredCompetitions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-mono">
                      Nenhuma competição ativa encontrada
                    </div>
                  ) : (
                    filteredCompetitions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCompId(c.id);
                          setIsCompOpen(false);
                          setCompSearch("");
                        }}
                        className={clsx(
                          "w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold font-sans transition-all flex items-center justify-between gap-2.5 border",
                          selectedCompId === c.id
                            ? "bg-[#00a84c]/10 text-[#00a84c] border-[#00a84c]/30"
                            : "text-slate-300 hover:text-white hover:bg-slate-900 border-transparent",
                        )}
                      >
                        <div className="flex flex-col truncate">
                          <span className="truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">
                            Tipo: {c.type}
                          </span>
                        </div>
                        {selectedCompId === c.id && (
                          <Check className="w-3.5 h-3.5 text-[#00a84c] shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={gymnastRef}>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Ginasta
            </label>
            <button
              type="button"
              disabled={isLive}
              onClick={() => {
                setIsGymnastOpen(!isGymnastOpen);
                setIsCompOpen(false);
              }}
              className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-2.5 text-white flex items-center justify-between text-left focus:outline-none focus:border-[#009c3b] disabled:opacity-50 transition-all font-sans text-sm select-none"
            >
              <span className="truncate flex items-center gap-3">
                {currentGymnast ? (
                  <>
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {currentGymnast.photoURL ? (
                        <img
                          src={currentGymnast.photoURL || undefined}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-extrabold text-[#00a84c] tracking-tight">
                        {currentGymnast.competitionName ||
                          currentGymnast.username}
                      </span>
                      {currentGymnast.club && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {currentGymnast.club}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-slate-500 font-medium">
                    Selecione um ginasta...
                  </span>
                )}
              </span>
              <ChevronDown
                className={clsx(
                  "w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ml-2",
                  isGymnastOpen && "rotate-180",
                )}
              />
            </button>

            {isGymnastOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-72">
                {/* Search Header */}
                <div className="p-2.5 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1.5" />
                  <input
                    type="text"
                    placeholder="Buscar ginasta..."
                    value={gymnastSearch}
                    onChange={(e) => setGymnastSearch(e.target.value)}
                    className="w-full bg-transparent border-0 text-xs text-white focus:outline-none placeholder-slate-500 py-1"
                    autoFocus
                  />
                </div>
                {/* Scrollable List */}
                <div className="overflow-y-auto max-h-56 custom-scrollbar p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGymnastId("");
                      setIsGymnastOpen(false);
                      setGymnastSearch("");
                    }}
                    className={clsx(
                      "w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                      !selectedGymnastId
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-900",
                    )}
                  >
                    <span>Limpar Seleção</span>
                    {!selectedGymnastId && (
                      <Check className="w-3.5 h-3.5 text-[#00a84c]" />
                    )}
                  </button>

                  <div className="border-t border-slate-900 my-1"></div>

                  {filteredGymnasts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-mono">
                      Nenhum ginasta encontrado
                    </div>
                  ) : (
                    filteredGymnasts.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setSelectedGymnastId(g.id);
                          setIsGymnastOpen(false);
                          setGymnastSearch("");
                        }}
                        className={clsx(
                          "w-full text-left px-3 py-2 rounded-xl text-xs font-sans transition-all flex items-center justify-between gap-2.5 border",
                          selectedGymnastId === g.id
                            ? "bg-[#00a84c]/10 text-[#00a84c] border-[#00a84c]/30"
                            : "text-slate-300 hover:text-white hover:bg-slate-900 border-transparent",
                        )}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                            {g.photoURL ? (
                              <img
                                src={g.photoURL || undefined}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="font-extrabold truncate">
                              {g.competitionName || g.username}
                            </span>
                            {g.club && (
                              <span className="text-[9px] text-slate-500 truncate font-semibold uppercase">
                                {g.club}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedGymnastId === g.id && (
                          <Check className="w-3.5 h-3.5 text-[#00a84c] shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Aparelho / Categoria
            </label>
            <div className="flex flex-wrap gap-2 bg-black/40 p-1 w-max rounded-lg">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  disabled={isLive}
                  onClick={() => setSelectedCat(cat)}
                  className={clsx(
                    "px-4 py-1.5 rounded-md text-xs font-bold transition-colors",
                    selectedCat === cat
                      ? "bg-slate-700 text-white"
                      : "text-slate-500 hover:text-white bg-transparent",
                    isLive && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            {!isLive ? (
              <button
                onClick={startLive}
                disabled={!selectedCompId || !selectedGymnastId}
                className="flex-1 bg-[#009c3b] hover:bg-[#009c3b] text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" /> INICIAR
              </button>
            ) : (
              <button
                onClick={endLive}
                className="flex-1 bg-red-600/20 border border-red-500/50 hover:bg-red-600/40 text-red-500 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" /> PARAR
              </button>
            )}
            <button
              onClick={handleBeep}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center cursor-pointer"
            >
              BEEP
            </button>
            {selectedCat === "FX" && (
              <button
                onClick={handleStopMusic}
                className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-950/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                PARAR MÚSICA
              </button>
            )}
          </div>
        </div>

        {/* Scoring Panel */}
        <div
          className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border ${isLive ? "border-red-500/50 shadow-red-900/40" : "border-white/10"} shadow-2xl flex flex-col flex-1 relative transition-all`}
        >
          {isLive && (
            <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-3xl flex items-center gap-2 uppercase tracking-widest">
              <Activity className="w-3 h-3 animate-pulse" /> Em julgamento
            </div>
          )}
          <h3 className="text-lg font-bold mb-6 flex justify-between items-center text-white">
            Arbitragem Rápida
            <span className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded font-black tracking-widest uppercase">
              MODO {userData?.tag}
            </span>
          </h3>

          <div className="space-y-5">
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold mb-2 block">
                Dificuldade (D)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={dScore}
                onChange={(e) => setDScore(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-xl font-mono focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold mb-2 block">
                Deduções de Execução (E)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DEDUCTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => addDeduction(d, `Erro Técnico ${d}`)}
                    className={clsx(
                      "py-2 rounded-lg text-sm font-mono border transition-colors",
                      d >= 1.0
                        ? "bg-red-900/20 hover:bg-red-900/40 border-red-800/50 text-red-400"
                        : "bg-slate-700/50 hover:bg-slate-700 border-slate-600 text-white",
                    )}
                  >
                    - {d.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 relative group">
              <input
                type="number"
                step="0.1"
                placeholder="Outra (Ex: 0.2)"
                value={customDeduction}
                onChange={(e) => setCustomDeduction(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-slate-500"
              />
              <button
                onClick={() => {
                  if (customDeduction)
                    addDeduction(parseFloat(customDeduction), "Dedução Custom");
                  setCustomDeduction("");
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Add
              </button>
            </div>

            {deductions.length > 0 && (
              <div className="bg-black/20 rounded-xl p-3 border border-white/5 min-h-[4rem] max-h-32 overflow-y-auto">
                {deductions.map((d, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-xs mb-1"
                  >
                    <span className="text-slate-400">{d.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-mono">
                        -{d.value.toFixed(1)}
                      </span>
                      <button
                        onClick={() => removeDeduction(i)}
                        className="text-slate-600 hover:text-red-500 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-slate-400">Nota Dificuldade Atual</span>
                <span className="font-mono text-white">{dVal.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-slate-400">Nota Execução (Max 10)</span>
                <span className="font-mono text-white">
                  {eScore.toFixed(3)}
                </span>
              </div>
              <div className="h-px bg-slate-700/50 my-2"></div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#009c3b]">
                  Total Atual
                </span>
                <span className="text-3xl font-mono font-black text-white">
                  {finalScore.toFixed(3)}
                </span>
              </div>
            </div>

            <button
              onClick={saveScore}
              disabled={!isLive || !dScore}
              className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-yellow-400 transition-colors uppercase tracking-widest text-sm disabled:opacity-50 disabled:hover:bg-white flex flex-col items-center justify-center gap-1 leading-none shadow-lg shadow-white/10"
            >
              <span>
                {selectedCat === "VT" &&
                comp?.type?.includes("Finais") &&
                vault1DocId === null
                  ? "SALVAR SALTO 1"
                  : "PUBLICAR NOTA"}
              </span>
              {selectedCat === "VT" &&
                comp?.type?.includes("Finais") &&
                vault1DocId !== null && (
                  <span className="text-[10px] text-black/60 font-bold">
                    MÉDIA DOS 2 SALTOS
                  </span>
                )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
