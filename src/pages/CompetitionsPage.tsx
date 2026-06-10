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
      return "text-red-500 bg-red-500/10 border-red-500/20";
    if (status === "encerrada")
      return "text-slate-400 bg-slate-800 border-slate-700";
    return "text-blue-400 bg-blue-500/10 border-blue-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            Competições
          </h1>
          <p className="text-neutral-400">
            Acompanhe todos os eventos de ginástica.
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
            className="flex items-center gap-2 bg-[#009c3b] hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors w-fit shadow-lg shadow-green-950/20"
          >
            <Plus className="w-5 h-5" /> Criar Competição
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitions.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative group flex flex-col h-full"
          >
            <Link
              to={`/competitions/${c.id}`}
              className={`block bg-slate-900 border border-neutral-800 p-5 rounded-2xl hover:border-green-500/50 transition-colors h-full flex flex-col ${isAdmin ? "pb-16" : "pb-5"}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${getStatusColor(c.status)}`}
                >
                  {c.status}
                </span>
                <span className="text-xs font-medium text-slate-500 bg-black/40 px-2.5 py-1 rounded-md">
                  {c.type}
                </span>
              </div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter mb-2 flex-1">
                {c.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-neutral-400 mt-4">
                <Calendar className="w-4 h-4" />
                <span>
                  {c.date
                    ? format(new Date(c.date + "T12:00:00"), "dd/MM/yyyy", {
                        locale: ptBR,
                      })
                    : "Data não definida"}
                  {c.time ? ` às ${c.time}` : ""}
                </span>
              </div>
            </Link>

            {isAdmin && (
              <div className="absolute bottom-4 left-5 right-5 flex justify-end items-center gap-2 border-t border-slate-800/40 pt-3">
                {deleteConfirmId === c.id ? (
                  <div className="flex gap-1.5 items-center bg-slate-950 px-2 py-1 rounded-lg border border-red-500/30">
                    <span className="text-[10px] text-red-400 font-extrabold mr-0.5">
                      Excluir?
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        executeDelete(c.id, c.name);
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-[10px] font-extrabold transition-colors cursor-pointer"
                    >
                      Sim
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteConfirmId(null);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-350 px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer"
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
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-slate-700 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-indigo-400" /> Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteConfirmId(c.id);
                      }}
                      className="flex items-center gap-1 bg-red-950/40 hover:bg-red-900/50 text-red-400 hover:text-red-350 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-900/30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        ))}
        {competitions.length === 0 && (
          <div className="col-span-full py-12 text-center text-neutral-500">
            Nenhuma competição cadastrada no momento.
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
