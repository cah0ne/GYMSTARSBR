import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Sparkles,
  Heart,
  Image as ImageIcon,
  Smile,
  X,
  PlusCircle,
  AlertTriangle,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
} from "../lib/firebase";
import { UserData } from "../App";
import { RichTextEditor } from "../components/RichTextEditor";
import "quill/dist/quill.snow.css";

interface AboutItem {
  id: string;
  type: string;
  title: string;
  description: string;
  photoBase64?: string;
  photoUrl?: string;
  createdAt: number;
}

export default function AboutPage() {
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const isAdmin = userData?.tag === "Admin";

  const [items, setItems] = useState<AboutItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Social Media Links States
  const [socialLinks, setSocialLinks] = useState({
    tiktok: "",
    youtube: "",
    tiktokIcon: "",
    youtubeIcon: "",
  });
  const [formTiktok, setFormTiktok] = useState("");
  const [formYoutube, setFormYoutube] = useState("");
  const [formTiktokIcon, setFormTiktokIcon] = useState("");
  const [formYoutubeIcon, setFormYoutubeIcon] = useState("");
  const [tiktokUploadLoading, setTiktokUploadLoading] = useState(false);
  const [youtubeUploadLoading, setYoutubeUploadLoading] = useState(false);
  const [showSocialsModal, setShowSocialsModal] = useState(false);
  const [savingSocials, setSavingSocials] = useState(false);

  // Editor States
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AboutItem | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPhotoBase64, setFormPhotoBase64] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);

  // Load items from Database
  useEffect(() => {
    const q = query(
      collection(db, "appContent"),
      where("type", "==", "about_us_item"),
      orderBy("createdAt", "asc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docsData = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type || "about_us_item",
            title: data.title || "",
            description: data.description || "",
            photoBase64: data.photoBase64 || "",
            photoUrl: data.photoUrl || "",
            createdAt: Number(data.createdAt) || Date.now(),
          } as AboutItem;
        });
        // Sort client-side chronologically
        docsData.sort((a, b) => a.createdAt - b.createdAt);
        setItems(docsData);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar Quem Somos:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  // Load social media links
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "appContent", "social_media_links"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const links = {
            tiktok: data.tiktok || "",
            youtube: data.youtube || "",
            tiktokIcon: data.tiktokIcon || "",
            youtubeIcon: data.youtubeIcon || "",
          };
          setSocialLinks(links);
          setFormTiktok(data.tiktok || "");
          setFormYoutube(data.youtube || "");
          setFormTiktokIcon(data.tiktokIcon || "");
          setFormYoutubeIcon(data.youtubeIcon || "");
        }
      },
      (err) => {
        console.error("Erro ao carregar redes sociais:", err);
      },
    );

    return () => unsub();
  }, []);

  const handleSaveSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSocials(true);
    try {
      await setDoc(doc(db, "appContent", "social_media_links"), {
        type: "social_links",
        title: "Link de Mídias Sociais",
        tiktok: formTiktok.trim(),
        youtube: formYoutube.trim(),
        tiktokIcon: formTiktokIcon,
        youtubeIcon: formYoutubeIcon,
        createdAt: Date.now(),
      });
      setShowSocialsModal(false);
    } catch (err) {
      console.error("Erro ao salvar redes sociais:", err);
    } finally {
      setSavingSocials(false);
    }
  };

  const handleIconUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isTiktok: boolean,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isTiktok) setTiktokUploadLoading(true);
    else setYoutubeUploadLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDimension = 150; // High resolution icon
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/png", 1.0); // Transparent PNG
          if (isTiktok) {
            setFormTiktokIcon(compressed);
          } else {
            setFormYoutubeIcon(compressed);
          }
        }
        if (isTiktok) setTiktokUploadLoading(false);
        else setYoutubeUploadLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      if (isTiktok) setTiktokUploadLoading(false);
      else setYoutubeUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // Open modal for editing or adding
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormDesc("");
    setFormPhotoBase64("");
    setFormPhotoUrl("");
    setShowEditorModal(true);
  };

  const handleOpenEdit = (item: AboutItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDesc(item.description);
    setFormPhotoBase64(item.photoBase64 || "");
    setFormPhotoUrl(item.photoUrl || "");
    setShowEditorModal(true);
  };

  // Image upload compression
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDimension = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/png", 0.92);
          setFormPhotoBase64(compressed);
          setFormPhotoUrl("");
        }
        setUploadLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) return;

    setSavingLoading(true);
    try {
      const payload = {
        type: "about_us_item",
        title: formTitle.trim(),
        description: formDesc.trim(),
        photoBase64: formPhotoBase64 || null,
        photoUrl: formPhotoUrl.trim() || null,
        createdAt: editingItem ? editingItem.createdAt : Date.now(),
      };

      if (editingItem) {
        await updateDoc(doc(db, "appContent", editingItem.id), payload);
      } else {
        await addDoc(collection(db, "appContent"), payload);
      }
      setShowEditorModal(false);
    } catch (err) {
      console.error("Erro ao salvar Quem Somos:", err);
    } finally {
      setSavingLoading(false);
    }
  };

  // Delete section
  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta seção de 'Quem Somos'?"))
      return;
    try {
      await deleteDoc(doc(db, "appContent", id));
    } catch (err) {
      console.error("Erro ao excluir seção:", err);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-24 select-none">
        <span className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#009c3b]"></span>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 py-8 flex flex-col items-center font-sans animate-fadeIn">
      {/* Editorial Title Banner */}
      <div className="w-full max-w-2xl mx-auto text-center flex flex-col items-center gap-4 text-white">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full flex flex-col items-center gap-4"
        >
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Award className="w-3.5 h-3.5" />
            Nossa Jornada
          </div>
          <h1 className="w-full text-4xl sm:text-5xl font-black italic uppercase tracking-tighter leading-tight">
            Quem Somos
          </h1>
          {/* Social Links Block */}
          <div className="flex items-center gap-4 mt-3 justify-center">
            {socialLinks.tiktok && socialLinks.tiktokIcon ? (
              <a
                href={socialLinks.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 active:scale-95 transition duration-150 ease-in-out shrink-0 cursor-pointer"
                title="TikTok GymStars"
              >
                <img
                  src={socialLinks.tiktokIcon || undefined}
                  alt="TikTok"
                  className="w-12 h-12 md:w-14 md:h-14 object-contain rounded-xl hover:brightness-110 active:brightness-95"
                  draggable="false"
                />
              </a>
            ) : socialLinks.tiktok ? (
              <a
                href={socialLinks.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:scale-105 transition active:scale-95 cursor-pointer block"
                title="TikTok GymStars (Sem ícone customizado)"
              >
                TikTok
              </a>
            ) : null}

            {socialLinks.youtube && socialLinks.youtubeIcon ? (
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 active:scale-95 transition duration-150 ease-in-out shrink-0 cursor-pointer"
                title="YouTube GymStars"
              >
                <img
                  src={socialLinks.youtubeIcon || undefined}
                  alt="YouTube"
                  className="w-12 h-12 md:w-14 md:h-14 object-contain rounded-xl hover:brightness-110 active:brightness-95"
                  draggable="false"
                />
              </a>
            ) : socialLinks.youtube ? (
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:scale-105 transition active:scale-95 cursor-pointer block"
                title="YouTube GymStars (Sem ícone customizado)"
              >
                YouTube
              </a>
            ) : null}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowSocialsModal(true)}
                className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-full transition-all border border-indigo-500/20 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                title="Configurar Redes Sociais"
              >
                <Edit2 className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
        </motion.div>

        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-2 w-full flex justify-center"
          >
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-[#009c3b] hover:bg-[#008030] text-white font-extrabold text-xs uppercase px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-green-950/40 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Adicionar Nova Seção
            </button>
          </motion.div>
        )}
      </div>

      {/* Main Sections */}
      {items.length === 0 ? (
        <div className="w-full max-w-3xl mx-auto px-4 mt-12">
          <div className="w-full bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center justify-center gap-4">
            <Smile className="w-12 h-12 text-[#009c3b] animate-pulse shrink-0" />
            <h3 className="w-full text-xl font-bold text-slate-200">
              Em Construção
            </h3>
            <p className="w-full max-w-2xl mx-auto text-slate-400 text-sm leading-relaxed">
              As seções explicativas estão sendo escritas e editadas pelo
              administrador do site. Volte em breve para descobrir tudo sobre
              nós!
            </p>
            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-5 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Criar Primeira Seção
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl space-y-16 mt-12 flex flex-col items-stretch">
          {items.map((item, index) => {
            const hasImage = item.photoBase64 || item.photoUrl;
            const imgSrc = item.photoBase64 || item.photoUrl;
            const isEven = index % 2 === 0;

            return (
              <motion.section
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`w-full flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 lg:gap-14 items-stretch lg:items-center bg-slate-900/40 p-5 sm:p-8 rounded-3xl border border-slate-800`}
              >
                {/* Visual block */}
                {hasImage ? (
                  <div className="w-full lg:w-1/2 relative group shrink-0">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-[#009c3b] to-indigo-600 rounded-3xl blur opacity-15 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
                    <div className="h-64 sm:h-80 md:h-[340px] w-full rounded-2xl overflow-hidden border border-slate-800 bg-black relative">
                      <img
                        src={imgSrc || undefined}
                        alt={item.title}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        draggable="false"
                        onContextMenu={(e) => e.preventDefault()}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full lg:w-1/2 flex items-center justify-center p-12 bg-black/45 rounded-2xl border border-dashed border-slate-800/80 shrink-0 min-h-[200px]">
                    <Award className="w-20 h-20 text-slate-880" />
                  </div>
                )}

                {/* Content block */}
                <div className="w-full lg:w-1/2 min-w-0 flex flex-col justify-center space-y-4">
                  {/* Admin controls */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 bg-black/35 px-3 py-1.5 rounded-xl border border-slate-800 w-fit">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 hover:bg-slate-800 text-indigo-400 rounded transition-colors cursor-pointer"
                        title="Editar Seção"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-slate-800 text-red-400 rounded transition-colors cursor-pointer"
                        title="Excluir Seção"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug w-full">
                    {item.title}
                  </h2>

                  <div
                    className="text-slate-350 text-sm leading-relaxed font-sans w-full rich-text-content ql-editor !px-0"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                </div>
              </motion.section>
            );
          })}
        </div>
      )}

      {/* Editor Modal for Adding / Editing */}
      <AnimatePresence>
        {showEditorModal &&
          createPortal(
            <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 flex items-center justify-center p-4">
              {/* Click Shield to Dismiss */}
              <div
                className="absolute inset-0 w-full h-full cursor-pointer"
                onClick={() => setShowEditorModal(false)}
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="w-full max-w-lg mx-auto flex flex-col gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative z-10 text-left font-sans my-auto shrink-0"
              >
                <div className="w-full flex justify-between items-center border-b border-slate-800 pb-4 shrink-0">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#009c3b]" />
                    {editingItem ? "Editar Seção" : "Nova Seção"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowEditorModal(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={handleSave}
                  className="w-full flex flex-col space-y-4 font-sans text-sm"
                >
                  {/* Title */}
                  <div className="w-full flex flex-col space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Título da Seção
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Nossa Missão"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-[#009c3b] focus:outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div className="w-full flex flex-col space-y-1 quill-dark">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Texto / Descrição
                    </label>
                    <div className="bg-black/40 border border-slate-700 rounded-xl focus-within:border-[#009c3b]">
                      <RichTextEditor
                        value={formDesc}
                        onChange={setFormDesc}
                        placeholder="Escreva as diretrizes, missão ou história desta seção..."
                      />
                    </div>
                  </div>

                  {/* Photo Upload block */}
                  <div className="w-full flex flex-col space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Foto da Seção (PNG ou JPG)
                    </label>

                    {formPhotoBase64 ? (
                      <div className="w-full relative group border border-slate-800 rounded-2xl overflow-hidden bg-black h-36 flex items-center justify-center">
                        <img
                          src={formPhotoBase64 || undefined}
                          alt="Preview"
                          className="h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setFormPhotoBase64("")}
                          className="w-full absolute inset-0 bg-black/75 flex flex-col gap-1 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-5 h-5 text-red-500 mx-auto" />
                          <span className="text-[10px] text-white font-bold uppercase tracking-widest text-center">
                            Remover Imagem
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-center">
                        <label className="flex w-full flex-col items-center justify-center h-32 border border-slate-800 border-dashed rounded-2xl cursor-pointer bg-black/20 hover:bg-black/45 hover:border-slate-700 transition">
                          <div className="w-full flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-slate-500 mb-2 mx-auto" />
                            <p className="w-full text-center text-xs text-slate-400 font-bold px-2">
                              {uploadLoading
                                ? "Redimensionando..."
                                : "Selecionar foto"}
                            </p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                            disabled={uploadLoading}
                          />
                        </label>
                      </div>
                    )}

                    {/* Alt Image URL text box */}
                    <div className="w-full flex flex-col space-y-1 pt-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Ou insira o link direto
                      </span>
                      <input
                        type="url"
                        value={formPhotoUrl}
                        onChange={(e) => {
                          setFormPhotoUrl(e.target.value);
                          if (e.target.value) setFormPhotoBase64("");
                        }}
                        placeholder="https://exemplo.com/imagem.png"
                        className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-[#009c3b] focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="w-full flex flex-col gap-3 pt-6 border-t border-slate-800 shrink-0">
                    <button
                      type="submit"
                      disabled={savingLoading || uploadLoading}
                      className="w-full px-6 py-3.5 bg-[#009c3b] hover:bg-[#008030] text-white text-xs font-black uppercase rounded-xl transition-all disabled:opacity-50"
                    >
                      {savingLoading ? "Salvando..." : "Salvar e Publicar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditorModal(false)}
                      className="w-full px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-bold uppercase rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>,
            document.body,
          )}
      </AnimatePresence>

      {/* Social Links Modal */}
      <AnimatePresence>
        {showSocialsModal &&
          createPortal(
            <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 w-full h-full cursor-pointer"
                onClick={() => setShowSocialsModal(false)}
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="w-full max-w-lg mx-auto flex flex-col gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative z-10 text-left font-sans my-auto shrink-0"
              >
                <div className="w-full flex justify-between items-center border-b border-slate-800 pb-4 shrink-0">
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    Configurar Redes Sociais
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSocialsModal(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={handleSaveSocials}
                  className="w-full flex flex-col space-y-5 text-sm mt-2"
                >
                  {/* TikTok Config Group */}
                  <div className="w-full space-y-2.5 p-4 rounded-2xl bg-black/20 border border-slate-800">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400 block border-b border-slate-800 pb-1.5">
                      TikTok GymStars
                    </span>

                    {/* TikTok Link */}
                    <div className="w-full flex flex-col space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Link da Conta TikTok
                      </label>
                      <input
                        type="url"
                        value={formTiktok}
                        onChange={(e) => setFormTiktok(e.target.value)}
                        placeholder="https://tiktok.com/@gymstarsbr"
                        autoComplete="off"
                        className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* TikTok PNG Icon */}
                    <div className="w-full flex flex-col space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Ícone do TikTok (Upar PNG)
                      </label>

                      {formTiktokIcon ? (
                        <div className="flex items-center gap-4 bg-black/45 p-3 rounded-xl border border-slate-800">
                          <div className="relative w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-slate-800 p-1 shrink-0">
                            <img
                              src={formTiktokIcon || undefined}
                              alt="TikTok Icon Preview"
                              className="w-full h-full object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => setFormTiktokIcon("")}
                              className="absolute -top-1.5 -right-1.5 p-1 bg-red-650 hover:bg-red-500 rounded-full text-white cursor-pointer"
                              title="Remover"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed shrink">
                            Ícone PNG Salvo. Toque no X para remover ou carregar
                            outro.
                          </div>
                        </div>
                      ) : (
                        <div className="w-full">
                          <label className="flex items-center justify-center gap-2 p-3 border border-slate-800 border-dashed rounded-xl cursor-pointer bg-black/30 hover:bg-black/55 hover:border-slate-700 transition w-full text-center">
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span className="text-xs text-slate-350 font-bold">
                              {tiktokUploadLoading
                                ? "Compactando..."
                                : "Upar Ícone em PNG"}
                            </span>
                            <input
                              type="file"
                              accept="image/png"
                              className="hidden"
                              onChange={(e) => handleIconUpload(e, true)}
                              disabled={tiktokUploadLoading}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* YouTube Config Group */}
                  <div className="w-full space-y-2.5 p-4 rounded-2xl bg-black/20 border border-slate-800">
                    <span className="text-xs font-black uppercase tracking-wider text-red-500 block border-b border-slate-800 pb-1.5">
                      YouTube GymStars
                    </span>

                    {/* YouTube Link */}
                    <div className="w-full flex flex-col space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Link do Canal YouTube
                      </label>
                      <input
                        type="url"
                        value={formYoutube}
                        onChange={(e) => setFormYoutube(e.target.value)}
                        placeholder="https://youtube.com/@gymstarsbr"
                        autoComplete="off"
                        className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* YouTube PNG Icon */}
                    <div className="w-full flex flex-col space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Ícone do YouTube (Upar PNG)
                      </label>

                      {formYoutubeIcon ? (
                        <div className="flex items-center gap-4 bg-black/45 p-3 rounded-xl border border-slate-800">
                          <div className="relative w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-slate-800 p-1 shrink-0">
                            <img
                              src={formYoutubeIcon || undefined}
                              alt="YouTube Icon Preview"
                              className="w-full h-full object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => setFormYoutubeIcon("")}
                              className="absolute -top-1.5 -right-1.5 p-1 bg-red-650 hover:bg-red-500 rounded-full text-white cursor-pointer"
                              title="Remover"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed shrink">
                            Ícone PNG Salvo. Toque no X para remover ou carregar
                            outro.
                          </div>
                        </div>
                      ) : (
                        <div className="w-full">
                          <label className="flex items-center justify-center gap-2 p-3 border border-slate-800 border-dashed rounded-xl cursor-pointer bg-black/30 hover:bg-black/55 hover:border-slate-700 transition w-full text-center">
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span className="text-xs text-slate-350 font-bold">
                              {youtubeUploadLoading
                                ? "Compactando..."
                                : "Upar Ícone em PNG"}
                            </span>
                            <input
                              type="file"
                              accept="image/png"
                              className="hidden"
                              onChange={(e) => handleIconUpload(e, false)}
                              disabled={youtubeUploadLoading}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="w-full flex flex-col gap-2 pt-4 border-t border-slate-800 shrink-0">
                    <button
                      type="submit"
                      disabled={
                        savingSocials ||
                        tiktokUploadLoading ||
                        youtubeUploadLoading
                      }
                      className="w-full px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/25 cursor-pointer"
                    >
                      {savingSocials ? "Salvando..." : "Salvar Configuração"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSocialsModal(false)}
                      className="w-full px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase rounded-xl transition-all border border-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>,
            document.body,
          )}
      </AnimatePresence>
    </div>
  );
}
