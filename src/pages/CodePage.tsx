import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { UserData } from "../App";
import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "../lib/firebase";
import { BookOpen, Plus } from "lucide-react";
import { motion } from "motion/react";

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [clicked, setClicked] = React.useState(false);
  React.useEffect(() => {
    if (clicked) {
      const timer = setTimeout(() => setClicked(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [clicked]);

  if (clicked) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
          setClicked(false);
        }}
        className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold uppercase transition shrink-0"
      >
        Confirmar?
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setClicked(true);
      }}
      className="text-xs bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-3 py-1.5 border border-red-500/20 rounded-lg font-bold uppercase transition shrink-0"
    >
      Excluir
    </button>
  );
}

export default function CodePage() {
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const isAdmin = userData?.tag === "Admin";
  const [contents, setContents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState({
    title: "",
    text: "",
    photoUrl: "",
    link: "",
  });

  useEffect(() => {
    const q = query(
      collection(db, "appContent"),
      where("type", "==", "codigo"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) =>
      setContents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    );
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      if (editingItemId) {
        await updateDoc(doc(db, "appContent", editingItemId), {
          title: newContent.title,
          text: newContent.text,
          photoUrl: newContent.photoUrl,
          link: newContent.link,
        });
        setEditingItemId(null);
      } else {
        await addDoc(collection(db, "appContent"), {
          ...newContent,
          type: "codigo",
          createdAt: Date.now(),
        });
        await addDoc(collection(db, "notifications"), {
          message: `Novo Código adicionado: ${newContent.title}`,
          type: "info",
          createdAt: Date.now(),
        });
      }
      setShowModal(false);
      setNewContent({ title: "", text: "", photoUrl: "", link: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, "appContent", id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
        <div className="flex items-center gap-4">
          <BookOpen className="w-10 h-10 text-emerald-500" />
          <div>
            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
              Código de Pontuação
            </h1>
            <p className="text-emerald-400 font-medium">
              Regras Oficiais e Critérios de Avaliação
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingItemId(null);
              setNewContent({ title: "", text: "", photoUrl: "", link: "" });
              setShowModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="grid gap-6">
        {contents.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl"
          >
            <div className="flex justify-between items-start gap-4 mb-2">
              <h2 className="text-2xl font-bold text-white break-words">{item.title}</h2>
              {isAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingItemId(item.id);
                      setNewContent({
                        title: item.title,
                        text: item.text || "",
                        photoUrl: item.photoUrl || "",
                        link: item.link || "",
                      });
                      setShowModal(true);
                    }}
                    className="text-xs bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white px-3 py-1.5 border border-emerald-500/20 rounded-lg font-bold uppercase transition"
                  >
                    Editar
                  </button>
                  <DeleteButton onDelete={() => handleDelete(item.id)} />
                </div>
              )}
            </div>
            <p className="text-slate-400 whitespace-pre-wrap">{item.text}</p>
            {item.photoUrl && (
              <img
                src={item.photoUrl}
                alt="Visual"
                className="mt-4 rounded-lg max-h-64 object-cover"
              />
            )}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-4 text-emerald-400 hover:underline"
              >
                Link para material de apoio
              </a>
            )}
          </motion.div>
        ))}
        {contents.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            Ainda não há conteúdo cadastrado.
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
            <h2 className="text-xl font-bold mb-4">{editingItemId ? "Editar Código" : "Adicionar Código"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Título
                </label>
                <input
                  required
                  value={newContent.title}
                  onChange={(e) =>
                    setNewContent({ ...newContent, title: e.target.value })
                  }
                  className="w-full bg-black/40 border border-neutral-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Texto (opcional)
                </label>
                <textarea
                  rows={4}
                  value={newContent.text}
                  onChange={(e) =>
                    setNewContent({ ...newContent, text: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  URL da Foto (opcional)
                </label>
                <input
                  type="url"
                  value={newContent.photoUrl}
                  onChange={(e) =>
                    setNewContent({ ...newContent, photoUrl: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Link externo (opcional)
                </label>
                <input
                  type="url"
                  value={newContent.link}
                  onChange={(e) =>
                    setNewContent({ ...newContent, link: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-neutral-400 hover:text-white px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 px-6 py-2 rounded-lg font-bold text-white"
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
