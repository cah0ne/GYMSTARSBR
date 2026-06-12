import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { UserData } from "../App";
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "../lib/firebase";
import {
  Plus,
  Calendar,
  Activity,
  CheckCircle2,
  Pencil,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CompetitionsPage() {
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const isAdmin = userData?.tag === "Admin";

  const [competitions, setCompetitions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [newComp, setNewComp] = useState({
    name: "",
    type: "Qualificatórias",
    date: "",
    time: "",
    status: "futura",
  });

  useEffect(() => {
    const q = query(
      collection(db, "competitions"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setCompetitions(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      );
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      if (editingCompId) {
        // Edit mode
        await updateDoc(doc(db, "competitions", editingCompId), {
          ...newComp,
          updatedAt: Date.now(),
        });
        await addDoc(collection(db, "notifications"), {
          message: `Competição atualizada pelo administrador: ${newComp.name}`,
          type: "info",
          createdAt: Date.now(),
        });
        setStatusMsg({
          text: "Competição atualizada com sucesso!",
          type: "success",
        });
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        // Create mode
        await addDoc(collection(db, "competitions"), {
          ...newComp,
          createdAt: Date.now(),
        });
        // push notification
        await addDoc(collection(db, "notifications"), {
          title: "Nova Competição!",
          message: `Uma nova competição foi cadastrada: ${newComp.name}`,
          type: "live",
          link: "/competitions",
          createdAt: Date.now(),
          senderId: userData?.uid,
        });
        setStatusMsg({
          text: "Competição criada com sucesso!",
          type: "success",
        });
        setTimeout(() => setStatusMsg(null), 4000);
      }
      setShowModal(false);
      setEditingCompId(null);
      setNewComp({
        name: "",
        type: "Qualificatórias",
        date: "",
        time: "",
        status: "futura",
      });
    } catch (err) {
      console.error(err);
      setStatusMsg({
        text: "Erro ao salvar competição: " + (err as any).message,
        type: "error",
      });
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  const handleEditClick = (c: any) => {
    setEditingCompId(c.id);
    setNewComp({
      name: c.name || "",
      type: c.type || "Qualificatórias",
      date: c.date || "",
      time: c.time || "",
      status: c.status || "futura",
    });
    setShowModal(true);
  };

  const executeDelete = async (id: string, name: string) => {
    if (!isAdmin) return;
    try {
      const allUsersSnap = await getDocs(collection(db, "users"));
      for (const uDoc of allUsersSnap.docs) {
        const uData = uDoc.data();
        if (!uData.badges) continue;

        const toRemove = uData.badges.filter(
          (b: any) =>
            (typeof b === "object" && b.competitionId === id) ||
            (typeof b === "string"
              ? b.endsWith(` - ${name}`)
              : b.name?.endsWith(` - ${name}`)),
        );

        if (toRemove.length > 0) {
          const newBadges = uData.badges.filter(
            (b: any) => !toRemove.includes(b),
          );
          const medals = {
            ...(uData.medals || { gold: 0, silver: 0, bronze: 0 }),
          };

          toRemove.forEach((b: any) => {
            const bName = typeof b === "string" ? b : b.name;
            if (bName.startsWith("Ouro") || bName.startsWith("🥇"))
              medals.gold = Math.max(0, (medals.gold || 0) - 1);
            if (bName.startsWith("Prata") || bName.startsWith("🥈"))
              medals.silver = Math.max(0, (medals.silver || 0) - 1);
            if (bName.startsWith("Bronze") || bName.startsWith("🥉"))
              medals.bronze = Math.max(0, (medals.bronze || 0) - 1);
          });

          await updateDoc(doc(db, "users", uDoc.id), {
            badges: newBadges,
            medals,
          });
        }
      }

      await deleteDoc(doc(db, "competitions", id));
      await addDoc(collection(db, "notifications"), {
        message: `Competição excluída pelo administrador: ${name}`,
        type: "warning",
        createdAt: Date.now(),
      });
      setStatusMsg({
        text: "Competição excluída com sucesso!",
        type: "success",
      });
      setTimeout(() => setStatusMsg(null), 4000);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      setStatusMsg({
        text: "Erro ao excluir competição: " + (err as any).message,
        type: "error",
      });
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "ao vivo")
      return "text-green-400 bg-green-500/10 border-green-500/50";
    if (status === "encerrada")
      return "text-neutral-500 bg-black border-neutral-800";
    return "text-white bg-white/5 border-white/20";
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-2">
            Competições
          </h1>
          <p className="text-neutral-400 font-mono text-xs uppercase tracking-widest pl-1">
            // Eventos e rankings
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingCompId(null);
              setNewComp({
                name: "",
                type: "Qualificatórias",
                date: "",
                time: "",
                status: "futura",
              });
              setShowModal(true);
            }}
            className="group flex items-center gap-3 bg-white text-black px-6 py-3 rounded-none font-bold uppercase tracking-widest text-xs hover:bg-green-400 transition-colors relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" /> 
            <span>CRIAR EVENTO</span>
          </button>
        )}
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {competitions.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, ease: "easeOut" }}
            className="relative group flex flex-col h-full"
          >
            <Link
              to={`/competitions/${c.id}`}
              className={`block bg-transparent border-t-2 border-b-2 border-neutral-800 p-6 hover:border-white transition-colors h-full flex flex-col relative overflow-hidden ${isAdmin ? "pb-20" : "pb-6"}`}
            >
              {/* Subtle grid background on hover */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-0 group-hover:opacity-10 transition-opacity mix-blend-overlay"></div>
              
              <div className="flex justify-between items-start mb-6 z-10">
                <span
                  className={`px-3 py-1 font-mono text-[10px] uppercase font-black tracking-[0.2em] border ${getStatusColor(c.status)}`}
                >
                  {c.status === "ao vivo" ? "AO VIVO" : c.status === "encerrada" ? "ENCERRADA" : "FUTURA"}
                </span>
                <span className="text-[10px] font-mono text-neutral-400 border border-neutral-800 px-2.5 py-1 tracking-widest uppercase">
                  {c.type}
                </span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 flex-1 leading-none text-neutral-100 group-hover:text-white transition-colors z-10 w-4/5">
                {c.name}
              </h2>
              <div className="flex items-center gap-4 text-xs font-mono text-neutral-500 mt-4 border-t border-neutral-900 pt-4 z-10">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full"></span>
                  {c.date
                    ? format(new Date(c.date + "T12:00:00"), "dd.MM.yyyy", {
                        locale: ptBR,
                      })
                    : "--.--.----"}
                </span>
                {c.time && (
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full"></span>
                    {c.time}
                  </span>
                )}
              </div>
            </Link>

            {isAdmin && (
              <div className="absolute bottom-6 left-6 right-6 flex justify-end items-center gap-2 z-20">
                {deleteConfirmId === c.id ? (
                  <div className="flex gap-2 items-center bg-black px-3 py-1.5 border border-red-500/50">
                    <span className="text-[10px] text-red-500 font-mono font-bold uppercase tracking-widest mr-2">
                      Confirmar?
                    </span>
                    <button
                      onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         executeDelete(c.id, c.name);
                      }}
                      className="text-white hover:text-red-400 font-mono text-[10px] font-bold uppercase cursor-pointer transition-colors"
                    >
                      Sim
                    </button>
                    <span className="text-neutral-700">/</span>
                    <button
                      onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setDeleteConfirmId(null);
                      }}
                      className="text-neutral-400 hover:text-white font-mono text-[10px] font-bold uppercase cursor-pointer transition-colors"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         handleEditClick(c);
                      }}
                      className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white px-3 py-1 border border-neutral-800 hover:border-neutral-500 bg-black cursor-pointer transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setDeleteConfirmId(c.id);
                      }}
                      className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-500/70 hover:text-red-500 px-3 py-1 border border-red-900/30 hover:border-red-500/50 bg-black cursor-pointer transition-colors"
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        ))}
        {competitions.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center justify-center">
             <div className="text-neutral-800 font-mono text-sm tracking-widest mb-2">[SEM_EVENTOS]</div>
             <div className="text-neutral-500 font-mono text-xs max-w-sm">
                Nenhuma competição cadastrada no momento. Crie um novo evento para iniciar.
             </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex-shrink-0 break-words shadow-2xl space-y-4"
            style={{ width: "90%", maxWidth: "450px" }}
          >
            <h2 className="text-xl font-bold mb-4">
              {editingCompId ? "Editar Competição" : "Nova Competição"}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Nome
                </label>
                <input
                  required
                  value={newComp.name}
                  onChange={(e) =>
                    setNewComp({ ...newComp, name: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Tipo
                </label>
                <select
                  value={newComp.type}
                  onChange={(e) =>
                    setNewComp({ ...newComp, type: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white"
                >
                  <option>Qualificatórias</option>
                  <option>Trials</option>
                  <option>Final AA</option>
                  <option>Final TF</option>
                  <option>Finais</option>
                  <option>Finais VT</option>
                  <option>Finais UB</option>
                  <option>Finais BB</option>
                  <option>Finais FX</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-neutral-400 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={newComp.date}
                    onChange={(e) =>
                      setNewComp({ ...newComp, date: e.target.value })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-neutral-400 mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={newComp.time}
                    onChange={(e) =>
                      setNewComp({ ...newComp, time: e.target.value })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Status
                </label>
                <select
                  value={newComp.status}
                  onChange={(e) =>
                    setNewComp({ ...newComp, status: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="futura">Futura</option>
                  <option value="ao vivo">Ao Vivo</option>
                  <option value="encerrada">Encerrada</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCompId(null);
                    setNewComp({
                      name: "",
                      type: "Qualificatórias",
                      date: "",
                      time: "",
                      status: "futura",
                    });
                  }}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
