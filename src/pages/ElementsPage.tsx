import React, { useState, useEffect, useMemo, useRef } from "react";
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
import {
  Shapes,
  Plus,
  Search,
  ChevronRight,
  Pencil,
  Trash2,
  LayoutGrid,
  X,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const GROUPS_BY_APPARATUS: Record<string, string[]> = {
  trave: [
    "EG I - Entradas",
    "EG II - Saltos Ginásticos, Saltos e Passos",
    "EG III - Giros / Piruetas",
    "EG IV - Elementos de Força/Manutenção e Acrobáticos sem Voo",
    "EG V - Elementos Acrobáticos com Voo",
    "EG VI - Saídas",
  ],
  salto: [
    "EG I - Saltos sem Mortal",
    "EG II - Reversões Pranchadas / Mortais para Frente",
    "EG III - Tsukahara",
    "EG IV - Yurchenkos",
    "EG V - Yurchenko 1/2 Volta na Entrada",
  ],
  paralelas: [
    "EG I - Entradas",
    "EG II - Oitavas e Grandes Círculos de Quadril",
    "EG III - Grandes Círculos (Gigantes)",
    "EG IV - Stalders",
    "EG V - Círculos Carpados / Endos",
    "EG VI - Saídas",
  ],
  solo: [
    "EG I - Saltos Ginásticos, Saltos e Passos",
    "EG II - Giros / Piruetas",
    "EG III - Elementos com Apoio de Mãos",
    "EG IV - Mortais para Frente e Laterais",
    "EG V - Mortais para Trás",
  ],
};

const DIFFICULTY_VALUES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

const DIFFICULTY_OPTIONS = DIFFICULTY_VALUES.map((d) => {
  const valueMap: Record<string, string> = {
    A: "0.1",
    B: "0.2",
    C: "0.3",
    D: "0.4",
    E: "0.5",
    F: "0.6",
    G: "0.7",
    H: "0.8",
    I: "0.9",
    J: "1.0",
  };
  return {
    value: d,
    label: `${d} (${valueMap[d] || "0.0"})`,
  };
});

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  iconComponent,
  required,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  iconComponent?: React.ReactNode;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {required && (
        <input
          type="text"
          readOnly
          className="sr-only"
          required
          value={value}
        />
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-900 border ${isOpen ? "border-purple-500" : "border-slate-800"} hover:border-slate-700 rounded-xl px-4 py-3 text-left text-white text-sm focus:outline-none transition-colors shadow-inner shadow-black/50 flex items-center justify-between group`}
      >
        <span
          className={`truncate mr-2 ${!selectedOption && "text-slate-400"}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center shrink-0 transition-opacity">
          {iconComponent || (
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[100] top-[calc(100%+8px)] left-0 right-0 py-2 border border-slate-700/80 bg-[#0f172a] rounded-xl shadow-2xl shadow-black max-h-60 overflow-y-auto custom-scrollbar flex flex-col"
          >
            {!required && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={`text-left px-4 py-2.5 text-sm transition-colors shrink-0 font-medium border-b border-white/5 ${!value ? "bg-purple-600/10 text-purple-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
              >
                {placeholder}
              </button>
            )}
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`text-left px-4 py-2.5 text-sm transition-colors shrink-0 truncate font-medium ${value === opt.value ? "bg-purple-600/20 text-purple-300 border-l-2 border-purple-500" : "text-slate-300 hover:bg-slate-800 hover:text-emerald-400"}`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getYoutubeVideoId(url: string) {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/,
  );
  return match ? match[1] : null;
}

export default function ElementsPage() {
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const isAdmin = userData?.tag === "Admin";
  const [contents, setContents] = useState<any[]>([]);
  const [branding, setBranding] = useState<any>(null);

  const [activeApparatus, setActiveApparatus] = useState("solo");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterValue, setFilterValue] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [newContent, setNewContent] = useState({
    title: "",
    text: "",
    videoUrl: "",
    imageUrl: "",
    apparatus: "solo",
    group: "",
    difficulty: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appContent", "branding"), (snap) => {
      if (snap.exists()) {
        setBranding(snap.data());
      }
    });
    return unsub;
  }, []);

  const apparatusOptions = useMemo(() => {
    const rawList = [
      { id: "solo", defaultName: "Solo" },
      { id: "salto", defaultName: "Salto" },
      { id: "paralelas", defaultName: "Paralelas Assimétricas" },
      { id: "trave", defaultName: "Trave" },
    ];
    return rawList.map((item) => ({
      id: item.id,
      name: branding?.apparatusNames?.[item.id] || item.defaultName,
      icon: branding?.apparatusIcons?.[item.id] || null,
    }));
  }, [branding]);

  const iconSize = useMemo(() => {
    return Number(branding?.apparatusIconsSize) || 44;
  }, [branding]);

  useEffect(() => {
    const q = query(
      collection(db, "appContent"),
      where("type", "==", "elementos"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) =>
      setContents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    );
    return () => unsub();
  }, []);

  // Adapt to active apparatus switch to clean sub-filters
  useEffect(() => {
    setFilterGroup("");
  }, [activeApparatus]);

  const filteredContents = useMemo(() => {
    return contents.filter((item) => {
      // Support old records that don't have apparatus yet
      const itemApparatus = item.apparatus || "solo";
      if (itemApparatus !== activeApparatus) return false;

      if (filterGroup && item.group !== filterGroup) return false;
      if (filterValue && item.difficulty !== filterValue) return false;

      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        return (
          item.title.toLowerCase().includes(lowerTerm) ||
          (item.text && item.text.toLowerCase().includes(lowerTerm))
        );
      }
      return true;
    });
  }, [contents, activeApparatus, filterGroup, filterValue, searchTerm]);

  const resetForm = () => {
    setEditingItemId(null);
    setNewContent({
      title: "",
      text: "",
      videoUrl: "",
      imageUrl: "",
      apparatus: activeApparatus,
      group: "",
      difficulty: "",
    });
  };

  const handleEditClick = (item: any) => {
    setEditingItemId(item.id);
    setNewContent({
      title: item.title || "",
      text: item.text || "",
      videoUrl: item.videoUrl || "",
      imageUrl: item.imageUrl || "",
      apparatus: item.apparatus || "solo",
      group: item.group || "",
      difficulty: item.difficulty || "",
    });
    setShowFormModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      if (editingItemId) {
        await updateDoc(doc(db, "appContent", editingItemId), {
          title: newContent.title,
          text: newContent.text,
          videoUrl: newContent.videoUrl,
          imageUrl: newContent.imageUrl,
          apparatus: newContent.apparatus,
          group: newContent.group,
          difficulty: newContent.difficulty,
        });
      } else {
        await addDoc(collection(db, "appContent"), {
          ...newContent,
          type: "elementos",
          createdAt: Date.now(),
        });
        await addDoc(collection(db, "notifications"), {
          message: `Novo Elemento adicionado: ${newContent.title}`,
          type: "info",
          createdAt: Date.now(),
        });
      }
      setShowFormModal(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Deseja realmente excluir este elemento?")) return;
    try {
      await deleteDoc(doc(db, "appContent", id));
      if (selectedElement?.id === id) {
        setSelectedElement(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-black/20">
        <h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tighter">
          Elementos
        </h1>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowFormModal(true);
            }}
            className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-purple-600/20"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Filter (Apparatus Selector) */}
      <div className="bg-slate-900 border border-slate-800 p-2 sm:p-3 rounded-2xl flex justify-center items-center gap-3 overflow-x-auto custom-scrollbar shadow-md">
        {apparatusOptions.map((app) => (
          <button
            key={app.id}
            onClick={() => setActiveApparatus(app.id)}
            title={app.name}
            className={`rounded-2xl transition-all duration-300 outline-none flex items-center justify-center relative group p-1.5 ${
              activeApparatus === app.id
                ? "bg-purple-600/20 border border-purple-500 shadow-lg shadow-purple-600/10 scale-105"
                : "bg-transparent border border-transparent text-slate-500 hover:text-white hover:bg-slate-800/60"
            }`}
            style={{
              width: `${iconSize + 16}px`,
              height: `${iconSize + 16}px`,
            }}
          >
            {app.icon ? (
              <img
                src={app.icon || undefined}
                alt={app.name}
                className="object-contain select-none pointer-events-none transition-all duration-300 group-hover:scale-105"
                style={{
                  width: `${iconSize}px`,
                  height: `${iconSize}px`,
                  filter:
                    activeApparatus === app.id
                      ? "brightness(1.1) contrast(1)"
                      : "brightness(0.65)",
                }}
              />
            ) : (
              <div
                className={`flex items-center justify-center font-bold font-mono tracking-tight rounded-xl shrink-0 uppercase select-none transition-all ${
                  activeApparatus === app.id
                    ? "bg-purple-600 text-white font-extrabold shadow-md shadow-purple-600/20"
                    : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
                }`}
                style={{
                  width: `${iconSize}px`,
                  height: `${iconSize}px`,
                  fontSize: `${Math.max(9, Math.floor(iconSize * 0.35))}px`,
                }}
              >
                {app.id === "solo"
                  ? "SL"
                  : app.id === "salto"
                    ? "ST"
                    : app.id === "paralelas"
                      ? "PR"
                      : "TR"}
              </div>
            )}

            {/* Beautiful Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-2.5 py-1 bg-slate-950 border border-slate-800 text-[10px] font-black tracking-wider uppercase text-slate-200 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl z-50">
              {app.name}
            </div>
          </button>
        ))}
      </div>

      {/* Sub Filters & Search */}
      <div className="bg-black/20 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar elemento por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors shadow-inner shadow-black/50"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Group Filter */}
          <div className="relative w-full sm:w-48 z-40">
            <CustomSelect
              value={filterGroup}
              onChange={setFilterGroup}
              options={(GROUPS_BY_APPARATUS[activeApparatus] || []).map(
                (g) => ({ value: g, label: g }),
              )}
              placeholder="GRUPO"
              iconComponent={<></>}
            />
          </div>

          {/* Difficulty Filter */}
          <div className="relative w-full sm:w-36 z-30">
            <CustomSelect
              value={filterValue}
              onChange={setFilterValue}
              options={DIFFICULTY_OPTIONS}
              placeholder="VALOR"
              iconComponent={<></>}
            />
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredContents.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setSelectedElement(item)}
              className="group bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all shadow-lg hover:shadow-purple-900/10"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-800 flex items-center justify-center">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl || undefined}
                    alt=""
                    className="w-full h-full object-cover select-none pointer-events-none"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : item.videoUrl && getYoutubeVideoId(item.videoUrl) ? (
                  <img
                    src={`https://img.youtube.com/vi/${getYoutubeVideoId(item.videoUrl)}/mqdefault.jpg`}
                    alt=""
                    className="w-full h-full object-cover select-none pointer-events-none"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <Shapes className="w-6 h-6 text-slate-700" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 py-1">
                <h3 className="text-white font-bold truncate text-base mb-1">
                  {item.title}
                </h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {item.difficulty && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm shadow-emerald-500/5">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                      [{item.difficulty}]
                    </span>
                  )}
                  {item.group && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-lg truncate max-w-[150px]">
                      {item.group}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-xs truncate leading-relaxed">
                  {item.text || "Sem descrição disponível."}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(item);
                    }}
                    className="p-2 sm:p-2.5 text-slate-600 hover:text-white hover:bg-purple-600 rounded-xl transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <div className="p-2 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredContents.length === 0 && (
          <div className="col-span-full border border-dashed border-slate-800 bg-slate-900/30 rounded-3xl py-20 flex flex-col items-center justify-center text-slate-500">
            <Shapes className="w-12 h-12 mb-4 text-slate-700" />
            <p className="font-medium">Nenhum elemento encontrado.</p>
            <p className="text-sm mt-1">Tente ajustar os filtros ou a busca.</p>
          </div>
        )}
      </div>

      {/* Details View (Modal) */}
      <AnimatePresence>
        {selectedElement && !showFormModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-700/50 shadow-2xl shadow-purple-900/20 w-full max-w-3xl rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 sm:p-8 border-b border-slate-800 bg-slate-950">
                <div className="pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-[#00a84c] flex items-center gap-1.5 font-bold">
                      {(() => {
                        const foundOpt = apparatusOptions.find(
                          (a) => a.id === selectedElement.apparatus,
                        );
                        return (
                          <>
                            {foundOpt?.icon && (
                              <img
                                src={foundOpt.icon || undefined}
                                alt=""
                                className="w-4 h-4 object-contain inline select-none pointer-events-none"
                              />
                            )}
                            <span>{foundOpt?.name || "Geral"}</span>
                          </>
                        );
                      })()}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {selectedElement.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedElement(null)}
                  className="w-10 h-10 flex shrink-0 items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-8 bg-slate-900 custom-scrollbar">
                <div className="flex gap-3">
                  {selectedElement.difficulty && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-sm font-bold text-emerald-400">
                        Dificuldade [{selectedElement.difficulty}]
                      </span>
                    </div>
                  )}
                  {selectedElement.group && (
                    <div className="bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-xl">
                      <span className="text-sm font-bold text-purple-400">
                        {selectedElement.group}
                      </span>
                    </div>
                  )}
                </div>

                {selectedElement.text && (
                  <div className="prose prose-invert prose-p:leading-relaxed prose-p:text-slate-300 max-w-none text-sm sm:text-base">
                    <p className="whitespace-pre-wrap">
                      {selectedElement.text}
                    </p>
                  </div>
                )}

                {selectedElement.videoUrl &&
                  getYoutubeVideoId(selectedElement.videoUrl) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Vídeo Demonstrativo
                      </h3>
                      <div className="aspect-video rounded-2xl overflow-hidden border border-slate-700 shadow-lg shadow-black/50 bg-black">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${getYoutubeVideoId(selectedElement.videoUrl)}`}
                          allowFullScreen
                          className="border-0"
                        ></iframe>
                      </div>
                    </div>
                  )}

                {selectedElement.imageUrl && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                      Esboço / Foto
                    </h3>
                    <div className="rounded-2xl overflow-hidden border border-slate-700 bg-black">
                      <img
                        src={selectedElement.imageUrl || undefined}
                        alt=""
                        className="w-full h-auto max-h-[500px] object-contain select-none pointer-events-none"
                        draggable="false"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer tools (Admin only) */}
              {isAdmin && (
                <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
                  <button
                    onClick={() => handleDelete(selectedElement.id)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/80 px-4 py-2 rounded-lg transition-colors border border-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                  <button
                    onClick={() => {
                      handleEditClick(selectedElement);
                      setSelectedElement(null);
                    }}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar Original
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Form Modal */}
      <AnimatePresence>
        {showFormModal && isAdmin && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-950 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-black text-white">
                  {editingItemId ? "Editar Elemento" : "Novo Elemento"}
                </h2>
              </div>
              <form
                onSubmit={handleSave}
                className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="z-[60] relative">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Aparelho
                    </label>
                    <CustomSelect
                      value={newContent.apparatus}
                      onChange={(val) => {
                        setNewContent({
                          ...newContent,
                          apparatus: val,
                          group: "", // reset group when apparatus changes
                        });
                      }}
                      options={apparatusOptions.map((a) => ({
                        value: a.id,
                        label: a.name,
                      }))}
                      placeholder="Selecione o Aparelho..."
                      required
                    />
                  </div>
                  <div className="z-[50] relative">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Dificuldade (Valor)
                    </label>
                    <CustomSelect
                      value={newContent.difficulty}
                      onChange={(val) =>
                        setNewContent({ ...newContent, difficulty: val })
                      }
                      options={DIFFICULTY_OPTIONS}
                      placeholder="Selecione um valor..."
                      required
                    />
                  </div>
                </div>

                <div className="z-[40] relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Grupo de Elementos
                  </label>
                  <CustomSelect
                    value={newContent.group}
                    onChange={(val) =>
                      setNewContent({ ...newContent, group: val })
                    }
                    options={(
                      GROUPS_BY_APPARATUS[newContent.apparatus] || []
                    ).map((g) => ({ value: g, label: g }))}
                    placeholder="Selecione o grupo..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Nome do Elemento
                  </label>
                  <input
                    required
                    value={newContent.title}
                    onChange={(e) =>
                      setNewContent({ ...newContent, title: e.target.value })
                    }
                    placeholder="Ex: Tsukahara Grupado"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Descrição Técnica (Opcional)
                  </label>
                  <textarea
                    rows={4}
                    value={newContent.text}
                    onChange={(e) =>
                      setNewContent({ ...newContent, text: e.target.value })
                    }
                    placeholder="Detalhes cinemáticos do movimento..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 leading-relaxed"
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                    Mídia
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      URL do Vídeo (YouTube)
                    </label>
                    <input
                      type="url"
                      value={newContent.videoUrl}
                      onChange={(e) =>
                        setNewContent({
                          ...newContent,
                          videoUrl: e.target.value,
                        })
                      }
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      URL da Imagem / Ícone (Recomendado se não houver vídeo)
                    </label>
                    <input
                      type="url"
                      value={newContent.imageUrl}
                      onChange={(e) =>
                        setNewContent({
                          ...newContent,
                          imageUrl: e.target.value,
                        })
                      }
                      placeholder="https://exemplo.com/icone.png"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </form>
              <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-2.5 rounded-xl font-bold uppercase tracking-wide text-sm transition-all shadow-lg shadow-purple-600/30"
                >
                  Salvar Elemento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
