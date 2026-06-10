import React, { useState, useEffect } from "react";
import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
} from "../lib/firebase";
import { 
  ShieldCheck, 
  UserCog, 
  Upload, 
  Trash2, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Smile, 
  RotateCcw, 
  Link2, 
  Check, 
  Settings2, 
  Image, 
  HelpCircle,
  FileImage,
  Trophy,
  BookOpen,
  Shapes,
  Users,
  Star,
  Award,
  Notebook,
  Medal,
  Play,
  Target,
  Settings,
  Heart,
  Flame,
  Shield,
  MapPin,
  Search,
  Volume2,
  LayoutDashboard,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserData } from "../App";
import { useOutletContext, Navigate } from "react-router-dom";
import clsx from "clsx";
import VerifiedBadge from "../components/VerifiedBadge";

export default function AdminPage() {
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSfxUrl, setGlobalSfxUrl] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [activeTab, setActiveTab] = useState("accounts");
  const [searchQuery, setSearchQuery] = useState("");

  const menuItems = [
    { id: "accounts", label: "Contas", icon: UserCog, desc: "Cargos, nomes e senhas" },
    { id: "teams", label: "Equipes", icon: Shield, desc: "Criar e organizar equipes" },
    { id: "badges", label: "Emblemas", icon: Award, desc: "Atribuir conquistas" },
    { id: "branding", label: "Personalização", icon: LayoutDashboard, desc: "Home, Logos e Quem Somos" },
    { id: "sound", label: "Sons", icon: Volume2, desc: "SFX Global do Sistema" },
  ];

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.competitionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "appContent"), where("type", "==", "team")), (snap) => {
      setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    getDoc(doc(db, "settings", "global"))
      .then((d) => {
        if (d.exists()) {
          setGlobalSfxUrl(d.data().sfxUrl || "");
        }
      })
      .catch((err) => {
        console.warn("Erro ao carregar efeito sonoro global:", err);
      });
  }, []);

  const [isSavingSfx, setIsSavingSfx] = useState(false);

  const saveGlobalSfx = async () => {
    setIsSavingSfx(true);
    try {
      await setDoc(doc(db, "settings", "global"), { sfxUrl: globalSfxUrl }, { merge: true });
      setStatusMsg({ text: "Link do efeito sonoro salvo com sucesso!", type: "success" });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: "Erro ao salvar: " + err.message, type: "error" });
      setTimeout(() => setStatusMsg(null), 5000);
    } finally {
      setIsSavingSfx(false);
    }
  };

  const testAudio = () => {
    if (!globalSfxUrl) {
      setStatusMsg({ text: "Insira uma URL primeiro", type: "error" });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }
    let url = globalSfxUrl;
    if (url?.includes?.("dropbox.com")) {
      url = url.replace(/dl=[012]/, "raw=1");
    }
    const audio = new Audio(url);
    audio.play().catch(e => {
      setStatusMsg({ text: "Erro ao tocar áudio. Verifique se o link é válido: " + e.message, type: "error" });
      setTimeout(() => setStatusMsg(null), 5000);
    });
  };

  if (userData?.tag !== "Admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-[#009c3b]/10 border border-[#009c3b]/20 p-6 sm:p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <div className="bg-[#009c3b]/20 p-4 rounded-3xl backdrop-blur-md">
            <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-[#009c3b]" />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter">
              Painel Administrativo
            </h1>
            <p className="text-slate-400 font-medium text-sm sm:text-base mt-1">
              Controle total da plataforma GymStars Brasil
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="fixed bottom-10 right-10 z-[100] animate-in fade-in slide-in-from-bottom-5">
           <div className={`p-4 rounded-2xl flex items-center gap-4 text-sm font-bold shadow-[0_20px_50px_rgba(0,0,0,0.5)] border ${
             statusMsg.type === "success" 
               ? "bg-slate-900 border-green-500/30 text-green-400" 
               : "bg-slate-900 border-red-500/30 text-red-400"
           }`}>
             <div className={`w-3 h-3 rounded-full ${statusMsg.type === "success" ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-red-500 shadow-[0_0_10px_#ef4444]"} shrink-0`} />
             <span className="pr-4">{statusMsg.text}</span>
             <button onClick={() => setStatusMsg(null)} className="text-slate-500 hover:text-white transition-colors">✕</button>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-72 shrink-0 space-y-2">
           <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-4">Menu de Gestão</div>
           <nav className="space-y-1.5 font-sans">
              {menuItems.map((item) => (
                 <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={clsx(
                       "w-full flex items-center gap-4 p-4 rounded-3xl border transition-all text-left group",
                       activeTab === item.id 
                          ? "bg-[#009c3b]/10 border-[#009c3b]/30 text-white shadow-lg shadow-black/20" 
                          : "bg-[#0A1221] border-slate-800/50 text-slate-500 hover:bg-slate-800 hover:border-slate-700"
                    )}
                 >
                    <div className={clsx(
                       "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                       activeTab === item.id 
                          ? "bg-[#009c3b] text-white" 
                          : "bg-slate-900 text-slate-600 group-hover:text-slate-300"
                    )}>
                       <item.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                       <div className={clsx(
                          "font-black text-xs uppercase tracking-wider",
                          activeTab === item.id ? "text-white" : "text-slate-400"
                       )}>{item.label}</div>
                       <div className="text-[9px] truncate opacity-60 font-medium">{item.desc}</div>
                    </div>
                 </button>
              ))}
           </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 w-full">
           <AnimatePresence mode="wait">
              <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
                 className="space-y-6"
              >
                 {activeTab === 'accounts' && (
                    <div className="space-y-6">
                       <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0A1221] border border-slate-800 p-4 rounded-3xl">
                          <div className="w-full relative flex items-center">
                             <Search className="absolute left-4 w-5 h-5 text-slate-500" />
                             <input 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Buscar contas por nome, e-mail ou @usuário..."
                                className="w-full bg-black/40 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-[#009c3b] transition-all outline-none text-sm font-sans"
                             />
                             {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-4 text-slate-500 hover:text-white">✕</button>
                             )}
                          </div>
                          <div className="shrink-0 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4">
                             {filteredUsers.length} total
                          </div>
                       </div>
                       
                       <div className="space-y-3">
                          {loading ? (
                             <div className="py-20 flex flex-col items-center gap-4 bg-[#0A1221] border border-slate-800 rounded-[2.5rem]">
                                <Play className="w-8 h-8 text-[#009c3b] animate-pulse" />
                                <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Sincronizando Banco de Dados...</span>
                             </div>
                          ) : filteredUsers.length === 0 ? (
                             <div className="py-20 flex flex-col items-center gap-4 bg-[#0A1221] border border-slate-800 rounded-[2.5rem] text-center">
                                <Search className="w-10 h-10 text-slate-800 mb-2" />
                                <p className="text-slate-500 text-sm font-medium">Nenhum resultado para "{searchQuery}"</p>
                                <button onClick={() => setSearchQuery("")} className="text-[#009c3b] text-xs font-black uppercase tracking-widest hover:underline">Limpar Filtros</button>
                             </div>
                          ) : (
                             filteredUsers.map((u, i) => (
                                <motion.div
                                   key={u.id || i}
                                   initial={{ opacity: 0, y: 5 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   transition={{ delay: Math.min(i * 0.03, 0.5) }}
                                >
                                   <AdminUserRow user={u} teams={teams} />
                                </motion.div>
                             ))
                          )}
                       </div>
                    </div>
                 )}

                 {activeTab === 'teams' && <TeamsManager teams={teams} />}

                 {activeTab === 'badges' && <BadgesManager users={users} />}

                 {activeTab === 'branding' && (
                    <div className="space-y-8">
                       <HomepageContentManager />
                       <AppBrandingManager />
                       <AboutUsManager />
                    </div>
                 )}

                 {activeTab === 'sound' && (
                    <div className="bg-[#0A1221] border border-slate-800 p-8 rounded-[2.5rem] space-y-8">
                       <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                          <div className="bg-indigo-500/10 p-3 rounded-2xl">
                             <Volume2 className="w-8 h-8 text-indigo-500" />
                          </div>
                          <div>
                             <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Efeitos Sonoros do Sistema</h2>
                             <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">Configurações Globais de Áudio</p>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                               SFX de Arbitragem (Som tocado ao fechar janela de notas)
                            </label>
                            <div className="relative group">
                               <Play className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 opacity-50 group-focus-within:opacity-100 transition-opacity" />
                               <input
                                 type="url"
                                 value={globalSfxUrl}
                                 onChange={(e) => setGlobalSfxUrl(e.target.value)}
                                 className="w-full bg-black/40 border border-slate-800 rounded-2xl pl-12 pr-4 py-5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                                 placeholder="https://exemplo.com/efeito.mp3"
                               />
                            </div>
                            <p className="text-[10px] text-slate-600 italic px-2">Dica: Links do Dropbox devem terminar em ?raw=1 ou ser convertidos automaticamente pelo sistema.</p>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4 pt-4">
                             <button
                                onClick={testAudio}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest px-8 py-5 rounded-2xl text-xs transition-all border border-slate-700 active:scale-95"
                             >
                                Testar Som Agora
                             </button>
                             <button
                                onClick={saveGlobalSfx}
                                disabled={isSavingSfx || !globalSfxUrl}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] px-8 py-5 rounded-2xl text-xs transition-all shadow-xl shadow-indigo-900/40 disabled:opacity-30 active:scale-95"
                             >
                                {isSavingSfx ? "Salvando..." : "Salvar Configuração"}
                             </button>
                          </div>
                       </div>
                    </div>
                 )}
              </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function BadgesManager({ users }: { users: any[] }) {
  const [badges, setBadges] = useState<any[]>([]);
  const [badgeName, setBadgeName] = useState("");
  const [badgeImage, setBadgeImage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Assignment state
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("Toda");
  const [assignmentMode, setAssignmentMode] = useState<"individual" | "bulk">("individual");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [assignMessage, setAssignMessage] = useState("");
  
  useEffect(() => {
    const q = query(collection(db, "appContent"), where("type", "==", "badge"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setBadges(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleCreateBadge = async () => {
    if (!badgeName || !badgeImage) return;
    setIsCreating(true);
    try {
      await addDoc(collection(db, "appContent"), {
        type: "badge",
        name: badgeName,
        imageUrl: badgeImage,
        createdAt: Date.now()
      });
      setBadgeName("");
      setBadgeImage("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setBadgeImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteBadge = async (id: string) => {
    if (!window.confirm("Deseja apagar este emblema da biblioteca?")) return;
    try {
      await deleteDoc(doc(db, "appContent", id));
      if (selectedBadge?.id === id) setSelectedBadge(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssign = async () => {
    if (!selectedBadge) return;
    setIsAssigning(true);
    
    try {
      const badgeData = {
        id: selectedBadge.id,
        name: selectedBadge.name,
        imageUrl: selectedBadge.imageUrl
      };

      if (assignmentMode === "bulk") {
        const targetUsers = users.filter(u => selectedTag === "Toda" || u.tag === selectedTag || (selectedTag.startsWith("Team:") && u.team === selectedTag.split(":")[1]));
        
        for (const u of targetUsers) {
          const currentBadges = u.badges || [];
          if (!currentBadges.some((b: any) => b.id === selectedBadge.id)) {
            await updateDoc(doc(db, "users", u.id), {
              badges: [...currentBadges, badgeData]
            });
          }
        }

        // Single global notification for bulk
        const groupLabel = selectedTag === "Toda" ? "Todos os usuários" : `As pessoas com a TAG ${selectedTag}`;
        await addDoc(collection(db, "notifications"), {
          title: "Conquista Coletiva!",
          message: assignMessage || `${groupLabel} receberam o emblema: ${selectedBadge.name}!`,
          type: "success",
          createdAt: Date.now()
        });
      } else {
        // Individual
        for (const uid of selectedUserIds) {
          const user = users.find(u => u.id === uid);
          if (user) {
            const currentBadges = user.badges || [];
            if (!currentBadges.some((b: any) => b.id === selectedBadge.id)) {
              await updateDoc(doc(db, "users", uid), {
                badges: [...currentBadges, badgeData]
              });
              
              // Individual notification
              await addDoc(collection(db, "notifications"), {
                title: "Novo Emblema Conquistado!",
                message: assignMessage || `${user.competitionName || user.username} recebeu o emblema: ${selectedBadge.name}!`,
                type: "success",
                createdAt: Date.now()
              });
            }
          }
        }
      }
      
      setSelectedUserIds([]);
      setSelectedBadge(null);
      setAssignMessage("");
      alert("Emblemas atribuídos com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao atribuir emblemas.");
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredAssignUsers = users.filter(u => {
    const matchesSearch = u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         u.competitionName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === "Toda" || u.tag === selectedTag || (selectedTag.startsWith("Team:") && u.team === selectedTag.split(":")[1]);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Creation Section */}
      <section className="bg-[#0A1221] border border-slate-800 p-6 sm:p-8 rounded-[2.5rem] space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-2xl">
            <Plus className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Criar Novo Emblema</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Adicione conquistas exclusivas para a biblioteca</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Emblema</label>
              <input 
                value={badgeName}
                onChange={e => setBadgeName(e.target.value)}
                placeholder="Ex: Campeã Estadual 2024"
                className="w-full bg-black/40 border border-slate-800 rounded-2xl px-4 py-4 text-white text-sm focus:border-[#009c3b] outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Upload da Imagem (PNG)</label>
              <label className="flex items-center gap-4 bg-black/20 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:bg-black/40 transition-colors group">
                <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-[#009c3b] group-hover:border-[#009c3b]/50 transition-all">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white">Selecionar arquivo PNG</div>
                  <div className="text-[10px] text-slate-500 font-medium">Fundo transparente recomendado</div>
                </div>
                <input type="file" accept="image/png" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <button
               onClick={handleCreateBadge}
               disabled={isCreating || !badgeName || !badgeImage}
               className="w-full bg-[#009c3b] hover:bg-[#009c3b]/90 text-white font-black uppercase tracking-[0.2em] text-xs py-4 rounded-2xl transition-all disabled:opacity-30 disabled:grayscale active:scale-[0.98]"
            >
               {isCreating ? "Criando..." : "Registrar Emblema"}
            </button>
          </div>

          <div className="flex flex-col items-center justify-center p-8 bg-black/20 border border-slate-800 rounded-[2rem] border-dashed">
            {badgeImage ? (
              <div className="flex flex-col items-center gap-4">
                <img src={badgeImage} className="w-32 h-32 object-contain" />
                <span className="text-[10px] font-black text-[#009c3b] uppercase tracking-[0.2em] animate-pulse">Prévia do Emblema</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 opacity-20">
                <Award className="w-16 h-16 text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nada selecionado</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Library Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
             <Trophy className="w-5 h-5 text-amber-500" />
             <h3 className="text-sm font-black text-white uppercase tracking-widest">Biblioteca de Emblemas ({badges.length})</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
           {badges.map(badge => (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={clsx(
                  "relative group bg-[#0A1221] border p-6 rounded-[2rem] flex flex-col items-center gap-3 transition-all active:scale-95",
                  selectedBadge?.id === badge.id 
                    ? "border-amber-500 bg-amber-500/5 ring-4 ring-amber-500/10 scale-[1.02]" 
                    : "border-slate-800 hover:border-slate-700"
                )}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteBadge(badge.id); }}
                  className="absolute top-2 right-2 p-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <img src={badge.imageUrl} className="w-16 h-16 object-contain" />
                <div className="text-center">
                   <div className="text-[10px] font-black text-white uppercase tracking-tighter truncate w-full max-w-[100px]">{badge.name}</div>
                </div>
              </button>
           ))}
           {badges.length === 0 && (
             <div className="col-span-full py-12 bg-[#0A1221] border border-slate-800 border-dashed rounded-[2rem] text-center text-slate-500 text-xs font-black uppercase tracking-widest">
                A biblioteca está vazia
             </div>
           )}
        </div>
      </section>

      {/* Assigner Section */}
      <AnimatePresence>
         {selectedBadge && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0A1221] border border-amber-500/30 p-6 sm:p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-green-950/20"
            >
              <div className="absolute top-0 right-0 p-8 transform translate-x-1/4 -translate-y-1/4 opacity-10">
                 <img src={selectedBadge.imageUrl} className="w-64 h-64 grayscale" />
              </div>

              <div className="relative z-10 flex flex-col lg:flex-row gap-8">
                 <div className="lg:w-80 shrink-0 space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 bg-black/40 border border-slate-800 rounded-2xl flex items-center justify-center p-3">
                          <img src={selectedBadge.imageUrl} className="w-full h-full object-contain" />
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Emblema Selecionado</div>
                          <div className="text-xl font-black text-white italic uppercase tracking-tighter">{selectedBadge.name}</div>
                       </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Modo de Atribuição</label>
                          <div className="flex bg-black/40 p-1 rounded-2xl border border-slate-800">
                             <button
                               onClick={() => setAssignmentMode("individual")}
                               className={clsx(
                                 "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                 assignmentMode === "individual" ? "bg-amber-500 text-black shadow-lg" : "text-slate-500"
                               )}
                             >Individual</button>
                             <button
                               onClick={() => setAssignmentMode("bulk")}
                               className={clsx(
                                 "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                 assignmentMode === "bulk" ? "bg-amber-500 text-black shadow-lg" : "text-slate-500"
                               )}
                             >Em Massa</button>
                          </div>
                       </div>

                       {assignmentMode === "bulk" ? (
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Alvo do Envio</label>
                            <select 
                               value={selectedTag}
                               onChange={e => setSelectedTag(e.target.value)}
                               className="w-full bg-black border border-slate-800 rounded-2xl px-4 py-4 text-white text-xs font-black uppercase tracking-widest focus:border-amber-500 outline-none"
                            >
                               <option value="Toda">Toda a Plataforma</option>
                               <option value="Ginasta">Apenas Ginastas</option>
                               <option value="Admin">Apenas Admins</option>
                               <option value="Árbitro">Apenas Árbitros</option>
                               <option value="Visitante">Apenas Visitantes</option>
                               <optgroup label="Filtrar por Equipe">
                                 {Array.from(new Set(users.filter(u => u.team).map(u => u.team))).map(team => (
                                   <option key={team} value={`Team:${team}`}>Equipe: {team}</option>
                                 ))}
                               </optgroup>
                            </select>
                         </div>
                       ) : (
                         <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                            <div className="text-xs font-bold text-amber-500 mb-1">Dica Individual</div>
                            <p className="text-[10px] text-amber-500/60 font-medium">Selecione as pessoas na lista ao lado.</p>
                         </div>
                       )}

                       <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mensagem do Envio (Commit message)</label>
                          <textarea 
                            value={assignMessage}
                            onChange={e => setAssignMessage(e.target.value)}
                            placeholder="Ex: Parabéns pela dedicação! (Opcional)"
                            className="w-full bg-black/40 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs outline-none focus:border-amber-500 transition-all font-sans h-20 resize-none"
                          />
                       </div>

                       <div className="pt-4 flex flex-col gap-3">
                          <button
                            onClick={handleAssign}
                            disabled={isAssigning || (assignmentMode === "individual" && selectedUserIds.length === 0)}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl transition-all shadow-xl shadow-amber-900/20 active:scale-95 disabled:opacity-30 disabled:active:scale-100 flex items-center justify-center gap-3"
                          >
                            <Award className="w-4 h-4" />
                            {isAssigning ? "Processando..." : assignmentMode === "bulk" ? "Atribuir para Grupo" : `Enviar (${selectedUserIds.length})`}
                          </button>
                          <button
                            onClick={() => { setSelectedBadge(null); setSelectedUserIds([]); }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all border border-slate-800"
                          >Cancelar</button>
                       </div>
                    </div>
                 </div>

                 <div className="flex-1 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/40 border border-slate-800 p-3 rounded-3xl">
                       <div className="w-full relative flex items-center">
                          <Search className="absolute left-4 w-4 h-4 text-slate-500" />
                          <input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar usuários..."
                            className="w-full bg-black/60 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-white text-xs outline-none focus:border-amber-500 transition-all font-sans"
                          />
                       </div>
                    </div>

                    <div className="bg-black/60 rounded-[2.5rem] border border-slate-800 overflow-hidden max-h-[500px] overflow-y-auto">
                       <div className="space-y-px">
                          {filteredAssignUsers.map(u => {
                            const isSelected = selectedUserIds.includes(u.id);
                            return (
                              <button
                                key={u.id}
                                onClick={() => {
                                  if (assignmentMode === "bulk") return;
                                  setSelectedUserIds(prev => isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                                }}
                                className={clsx(
                                  "w-full flex items-center justify-between p-4 transition-all text-left border-b border-white/5",
                                  isSelected ? "bg-amber-500/20" : "hover:bg-white/5",
                                  assignmentMode === "bulk" && "cursor-default"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                                      {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-2.5 text-slate-700" />}
                                   </div>
                                   <div>
                                      <div className="text-xs font-black text-white uppercase truncate max-w-[150px]">{u.competitionName || u.username} {u.verified && <VerifiedBadge />}</div>
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{u.tag}</div>
                                   </div>
                                </div>
                                
                                {assignmentMode === "individual" && (
                                   <div className={clsx(
                                     "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                     isSelected ? "bg-amber-500 border-amber-500 text-black scale-110" : "border-slate-800 text-transparent"
                                   )}>
                                     <Check className="w-4 h-4 text-black" />
                                   </div>
                                )}
                              </button>
                            );
                          })}
                          {filteredAssignUsers.length === 0 && (
                            <div className="py-20 text-center text-slate-600 text-xs font-black uppercase tracking-widest">Nenhum usuário encontrado</div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>
            </motion.section>
         )}
      </AnimatePresence>
    </div>
  );
}
function TeamsManager({ teams }: { teams: any[] }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "appContent"), {
        type: "team",
        title: name.trim(),
        emoji: emoji.trim() || null,
        imageUrl: imageUrl.trim() || null,
        createdAt: Date.now()
      });
      setName("");
      setEmoji("");
      setImageUrl("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "appContent", id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-6">
      <h2 className="text-lg font-bold text-white mb-4">Gerenciar Equipes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="sm:col-span-2">
          <input
            type="text"
            placeholder="Nome da Equipe"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Emoji (Opcional)"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <button
            onClick={handleAdd}
            disabled={loading || !name}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
        <div className="sm:col-span-4">
          <input
            type="url"
            placeholder="URL da Imagem da Equipe (Opcional)"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {teams.map(t => (
          <div key={t.id} className="bg-black/40 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {t.imageUrl ? (
                <img src={t.imageUrl} alt={t.title || t.name} className="w-8 h-8 rounded-md object-cover" />
              ) : t.emoji ? (
                <span className="text-2xl">{t.emoji}</span>
              ) : (
                <div className="w-8 h-8 bg-slate-800 rounded-md"></div>
              )}
              <span className="font-bold text-white text-sm">{t.title || t.name}</span>
            </div>
            <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider">
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function getUserPassword(u: any): string {
  if (!u) return "";
  if (u.password) return u.password;
  const email = u.email || "";
  const match = email.match(/^pass_(.*)_(.*)@gymstars\.internal$/);
  return match ? match[1] : "";
}

function AdminUserRow({ user, teams }: { user: any; teams: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const [tag, setTag] = useState(user.tag || "Visitante");
  const [compName, setCompName] = useState(user.competitionName || "");
  const [team, setTeam] = useState(user.team || "");
  const [musicUrl, setMusicUrl] = useState(user.musicBase64 || "");
  const [photoUrl, setPhotoUrl] = useState(user.photoURL || "");
  const [verified, setVerified] = useState(!!user.verified);
  const [editingUsername, setEditingUsername] = useState(user.username || "");
  const [editingPassword, setEditingPassword] = useState(getUserPassword(user));
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setEditingPassword(getUserPassword(user));
  }, [user?.id, user?.email, user?.password]);

  // Emblemas
  const currentBadges = user.badges || [];

  const handleDeleteUser = async () => {
    if (!window.confirm("Deseja deletar permanentemente esta conta?")) return;
    try {
      await deleteDoc(doc(db, "users", user.id));
      setStatusMsg({ text: "Conta deletada com sucesso.", type: "success" });
    } catch (e: any) {
      setStatusMsg({ text: "Erro ao deletar: " + e.message, type: "error" });
    }
  };

  const handleSaveUser = async () => {
    try {
      const trimmedPwd = editingPassword.trim();
      if (trimmedPwd.length < 6) {
        throw new Error("A senha precisa ter no mínimo 6 caracteres.");
      }

      const updates: any = {
        tag,
        username: editingUsername.trim().toLowerCase(),
        displayName: editingUsername.trim().toLowerCase(),
        photoURL: photoUrl || null,
        competitionName: tag === "Ginasta" ? compName : null,
        team: tag === "Ginasta" ? team : null,
        musicBase64: tag === "Ginasta" ? musicUrl || null : null,
        verified: !!verified,
        password: trimmedPwd,
        email: `pass_${trimmedPwd}_${user.id}@gymstars.internal`
      };

      await updateDoc(doc(db, "users", user.id), updates);
      setStatusMsg({ text: "Usuário atualizado com sucesso!", type: "success" });
      setTimeout(() => setStatusMsg(null), 4000);
      setExpanded(false);
    } catch (err: any) {
      setStatusMsg({ text: "Erro ao atualizar: " + err.message, type: "error" });
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const handleRemoveBadge = async (badgeId: string, idx?: number) => {
    try {
      const current = user.badges || [];
      const badgeToRemove = current.find((b: any, i: number) => b.id ? b.id === badgeId : i === idx);
      
      const updated = current.filter((b: any, i: number) => {
        if (b.id) return b.id !== badgeId;
        return i !== idx;
      });

      const medals = { ...(user.medals || { gold: 0, silver: 0, bronze: 0 }) };
      if (badgeToRemove) {
        const bName = typeof badgeToRemove === "string" ? badgeToRemove : badgeToRemove.name;
        if (bName) {
           if (bName.startsWith("Ouro")) medals.gold = Math.max(0, (medals.gold || 0) - 1);
           if (bName.startsWith("Prata")) medals.silver = Math.max(0, (medals.silver || 0) - 1);
           if (bName.startsWith("Bronze")) medals.bronze = Math.max(0, (medals.bronze || 0) - 1);
        }
      }

      await updateDoc(doc(db, "users", user.id), { badges: updated, medals });
      setStatusMsg({ text: "Emblema removido.", type: "success" });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (e: any) {
      setStatusMsg({ text: "Erro: " + e.message, type: "error" });
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  return (
    <div className="bg-[#070F1C] border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all">
      <div
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              className="w-10 h-10 rounded-full object-cover shadow-md"
            />
          ) : (
             <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-slate-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base sm:text-lg hover:underline transition-colors decoration-white/20 flex items-center gap-1">
                {user.competitionName || user.username}
                {user.verified && <VerifiedBadge />}
              </span>
              <span
                className={clsx(
                  "text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full",
                  user.tag === "Admin"
                    ? "bg-indigo-500/20 text-indigo-400"
                    : user.tag === "Ginasta"
                      ? "bg-yellow-500/20 text-yellow-500"
                      : user.tag === "Árbitro"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-slate-500/20 text-slate-400",
                )}
              >
                {user.tag}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 max-w-full">
              <span className="text-slate-500 text-xs truncate max-w-[150px] sm:max-w-xs">
                {user.email && user.email.includes("gymstars.internal") ? "E-mail interno (Sistema)" : user.email}
              </span>
              {user.team && (
                 <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-medium">Equipe: {user.team}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-slate-500 text-sm font-bold">
          {expanded ? "Ocultar" : "Editar"}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 border-t border-slate-800 bg-black/20 space-y-6">
              {statusMsg && (
                <div className={`p-4 rounded-xl text-sm font-bold border transition-all ${
                  statusMsg.type === "success" 
                    ? "bg-green-500/10 border-green-500/30 text-green-400" 
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}>
                  {statusMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    Nome de Usuário
                  </label>
                  <input
                    type="text"
                    value={editingUsername}
                    onChange={(e) => setEditingUsername(e.target.value.toLowerCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="Novo nome de usuário"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    Senha do Usuário
                  </label>
                  <input
                    type="text"
                    value={editingPassword}
                    onChange={(e) => setEditingPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                {/* Opcional: url foto */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    URL da Foto de Perfil
                  </label>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                </div>

                {/* Permissões Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    Permissão / Cargo
                  </label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    disabled={user.username === "gymstarsbr" || user.id === "gymstarsbr" || user.email === "f.brunobrito@gmail.com"}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Visitante">Visitante</option>
                    <option value="Ginasta">Ginasta</option>
                    <option value="Árbitro">Árbitro</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                {/* Verificação Selo */}
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 hover:border-slate-700 cursor-pointer transition-colors h-[38px]">
                    <input
                      type="checkbox"
                      checked={verified}
                      onChange={(e) => setVerified(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer accent-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        Selo de Verificação
                      </span>
                    </div>
                  </label>
                </div>

                {tag === "Ginasta" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                        Nome do Ginasta
                      </label>
                      <input
                        value={compName}
                        onChange={(e) => setCompName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="Nome de Exibição"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-2">
                        Equipe (Team)
                        <span className="bg-slate-800 text-slate-500 px-1 py-0.5 rounded text-[8px]">Para TF</span>
                      </label>
                      <select
                        value={team}
                        onChange={(e) => setTeam(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">Independente / Nenhuma</option>
                        {teams.map(t => (
                           <option key={t.id} value={t.title}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                        Música de Solo (URL do áudio)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={musicUrl}
                          onChange={(e) => setMusicUrl(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                          placeholder="https://exemplo.com/musica.mp3"
                        />
                        <button
                          onClick={() => {
                            if (!musicUrl) {
                              setStatusMsg({ text: "Insira uma URL", type: "error" });
                              setTimeout(() => setStatusMsg(null), 4000);
                              return;
                            }
                            let u = musicUrl;
                            if (u?.includes?.("dropbox.com")) u = u.replace(/dl=[012]/, "raw=1");
                            new Audio(u).play().catch(e => {
                              setStatusMsg({ text: "Erro ao tocar: " + e.message, type: "error" });
                              setTimeout(() => setStatusMsg(null), 5000);
                            });
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors border border-slate-700"
                        >
                          Testar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-5">
                 <button
                   onClick={handleDeleteUser}
                   className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold px-6 py-2 rounded-xl text-xs uppercase tracking-widest transition-all border border-red-500/20"
                 >
                   Deletar Conta
                 </button>
                 <button
                   onClick={handleSaveUser}
                   className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-900/20"
                 >
                   Salvar Alterações do Usuário
                 </button>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-amber-500" />
                  Emblemas da Conta
                </h3>

                {currentBadges.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {currentBadges.map((b: any, idx: number) => (
                      <div
                        key={b.id || idx}
                        className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col items-center relative group text-center"
                      >
                        <button
                          onClick={() => handleRemoveBadge(b.id, idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center hover:bg-red-400 shadow-lg shadow-red-900/50"
                        >
                          ×
                        </button>
                        <img
                          src={b.imageUrl}
                          alt={b.name}
                          className="w-10 h-10 object-contain mb-2"
                        />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter leading-tight">
                          {b.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4 bg-black/20 rounded-2xl border border-dashed border-slate-800">
                    Esta conta ainda não possui emblemas.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DEFAULT_CARDS = [
  {
    title: "Competições",
    desc: "Acompanhe eventos ao vivo, rankings e resultados.",
    iconName: "Trophy",
    color: "text-yellow-500",
    link: "/competitions",
  },
  {
    title: "Ginastas",
    desc: "Perfis, medalhas e histórico detalhado das ginastas.",
    iconName: "Users",
    color: "text-blue-500",
    link: "/gymnasts",
  },
  {
    title: "Código",
    desc: "Regras oficiais e código de pontuação atualizado.",
    iconName: "BookOpen",
    color: "text-emerald-500",
    link: "/code",
  },
  {
    title: "Elementos",
    desc: "Aprenda os elementos e seus valores de dificuldade.",
    iconName: "Shapes",
    color: "text-purple-500",
    link: "/elements",
  },
  {
    title: "Quem Somos",
    desc: "Nossa história, missão e compromisso com o GymStars Brasil.",
    iconName: "Sparkles",
    color: "text-indigo-400",
    link: "/quem-somos",
  }
];

const AVAILABLE_ICONS = [
  { name: "Trophy", label: "Troféu" },
  { name: "BookOpen", label: "Livro/Código" },
  { name: "Shapes", label: "Formas/Elementos" },
  { name: "Users", label: "Usuários/Ginastas" },
  { name: "Star", label: "Estrela" },
  { name: "Award", label: "Prêmio/Medalha" },
  { name: "Notebook", label: "Caderno" },
  { name: "Medal", label: "Medalha" },
  { name: "Play", label: "Reproduzir" },
  { name: "Target", label: "Alvo" },
  { name: "Sparkles", label: "Brilhos" },
  { name: "Smile", label: "Sorriso" },
  { name: "Settings", label: "Engrenagem" },
  { name: "Heart", label: "Coração" },
  { name: "Flame", label: "Fogo/Chama" },
  { name: "Shield", label: "Escudo" },
  { name: "MapPin", label: "Localização" },
  { name: "Search", label: "Lupa/Busca" }
];

const AVAILABLE_COLORS = [
  { value: "text-yellow-500", label: "Amarelo", bg: "bg-yellow-500/10" },
  { value: "text-blue-500", label: "Azul", bg: "bg-blue-500/10" },
  { value: "text-emerald-500", label: "Verde", bg: "bg-emerald-500/10" },
  { value: "text-purple-500", label: "Roxo", bg: "bg-purple-500/10" },
  { value: "text-rose-500", label: "Rosa", bg: "bg-rose-500/10" },
  { value: "text-amber-500", label: "Laranja", bg: "bg-amber-500/10" },
  { value: "text-cyan-500", label: "Ciano", bg: "bg-cyan-500/10" },
  { value: "text-red-500", label: "Vermelho", bg: "bg-red-500/10" }
];

const AdminIconMapping: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  BookOpen,
  Shapes,
  Users,
  Star,
  Award,
  Notebook,
  Medal,
  Play,
  Target,
  Sparkles,
  Smile,
  Settings,
  Heart,
  Flame,
  Shield,
  MapPin,
  Search
};

function HomepageContentManager() {
  const [cards, setCards] = useState<any[]>([]);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerType, setBannerType] = useState<"upload" | "url">("upload");
  const [bannerBase64, setBannerBase64] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerLink, setBannerLink] = useState("/");

  const [isBannerLinkMenuOpen, setIsBannerLinkMenuOpen] = useState(false);

  const [cardIconTabs, setCardIconTabs] = useState<Record<number, "gallery" | "custom">>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Expanded card state
  const [expandedCardIdx, setExpandedCardIdx] = useState<number | null>(null);

  useEffect(() => {
    getDoc(doc(db, "appContent", "homepage"))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setBannerEnabled(!!data.bannerEnabled);
          setBannerType(data.bannerType || "upload");
          setBannerBase64(data.bannerBase64 || "");
          setBannerUrl(data.bannerUrl || "");
          setBannerLink(data.bannerLink || "/");

          if (data.cards && Array.isArray(data.cards)) {
            const loadedCards = [...data.cards];
            if (!loadedCards.some(c => c.link === "/quem-somos")) {
              loadedCards.push({
                title: "Quem Somos",
                desc: "Nossa história, missão e compromisso com o GymStars Brasil.",
                iconName: "Sparkles",
                color: "text-indigo-400",
                link: "/quem-somos",
              });
            }
            setCards(loadedCards);
          } else {
            setCards([...DEFAULT_CARDS]);
          }
        } else {
          setCards([...DEFAULT_CARDS]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar homepage:", err);
        setCards([...DEFAULT_CARDS]);
        setLoading(false);
      });
  }, []);

  const handleCardIconUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDimension = 512; // Crisp resolution up to 512px
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
          const compressed = canvas.toDataURL("image/png", 0.95); // High quality
          updateCard(index, { iconBase64: compressed, iconUrl: "", iconName: "" });
          showToast(`Ícone do cartão #${index + 1} salvo com alta qualidade!`, "success");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const showToast = (text: string, type: "success" | "error") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const updateCard = (index: number, fields: any) => {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...fields };
      return next;
    });
  };

  const moveCard = (index: number, dir: -1 | 1) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= cards.length) return;
    setCards((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
    if (expandedCardIdx === index) setExpandedCardIdx(targetIdx);
    else if (expandedCardIdx === targetIdx) setExpandedCardIdx(index);
  };

  const removeCard = (index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
    setExpandedCardIdx(null);
  };

  const addCard = () => {
    const newCard = {
      title: "Novo Atalho",
      desc: "Nova descrição do atalho.",
      iconName: "Star",
      color: "text-teal-500",
      link: "/",
      iconSize: 32
    };
    setCards((p) => [...p, newCard]);
    setExpandedCardIdx(cards.length);
  };

  const saveHomepage = async () => {
    setSaving(true);
    try {
      const payload = {
        type: "homepage",
        title: "Definições da Página Inicial",
        bannerEnabled,
        bannerType,
        bannerBase64: bannerType === "upload" ? bannerBase64 : "",
        bannerUrl: bannerType === "url" ? bannerUrl.trim() : "",
        bannerLink: bannerLink.trim(),
        cards: cards.map((c) => ({
          title: c.title.trim(),
          desc: c.desc.trim(),
          iconName: c.iconName || "",
          iconUrl: c.iconUrl || "",
          iconBase64: c.iconBase64 || "",
          iconSize: Number(c.iconSize) || 32,
          color: c.color || "text-yellow-500",
          link: c.link.trim()
        })),
        updatedAt: Date.now()
      };

      await setDoc(doc(db, "appContent", "homepage"), payload, { merge: true });
      showToast("Tudo certo! As atualizações da Home já estão no ar em tempo real.", "success");
    } catch (e: any) {
      showToast("Ocorreu um erro ao salvar as modificações: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDimension = 1024;
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
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          setBannerBase64(compressed);
          showToast(`Banner carregado com sucesso!`, "success");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const restoreDefault = async () => {
    if (!window.confirm("Deseja mesmo restaurar as configurações originais/padrão da Home? Toda a personalização atual será apagada (excluindo logo e subtítulo que agora permanecem fixos).")) {
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "appContent", "homepage"), {
        cards: [...DEFAULT_CARDS],
        bannerEnabled: false,
        bannerType: "upload",
        bannerBase64: "",
        bannerUrl: "",
        bannerLink: "/"
      });
      setCards([...DEFAULT_CARDS]);
      setBannerEnabled(false);
      setBannerType("upload");
      setBannerBase64("");
      setBannerUrl("");
      setBannerLink("/");
      showToast("Design e links restaurados para as configurações originais!", "success");
    } catch (e: any) {
      showToast("Erro ao restaurar: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-[#009c3b]" />
            Gerenciar Atalhos da Home
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize e personalize os cartões de atalho da página inicial
          </p>
        </div>
        <button
          onClick={restoreDefault}
          disabled={saving}
          className="text-xs font-bold text-slate-400 hover:text-red-400 flex items-center gap-1.5 border border-slate-800 hover:border-red-500/20 px-3 py-1.5 rounded-xl transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar Padrão
        </button>
      </div>

      {statusMsg && (
        <div className={`fixed bottom-6 right-6 z-[9999] p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-2xl border animate-fade-in ${
          statusMsg.type === "success" 
            ? "bg-slate-950 border-green-500/40 text-green-400" 
            : "bg-slate-950 border-red-500/40 text-red-400"
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${statusMsg.type === "success" ? "bg-green-500" : "bg-red-500"} animate-ping shrink-0`} />
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white ml-2 text-xs font-normal transition-colors">✕</button>
        </div>
      )}

      {/* Grid: Edit & Form left, Real-time Mini Preview on the right! */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Forms / Cards List Editor) */}
        <div className="lg:col-span-7 space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              Anúncio em Destaque (Outdoor)
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Topo da Página Inicial</span>
            </h3>
            
            <div className="bg-black/20 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={bannerEnabled} 
                    onChange={e => setBannerEnabled(e.target.checked)} 
                    className="w-4 h-4 rounded text-[#009c3b] bg-slate-900 border-slate-700" 
                  />
                  <span className="text-sm font-bold text-slate-300">Mostrar Anúncio no Topo da Home</span>
                </label>

                <div className="relative">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Destino ao Clicar (Rota)</label>
                  <button 
                    onClick={() => setIsBannerLinkMenuOpen(!isBannerLinkMenuOpen)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs flex items-center justify-between hover:bg-slate-800 transition-colors"
                  >
                    <span className="truncate">
                      {bannerLink === "/" ? "Início (Home)" :
                       bannerLink === "/competitions" ? "Competições" :
                       bannerLink === "/gymnasts" ? "Ginastas" :
                       bannerLink === "/referee" ? "Arbitragem" :
                       bannerLink === "/elements" ? "Quadro de Elementos" :
                       bannerLink === "/chat" ? "Chat GYMSTARS" :
                       bannerLink === "/quem-somos" ? "Quem Somos" : bannerLink || "Selecione um destino"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isBannerLinkMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                     {isBannerLinkMenuOpen && (
                        <>
                           <div className="fixed inset-0 z-40" onClick={() => setIsBannerLinkMenuOpen(false)}></div>
                           <motion.div 
                              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                              className="absolute top-16 left-0 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                           >
                              <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
                                {[
                                  { val: "/", label: "Início (Home)" },
                                  { val: "/competitions", label: "Competições" },
                                  { val: "/gymnasts", label: "Ginastas" },
                                  { val: "/referee", label: "Arbitragem" },
                                  { val: "/elements", label: "Quadro de Elementos" },
                                  { val: "/chat", label: "Chat GYMSTARS" },
                                  { val: "/quem-somos", label: "Quem Somos" },
                                ].map((opt) => (
                                  <button
                                    key={opt.val}
                                    onClick={() => {
                                      setBannerLink(opt.val);
                                      setIsBannerLinkMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-700 transition-colors flex items-center justify-between ${
                                      bannerLink === opt.val ? "text-[#009c3b] bg-[#009c3b]/10" : "text-slate-300"
                                    }`}
                                  >
                                    {opt.label}
                                    {bannerLink === opt.val && <Check className="w-3.5 h-3.5" />}
                                  </button>
                                ))}
                              </div>
                           </motion.div>
                        </>
                     )}
                  </AnimatePresence>
                  <p className="text-[10px] text-slate-500 mt-1 mb-0">Redirecionar usuário ao clicar na imagem.</p>
                </div>

                <div>
                   <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 mt-2">Fonte da Imagem</label>
                   <div className="flex bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-1">
                     <button
                       onClick={() => setBannerType("upload")}
                       className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                         bannerType === "upload" ? "bg-[#009c3b] text-white" : "text-slate-400 hover:bg-slate-800"
                       }`}
                     >
                       Upload / Dispositivo
                     </button>
                     <button
                       onClick={() => setBannerType("url")}
                       className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                         bannerType === "url" ? "bg-[#009c3b] text-white" : "text-slate-400 hover:bg-slate-800"
                       }`}
                     >
                       Link URL
                     </button>
                   </div>
                </div>

                {bannerType === "upload" && (
                   <div>
                     <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mídia do Anúncio (PNG/JPG)</label>
                     <input
                       type="file"
                       accept="image/*"
                       onChange={handleBannerUpload}
                       className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#009c3b] file:text-white hover:file:bg-[#007b2e]"
                     />
                   </div>
                )}
                {bannerType === "url" && (
                   <div>
                     <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">URL Direto</label>
                     <input
                        type="url"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                     />
                     <p className="text-[9px] text-slate-500 mt-1">Insira um link direto para a imagem.</p>
                   </div>
                 )}
              </div>

              {/* Preview */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-0 flex flex-col items-center justify-center relative overflow-hidden aspect-[3/1] w-full mt-4 md:mt-0">
                 {bannerType === "upload" && bannerBase64 ? (
                    <img src={bannerBase64} alt="Outdoor Preview" className="w-full h-full object-cover pointer-events-none select-none" />
                 ) : bannerType === "url" && bannerUrl ? (
                    <img src={bannerUrl} alt="Outdoor Preview" className="w-full h-full object-cover pointer-events-none select-none" />
                 ) : (
                    <div className="text-slate-600 text-xs font-bold uppercase tracking-widest text-center flex flex-col items-center gap-2">
                      <LayoutDashboard className="w-6 h-6 opacity-40" />
                      Sem Mídia
                    </div>
                 )}
              </div>
            </div>
          </div>

          {/* Cards Shortcuts Dynamic Array Editor */}
          <div className="space-y-3 font-sans mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Atalhos / Cartões da Home ({cards.length})
              </label>
              <button
                type="button"
                onClick={addCard}
                className="text-xs text-[#009c3b] hover:text-green-400 font-bold flex items-center gap-1 bg-[#102a1a] hover:bg-[#143d25] border border-[#009c3b]/30 px-3 py-1.5 rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Cartão
              </button>
            </div>

            {/* List of custom Cards */}
            <div className="space-y-2">
              {cards.map((card, idx) => {
                const isExpanded = expandedCardIdx === idx;
                const cardIcon = card.iconBase64 || card.iconUrl;

                return (
                  <div key={idx} className="bg-black/30 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                    
                    {/* Collapsible Header Row */}
                    <div 
                      onClick={() => setExpandedCardIdx(isExpanded ? null : idx)}
                      className="p-3 bg-slate-900/40 hover:bg-slate-900/70 flex items-center justify-between cursor-pointer border-b border-slate-800/40 select-none"
                    >
                      <div className="flex items-center gap-3">
                        {cardIcon && (
                          <div className={`p-1.5 rounded-lg bg-black/40 ${card.color || "text-[#009c3b]"}`}>
                            <img src={cardIcon} alt="" className="w-5 h-5 object-contain" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-white text-sm">{card.title || "(Sem Título)"}</span>
                          <span className="text-[10px] text-slate-500 block">Link: {card.link || "/"}</span>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => moveCard(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-850 rounded disabled:opacity-30 transition-all"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveCard(idx, 1)}
                          disabled={idx === cards.length - 1}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-850 rounded disabled:opacity-30 transition-all"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <span className="text-slate-700 px-1">|</span>
                        <button
                          onClick={() => removeCard(idx)}
                          className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="text-slate-700 px-1">|</span>
                        <div className="text-slate-400 hover:text-white px-2 text-xs font-bold">
                          {isExpanded ? "Ocultar" : "Editar"}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Edit Form */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="p-4 bg-black/10 border-t border-slate-800/40 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 font-sans"
                        >
                          {/* Card Text edits */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Título do Cartão</label>
                              <input
                                type="text"
                                value={card.title}
                                onChange={(e) => updateCard(idx, { title: e.target.value })}
                                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Descrição curta</label>
                              <textarea
                                value={card.desc}
                                onChange={(e) => updateCard(idx, { desc: e.target.value })}
                                rows={2}
                                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Rota interna (Link)</label>
                              <input
                                type="text"
                                value={card.link}
                                onChange={(e) => updateCard(idx, { link: e.target.value })}
                                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                              />
                            </div>
                          </div>

                          {/* Card Icon & Accent Selection */}
                          <div className="space-y-4">
                            {/* Color Accent Picker */}
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Cor Destaque</label>
                              <div className="grid grid-cols-4 gap-1.5">
                                {AVAILABLE_COLORS.map((col) => (
                                  <button
                                    key={col.value}
                                    type="button"
                                    onClick={() => updateCard(idx, { color: col.value })}
                                    className={`py-1 rounded border text-[10px] font-medium transition-all ${
                                      card.color === col.value 
                                        ? "border-[#009c3b] bg-[#009c3b]/10 text-white font-bold" 
                                        : "border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400"
                                    }`}
                                  >
                                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${col.value}`} style={{ backgroundColor: 'currentColor' }} />
                                    {col.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Icon Type Selection - Custom PNG Upload / URL only */}
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Definição do Ícone (Somente PNG Upload/URL)</label>
                              <div className="space-y-3">
                                <div className="space-y-3 bg-black/10 border border-slate-800/40 p-3 rounded-xl font-sans">
                                  {card.iconBase64 ? (
                                    <div className="flex items-center gap-3 bg-black/30 p-2 border border-slate-800 rounded-lg">
                                      <div className="bg-[#009c3b]/10 border border-[#009c3b]/20 p-2 rounded-lg shrink-0">
                                        <img src={card.iconBase64} alt="" className="w-8 h-8 object-contain" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">Ícone PNG Customizado</p>
                                        <p className="text-[9px] text-slate-400 truncate">Salvo em base64 compactada</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateCard(idx, { iconBase64: "", iconUrl: "", iconName: "" });
                                        }}
                                        className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-950/20 px-2.5 py-1.5 rounded-lg border border-red-900/30 transition-all shrink-0"
                                      >
                                        Excluir PNG / Limpar
                                      </button>
                                    </div>
                                  ) : card.iconUrl ? (
                                    <div className="flex items-center gap-3 bg-black/30 p-2 border border-slate-800 rounded-lg">
                                      <div className="bg-[#009c3b]/10 border border-[#009c3b]/20 p-2 rounded-lg shrink-0">
                                        <img src={card.iconUrl} alt="" className="w-8 h-8 object-contain" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">URL do Ícone PNG</p>
                                        <p className="text-[9px] text-slate-400 truncate">{card.iconUrl}</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateCard(idx, { iconBase64: "", iconUrl: "", iconName: "" });
                                        }}
                                        className="text-[10px] font-bold text-red-550 hover:text-red-400 bg-red-950/20 px-2.5 py-1.5 rounded-lg border border-red-900/30 transition-all shrink-0"
                                      >
                                        Resetar PNG
                                      </button>
                                    </div>
                                  ) : null}

                                  <div className="grid grid-cols-1 gap-2">
                                    <label className="flex flex-col items-center justify-center py-2.5 bg-slate-900/40 hover:bg-slate-900/80 border border-dashed border-slate-700 hover:border-[#009c3b] rounded-lg cursor-pointer transition-all text-[10px] font-bold text-slate-400 group">
                                      <Upload className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform mb-1" />
                                      <span>{card.iconBase64 || card.iconUrl ? "Substituir com Novo PNG" : "Fazer Upload de Ícone PNG"}</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleCardIconUpload(idx, e)}
                                        className="hidden"
                                      />
                                    </label>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Ou insira link de imagem direta (URL):</span>
                                    <input
                                      type="url"
                                      placeholder="https://exemplo.com/icon.png"
                                      value={card.iconUrl || ""}
                                      onChange={(e) => updateCard(idx, { iconUrl: e.target.value, iconBase64: "", iconName: "" })}
                                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-[#009c3b]"
                                    />
                                  </div>
                                </div>

                                      {/* Ajustar Tamanho do Ícone */}
                                      <div className="bg-black/45 p-3 rounded-xl border border-slate-800/80 space-y-2.5 mt-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] font-bold text-slate-350 uppercase tracking-wider">Ajustar Tamanho do Ícone</span>
                                          <span className="text-xs font-mono font-bold text-[#009c3b] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                            {card.iconSize || 32}px
                                          </span>
                                        </div>

                                        {/* Range Slider */}
                                        <div className="space-y-1 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                                          <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                                            <span>ARRASTE PARA DEFINIR O TAMANHO:</span>
                                          </div>
                                          <input
                                            type="range"
                                            min="16"
                                            max="256"
                                            step="2"
                                            value={card.iconSize || 32}
                                            onChange={(e) => updateCard(idx, { iconSize: Number(e.target.value) })}
                                            className="w-full accent-[#009c3b] cursor-pointer h-1.5 bg-slate-900 rounded-lg outline-none"
                                          />
                                        </div>

                                        {/* Quick Selection Buttons */}
                                        <div className="flex flex-wrap items-center gap-1">
                                          {[
                                            { label: "P (16px)", val: 16 },
                                            { label: "M (32px)", val: 32 },
                                            { label: "G (48px)", val: 48 },
                                            { label: "GG (64px)", val: 64 },
                                            { label: "EEG (96px)", val: 96 },
                                            { label: "Giga (128px)", val: 128 },
                                            { label: "Colo (192px)", val: 192 }
                                          ].map((sz) => (
                                            <button
                                              key={sz.val}
                                              type="button"
                                              onClick={() => updateCard(idx, { iconSize: sz.val })}
                                              className={`px-1.5 py-1 rounded text-[9px] font-bold border transition-all ${
                                                (card.iconSize || 32) === sz.val 
                                                  ? "border-[#009c3b] bg-[#009c3b]/10 text-white font-bold" 
                                                  : "border-slate-800 bg-slate-900 text-slate-450 hover:text-slate-200"
                                              }`}
                                            >
                                              {sz.label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Main Action Bar */}
          <div className="flex gap-3 pt-3 border-t border-slate-800 justify-end font-sans">
            <button
              type="button"
              onClick={saveHomepage}
              disabled={saving}
              className="bg-[#009c3b] hover:bg-green-500 text-white font-bold px-7 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-green-950/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? "Salvando..." : "Salvar Personalizações"}
            </button>
          </div>
        </div>

        {/* Right Column (Visual Mock Preview/Dashboard) */}
        <div 
          className="lg:col-span-5 bg-[#050B14] p-5 rounded-2xl border border-slate-800/80 h-fit space-y-5 select-none mt-4 lg:mt-0 lg:sticky lg:top-6"
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
        >
          <span className="text-[10px] font-black uppercase text-[#009c3b] tracking-wider block mb-1">
            Visualização dos Atalhos da Home
          </span>
          
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-sans">
            {cards.map((c, i) => {
              const miniIcon = c.iconBase64 || c.iconUrl;
              const displaySize = (c.iconSize || 32) * 0.625;

              return (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-left">
                  <div className="flex items-center gap-3">
                    {miniIcon && (
                      <div className={`p-1.5 rounded-lg bg-black/40 flex items-center justify-center shrink-0 ${c.color || "text-[#009c3b]"}`}>
                        <img 
                          src={miniIcon} 
                          alt="" 
                          className="object-contain rounded" 
                          style={{ width: `${displaySize}px`, height: `${displaySize}px` }}
                        />
                      </div>
                    )}
                    <div>
                      <span className="font-black italic uppercase tracking-tighter text-white text-xs block">{c.title || "(Sem Título)"}</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1 leading-normal">{c.desc}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

function AppBrandingManager() {
  const [authTitle, setAuthTitle] = useState("Portal de Resultados & Arbitragem");
  const [authHelpText, setAuthHelpText] = useState("Dúvidas ou problemas? Contate a comissão GYMSTARS BRASIL.");
  
  // Custom Logos configurations
  const [sidebarLogoType, setSidebarLogoType] = useState<"default" | "upload" | "url">("default");
  const [sidebarLogoBase64, setSidebarLogoBase64] = useState("");
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState("");
  const [sidebarLogoHeight, setSidebarLogoHeight] = useState<number>(20);

  const [mobileLogoType, setMobileLogoType] = useState<"default" | "upload" | "url">("default");
  const [mobileLogoBase64, setMobileLogoBase64] = useState("");
  const [mobileLogoUrl, setMobileLogoUrl] = useState("");
  const [mobileLogoHeight, setMobileLogoHeight] = useState<number>(20);

  const [authLogoType, setAuthLogoType] = useState<"default" | "upload" | "url">("default");
  const [authLogoBase64, setAuthLogoBase64] = useState("");
  const [authLogoUrl, setAuthLogoUrl] = useState("");
  const [authLogoHeight, setAuthLogoHeight] = useState<number>(40);

  const [feedLogoBase64, setFeedLogoBase64] = useState("");
  const [feedLogoUrl, setFeedLogoUrl] = useState("");
  const [feedLogoType, setFeedLogoType] = useState<"default" | "upload" | "url">("default");

  const [menuIcons, setMenuIcons] = useState<Record<string, string>>({});
  const [menuIconsSize, setMenuIconsSize] = useState<number>(24);

  const [apparatusIcons, setApparatusIcons] = useState<Record<string, string>>({});
  const [apparatusNames, setApparatusNames] = useState<Record<string, string>>({
    solo: "Solo",
    salto: "Salto",
    paralelas: "Paralelas Assimétricas",
    trave: "Trave"
  });
  const [apparatusIconsSize, setApparatusIconsSize] = useState<number>(44);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    getDoc(doc(db, "appContent", "branding"))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.authTitle) setAuthTitle(data.authTitle);
          if (data.authHelpText) setAuthHelpText(data.authHelpText);
          if (data.sidebarLogoHeight) setSidebarLogoHeight(Number(data.sidebarLogoHeight) || 20);
          if (data.mobileLogoHeight) setMobileLogoHeight(Number(data.mobileLogoHeight) || 20);
          if (data.authLogoHeight) setAuthLogoHeight(Number(data.authLogoHeight) || 40);
          if (data.menuIcons) setMenuIcons(data.menuIcons);
          if (data.menuIconsSize) setMenuIconsSize(Number(data.menuIconsSize) || 24);
          if (data.apparatusIcons) setApparatusIcons(data.apparatusIcons);
          if (data.apparatusNames) setApparatusNames(prev => ({ ...prev, ...data.apparatusNames }));
          if (data.apparatusIconsSize) setApparatusIconsSize(Number(data.apparatusIconsSize) || 44);
          
          if (data.sidebarLogoBase64) {
            setSidebarLogoBase64(data.sidebarLogoBase64);
            setSidebarLogoType("upload");
          } else if (data.sidebarLogoUrl) {
            setSidebarLogoUrl(data.sidebarLogoUrl);
            setSidebarLogoType("url");
          } else {
            setSidebarLogoType("default");
          }

          if (data.mobileLogoBase64) {
            setMobileLogoBase64(data.mobileLogoBase64);
            setMobileLogoType("upload");
          } else if (data.mobileLogoUrl) {
            setMobileLogoUrl(data.mobileLogoUrl);
            setMobileLogoType("url");
          } else {
            setMobileLogoType("default");
          }

          if (data.authLogoBase64) {
            setAuthLogoBase64(data.authLogoBase64);
            setAuthLogoType("upload");
          } else if (data.authLogoUrl) {
            setAuthLogoUrl(data.authLogoUrl);
            setAuthLogoType("url");
          } else {
            setAuthLogoType("default");
          }

          if (data.feedLogoBase64) {
            setFeedLogoBase64(data.feedLogoBase64);
            setFeedLogoType("upload");
          } else if (data.feedLogoUrl) {
            setFeedLogoUrl(data.feedLogoUrl);
            setFeedLogoType("url");
          } else {
            setFeedLogoType("default");
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar branding:", err);
        setLoading(false);
      });
  }, []);

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleImageUpload = (section: "sidebar" | "mobile" | "auth" | "feed", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 300;
        const maxHeight = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((img.width * maxHeight) / img.height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/png", 0.82);
          
          if (section === "sidebar") {
            setSidebarLogoBase64(compressed);
            setSidebarLogoType("upload");
          } else if (section === "mobile") {
            setMobileLogoBase64(compressed);
            setMobileLogoType("upload");
          } else if (section === "auth") {
            setAuthLogoBase64(compressed);
            setAuthLogoType("upload");
          } else if (section === "feed") {
            setFeedLogoBase64(compressed);
            setFeedLogoType("upload");
          }
          showToast("Logo carregada e compactada com sucesso!", "success");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleMenuIconUpload = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 100;
        const maxHeight = 100;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/png", 0.9);
          setMenuIcons(prev => ({ ...prev, [key]: compressed }));
          showToast(`Ícone para ${key} carregado!`, "success");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleApparatusIconUpload = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 512;
        const maxHeight = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/png", 0.9);
          setApparatusIcons(prev => ({ ...prev, [key]: compressed }));
          showToast(`Ícone de aparelho para ${key} carregado!`, "success");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      const payload = {
        type: "branding",
        title: "Personalização de Visual & Autenticação",
        authTitle: authTitle.trim(),
        authHelpText: authHelpText.trim(),
        sidebarLogoBase64: sidebarLogoType === "upload" ? sidebarLogoBase64 : "",
        sidebarLogoUrl: sidebarLogoType === "url" ? sidebarLogoUrl.trim() : "",
        sidebarLogoHeight: sidebarLogoHeight,
        mobileLogoBase64: mobileLogoType === "upload" ? mobileLogoBase64 : "",
        mobileLogoUrl: mobileLogoType === "url" ? mobileLogoUrl.trim() : "",
        mobileLogoHeight: mobileLogoHeight,
        authLogoBase64: authLogoType === "upload" ? authLogoBase64 : "",
        authLogoUrl: authLogoType === "url" ? authLogoUrl.trim() : "",
        authLogoHeight: authLogoHeight,
        feedLogoBase64: feedLogoType === "upload" ? feedLogoBase64 : "",
        feedLogoUrl: feedLogoType === "url" ? feedLogoUrl.trim() : "",
        menuIcons,
        menuIconsSize,
        apparatusIcons,
        apparatusNames,
        apparatusIconsSize,
        updatedAt: Date.now()
      };

      await setDoc(doc(db, "appContent", "branding"), payload);
      showToast("Configurações de logos e tela de login atualizadas em tempo real!", "success");
    } catch (e: any) {
      showToast("Erro ao salvar: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const restoreBrandingDefault = async () => {
    if (!window.confirm("Deseja mesmo restaurar todas as logos e textos de login para a configuração original?")) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "appContent", "branding"));
      setAuthTitle("Portal de Resultados & Arbitragem");
      setAuthHelpText("Dúvidas ou problemas? Contate a comissão GYMSTARS BRASIL.");
      setSidebarLogoType("default");
      setSidebarLogoBase64("");
      setSidebarLogoUrl("");
      setSidebarLogoHeight(20);
      setMobileLogoType("default");
      setMobileLogoBase64("");
      setMobileLogoUrl("");
      setMobileLogoHeight(20);
      setAuthLogoType("default");
      setMenuIcons({});
      setMenuIconsSize(24);
      setApparatusIcons({});
      setApparatusIconsSize(44);
      setApparatusNames({
        solo: "Solo",
        salto: "Salto",
        paralelas: "Paralelas Assimétricas",
        trave: "Trave"
      });
      setAuthLogoBase64("");
      setAuthLogoUrl("");
      setAuthLogoHeight(40);
      showToast("Logos e layouts restaurados para o padrão do sistema!", "success");
    } catch (e: any) {
      showToast("Erro ao restaurar: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            Personalizar Logos e Tela de Login/Cadastro
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Modifique independentemente as logos do menu lateral (Desktop), cabeçalho (Mobile) e customize textos/logos da tela de login
          </p>
        </div>
        <button
          onClick={restoreBrandingDefault}
          disabled={saving}
          className="text-xs font-bold text-slate-400 hover:text-red-400 flex items-center gap-1.5 border border-slate-800 hover:border-red-500/20 px-3 py-1.5 rounded-xl transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar Padrão
        </button>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-2xl border animate-fade-in ${
          toast.type === "success" 
            ? "bg-slate-950 border-green-500/40 text-green-400" 
            : "bg-slate-950 border-red-500/40 text-red-400"
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === "success" ? "bg-green-500" : "bg-red-500"} animate-ping shrink-0`} />
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2 text-xs font-normal transition-colors">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form controls */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Logo Menu Lateral Desktop */}
          <div className="bg-black/30 p-4 rounded-2xl border border-slate-800/60 space-y-3 font-sans">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Logo do Menu Lateral Desktop
            </label>
            <div className="flex gap-2 p-1 bg-black/40 rounded-xl max-w-sm">
              <button
                type="button"
                onClick={() => setSidebarLogoType("default")}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sidebarLogoType === "default" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Padrão (Fixo)
              </button>
              <button
                type="button"
                onClick={() => setSidebarLogoType("upload")}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sidebarLogoType === "upload" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Upload PNG
              </button>
              <button
                type="button"
                onClick={() => setSidebarLogoType("url")}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sidebarLogoType === "url" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                URL Direta
              </button>
            </div>

            {sidebarLogoType === "upload" && (
              <div className="flex items-center gap-3">
                <label className="flex-1 flex flex-col justify-center items-center py-3 bg-slate-800/10 hover:bg-slate-800/30 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-all text-slate-400 text-xs">
                  <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                  <span>Selecione PNG da Logo do Menu</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload("sidebar", e)}
                    className="hidden"
                  />
                </label>
                {sidebarLogoBase64 && (
                  <div className="bg-black/40 border border-slate-800 p-2 rounded-xl flex flex-col items-center">
                    <img src={sidebarLogoBase64} alt="Design preview" className="h-8 object-contain" />
                    <span className="text-[8px] text-slate-500 mt-1">Prévia Otimizada</span>
                  </div>
                )}
              </div>
            )}

            {sidebarLogoType === "url" && (
              <input
                type="url"
                placeholder="https://exemplo.com/logo-sidebar.png"
                value={sidebarLogoUrl}
                onChange={(e) => setSidebarLogoUrl(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            )}

            {sidebarLogoType !== "default" && (
              <div className="bg-black/45 p-3.5 rounded-xl border border-slate-800/80 space-y-3 mt-2 font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Ajustar Altura da Logo do Menu</span>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {sidebarLogoHeight}px
                  </span>
                </div>

                {/* Range slider for fluid size changes */}
                <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                  <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold">
                    <span>ARRASTE PARA REDIMENSIONAR LIVREMENTE:</span>
                    <span className="text-indigo-400 font-mono">{sidebarLogoHeight}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="2"
                    value={sidebarLogoHeight}
                    onChange={(e) => setSidebarLogoHeight(Number(e.target.value))}
                    className="w-full accent-indigo-550 cursor-pointer h-1.5 bg-slate-900 rounded-lg outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSidebarLogoHeight(Math.max(10, sidebarLogoHeight - 2))}
                    className="p-1 bg-slate-850 text-white rounded font-bold w-7 h-7 flex items-center justify-center border border-slate-700 hover:bg-slate-700"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarLogoHeight(Math.min(500, sidebarLogoHeight + 2))}
                    className="p-1 bg-slate-850 text-white rounded font-bold w-7 h-7 flex items-center justify-center border border-slate-700 hover:bg-slate-700"
                  >
                    +
                  </button>
                  <div className="h-4 w-px bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => setSidebarLogoHeight(16)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${sidebarLogoHeight === 16 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    P (16px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarLogoHeight(28)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${sidebarLogoHeight === 28 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    M (28px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarLogoHeight(48)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${sidebarLogoHeight === 48 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    G (48px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarLogoHeight(72)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${sidebarLogoHeight === 72 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    GG (72px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarLogoHeight(120)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${sidebarLogoHeight === 120 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    EEG (120px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarLogoHeight(180)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${sidebarLogoHeight === 180 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    Gigante (180px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarLogoHeight(250)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${sidebarLogoHeight === 250 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    Colossal (250px)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logo Cabeçalho Mobile */}
          <div className="bg-black/30 p-4 rounded-2xl border border-slate-800/60 space-y-3 font-sans">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Logo do Cabeçalho Mobile
            </label>
            <div className="flex gap-2 p-1 bg-black/40 rounded-xl max-w-sm">
              <button
                type="button"
                onClick={() => setMobileLogoType("default")}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mobileLogoType === "default" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Padrão (Fixo)
              </button>
              <button
                type="button"
                onClick={() => setMobileLogoType("upload")}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mobileLogoType === "upload" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Upload PNG
              </button>
              <button
                type="button"
                onClick={() => setMobileLogoType("url")}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mobileLogoType === "url" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                URL Direta
              </button>
            </div>

            {mobileLogoType === "upload" && (
              <div className="flex items-center gap-3">
                <label className="flex-1 flex flex-col justify-center items-center py-3 bg-slate-800/10 hover:bg-slate-800/30 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-all text-slate-400 text-xs">
                  <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                  <span>Selecione PNG da Logo do Cabeçalho</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload("mobile", e)}
                    className="hidden"
                  />
                </label>
                {mobileLogoBase64 && (
                  <div className="bg-black/40 border border-slate-800 p-2 rounded-xl flex flex-col items-center">
                    <img src={mobileLogoBase64} alt="Header preview" className="h-6 object-contain" />
                    <span className="text-[8px] text-slate-500 mt-1">Prévia Otimizada</span>
                  </div>
                )}
              </div>
            )}

            {mobileLogoType === "url" && (
              <input
                type="url"
                placeholder="https://exemplo.com/logo-mobile.png"
                value={mobileLogoUrl}
                onChange={(e) => setMobileLogoUrl(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            )}

            {mobileLogoType !== "default" && (
              <div className="bg-black/45 p-3.5 rounded-xl border border-slate-800/80 space-y-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Ajustar Altura da Logo Mobile</span>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {mobileLogoHeight}px
                  </span>
                </div>

                {/* Mobile logo slider for real-time adjustments */}
                <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                  <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold">
                    <span>ARRASTE PARA REDIMENSIONAR LIVREMENTE:</span>
                    <span className="text-indigo-400 font-mono">{mobileLogoHeight}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="400"
                    step="2"
                    value={mobileLogoHeight}
                    onChange={(e) => setMobileLogoHeight(Number(e.target.value))}
                    className="w-full accent-indigo-550 cursor-pointer h-1.5 bg-slate-900 rounded-lg outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setMobileLogoHeight(Math.max(10, mobileLogoHeight - 2))}
                    className="p-1 bg-slate-850 text-white rounded font-bold w-7 h-7 flex items-center justify-center border border-slate-700 hover:bg-slate-700"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileLogoHeight(Math.min(400, mobileLogoHeight + 2))}
                    className="p-1 bg-slate-850 text-white rounded font-bold w-7 h-7 flex items-center justify-center border border-slate-700 hover:bg-slate-700"
                  >
                    +
                  </button>
                  <div className="h-4 w-px bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => setMobileLogoHeight(16)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${mobileLogoHeight === 16 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    P (16px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileLogoHeight(28)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${mobileLogoHeight === 28 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    M (28px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileLogoHeight(48)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${mobileLogoHeight === 48 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    G (48px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileLogoHeight(80)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${mobileLogoHeight === 80 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    GG (80px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileLogoHeight(120)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${mobileLogoHeight === 120 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    EEG (120px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileLogoHeight(180)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${mobileLogoHeight === 180 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    Gigante (180px)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Foto de Perfil do Feed (Mural) */}
          <div className="bg-black/30 p-4 rounded-2xl border border-slate-800/60 space-y-3 font-sans">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Foto de Perfil do Mural (Postador Oficial)
            </label>
            <p className="text-[10px] text-slate-500 mb-2">Configure a foto que aparecerá ao lado do nome GYMSTARS BRASIL em cada post oficial.</p>
            <div className="flex gap-2 p-1 bg-black/40 rounded-xl max-w-sm">
              <button
                type="button"
                onClick={() => setFeedLogoType("default")}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                  feedLogoType === "default" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Vetor SVG
              </button>
              <button
                type="button"
                onClick={() => setFeedLogoType("upload")}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                  feedLogoType === "upload" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Upload PNG
              </button>
              <button
                type="button"
                onClick={() => setFeedLogoType("url")}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                  feedLogoType === "url" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                URL Direta
              </button>
            </div>

            {feedLogoType === "upload" && (
              <div className="flex items-center gap-3">
                <label className="flex-1 flex flex-col justify-center items-center py-3 bg-slate-800/10 hover:bg-slate-800/30 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-all text-slate-400 text-xs">
                  <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                  <span>Selecione PNG para Perfil do Mural</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload("feed", e)}
                    className="hidden"
                  />
                </label>
                {feedLogoBase64 && (
                  <div className="bg-black/40 border border-slate-800 p-2 rounded-xl flex flex-col items-center">
                    <img src={feedLogoBase64} alt="Feed profil preview" className="w-8 h-8 rounded-full object-cover" />
                    <span className="text-[8px] text-slate-500 mt-1">Perfil (300px)</span>
                  </div>
                )}
              </div>
            )}

            {feedLogoType === "url" && (
              <input
                type="url"
                placeholder="https://exemplo.com/perfil-feed.png"
                value={feedLogoUrl}
                onChange={(e) => setFeedLogoUrl(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            )}
          </div>

          {/* Configuração da Tela de Auth */}
          <div className="bg-black/30 p-4 rounded-2xl border border-slate-800/60 space-y-4 font-sans">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-200">
              Personalização da Tela de Autenticação (Login & Cadastro)
            </span>

            {/* Auth Page Logo Option */}
            <div className="space-y-2">
              <span className="block text-[11px] text-slate-400 uppercase tracking-widest font-bold">Logo da Tela de Autenticação</span>
              <div className="flex gap-2 p-1 bg-black/40 rounded-xl max-w-sm">
                <button
                  type="button"
                  onClick={() => setAuthLogoType("default")}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                    authLogoType === "default" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Padrão (Fixo)
                </button>
                <button
                  type="button"
                  onClick={() => setAuthLogoType("upload")}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                    authLogoType === "upload" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Upload PNG
                </button>
                <button
                  type="button"
                  onClick={() => setAuthLogoType("url")}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                    authLogoType === "url" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  URL Direta
                </button>
              </div>

              {authLogoType === "upload" && (
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex flex-col justify-center items-center py-3 bg-slate-800/10 hover:bg-slate-800/30 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-all text-slate-400 text-xs">
                    <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                    <span>Selecione PNG da Logo de Auth</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload("auth", e)}
                      className="hidden"
                    />
                  </label>
                  {authLogoBase64 && (
                    <div className="bg-black/40 border border-slate-800 p-2 rounded-xl flex flex-col items-center">
                      <img src={authLogoBase64} alt="Auth preview" className="h-8 object-contain" />
                      <span className="text-[8px] text-slate-500 mt-1">Prévia Otimizada</span>
                    </div>
                  )}
                </div>
              )}

              {authLogoType === "url" && (
                <input
                  type="url"
                  placeholder="https://exemplo.com/logo-auth.png"
                  value={authLogoUrl}
                  onChange={(e) => setAuthLogoUrl(e.target.value)}
                  className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              )}

              {authLogoType !== "default" && (
                <div className="bg-black/45 p-3.5 rounded-xl border border-slate-800/80 space-y-3 mt-2 font-sans">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Ajustar Altura da Logo de Auth</span>
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {authLogoHeight}px
                    </span>
                  </div>

                  {/* Auth custom logo height range slider */}
                  <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                    <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold">
                      <span>ARRASTE PARA REDIMENSIONAR LIVREMENTE:</span>
                      <span className="text-indigo-400 font-mono">{authLogoHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="600"
                      step="4"
                      value={authLogoHeight}
                      onChange={(e) => setAuthLogoHeight(Number(e.target.value))}
                      className="w-full accent-indigo-550 cursor-pointer h-1.5 bg-slate-900 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthLogoHeight(Math.max(20, authLogoHeight - 4))}
                      className="p-1 bg-slate-850 text-white rounded font-bold w-7 h-7 flex items-center justify-center border border-slate-700 hover:bg-slate-700"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthLogoHeight(Math.min(600, authLogoHeight + 4))}
                      className="p-1 bg-slate-850 text-white rounded font-bold w-7 h-7 flex items-center justify-center border border-slate-700 hover:bg-slate-700"
                    >
                      +
                    </button>
                    <div className="h-4 w-px bg-slate-800" />
                    <button
                      type="button"
                      onClick={() => setAuthLogoHeight(40)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${authLogoHeight === 40 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                    >
                      P (40px)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthLogoHeight(80)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${authLogoHeight === 80 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                    >
                      M (80px)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthLogoHeight(150)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${authLogoHeight === 150 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                    >
                      G (150px)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthLogoHeight(240)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${authLogoHeight === 240 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                    >
                      GG (240px)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthLogoHeight(360)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${authLogoHeight === 360 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                    >
                      EEG (360px)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthLogoHeight(480)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${authLogoHeight === 480 ? "border-indigo-500 bg-indigo-550/20 text-white" : "border-slate-700 text-slate-400"}`}
                    >
                      Gigante (480px)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthLogoHeight(580)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${authLogoHeight === 580 ? "border-[#009c3b] bg-[#009c3b]/10 text-white" : "border-slate-700 text-slate-400"}`}
                    >
                      Colossal (580px)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom texts for Auth Title and Custom help contacts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Identificação / Subtítulo</label>
                <input
                  type="text"
                  value={authTitle}
                  onChange={(e) => setAuthTitle(e.target.value)}
                  placeholder="Ex: Portal de Resultados & Arbitragem"
                  className="w-full bg-black/45 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#009c3b] focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Texto de Rodapé da Página</label>
                <input
                  type="text"
                  value={authHelpText}
                  onChange={(e) => setAuthHelpText(e.target.value)}
                  placeholder="Ex: Dúvidas? Contate a comissão..."
                  className="w-full bg-black/45 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:border-[#009c3b] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Custom Menu Icons */}
          <div className="bg-black/30 p-4 rounded-2xl border border-slate-800/60 space-y-3 font-sans mt-6">
             <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 border-b border-slate-800 pb-2">
                Ícones Customizados do Menu (Início, Bate-papo, etc)
             </label>
             <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
               Faça upload de ícones em PNG de alta qualidade para substituir os símbolos das páginas.
             </p>
             <div className="mb-4 bg-black/40 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Tamanho dos Ícones (px)</span>
                <input
                  type="number"
                  min="16"
                  max="48"
                  value={menuIconsSize}
                  onChange={(e) => setMenuIconsSize(Number(e.target.value))}
                  className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-center text-white focus:outline-none focus:border-indigo-500"
                />
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {[
                 { id: "inicio", label: "Início" },
                 { id: "quemSomos", label: "Quem Somos" },
                 { id: "competicoes", label: "Competições" },
                 { id: "codigo", label: "Código" },
                 { id: "elementos", label: "Elementos" },
                 { id: "ginastas", label: "Ginastas" },
                 { id: "batePapo", label: "Bate-papo" },
                 { id: "arbitragem", label: "Arbitragem" },
                 { id: "admin", label: "Painel Adm." }
               ].map((item) => (
                 <div key={item.id} className="flex items-center justify-between bg-black/40 border border-slate-800/60 rounded-xl p-3">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 p-1">
                       {menuIcons[item.id] ? (
                         <img src={menuIcons[item.id]} alt="" className="w-full h-full object-contain" />
                       ) : (
                         <span className="text-[9px] text-slate-600 font-bold">Vazio</span>
                       )}
                     </div>
                     <span className="text-xs font-bold text-slate-300">{item.label}</span>
                   </div>
                   <label className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all uppercase tracking-wider">
                     {menuIcons[item.id] ? "Trocar" : "Upload"}
                     <input
                       type="file"
                       accept="image/*"
                       onChange={(e) => handleMenuIconUpload(item.id, e)}
                       className="hidden"
                     />
                   </label>
                 </div>
               ))}
             </div>
          </div>

              {/* Apparatuses Customizer */}
              <div className="bg-black/30 p-4 rounded-2xl border border-slate-800/60 space-y-3 font-sans mt-6">
                 <label className="block text-xs font-bold uppercase tracking-wider text-[#00a84c] mb-2 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00a84c]"></span>
                    Categoria das Fichas de Elementos (Aparelhos)
                 </label>
                 <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                    Personalize os nomes de exibição, envie ícones cristalinos de alta definição em arquivos PNG e controle a escala milimétrica do tamanho dos ícones na listagem geral.
                 </p>

                 {/* Icon Size Slider */}
                 <div className="bg-black/20 border border-slate-800/50 rounded-xl p-3 mb-4 space-y-2">
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-slate-300 font-sans">Tamanho de exibição dos ícones dos aparelhos</span>
                       <span className="text-xs font-bold bg-indigo-500/15 text-indigo-400 px-2.5 py-0.5 rounded-lg border border-indigo-500/20 font-mono">{apparatusIconsSize || 44}px</span>
                    </div>
                    <input
                       type="range"
                       min="24"
                       max="96"
                       value={apparatusIconsSize || 44}
                       onChange={(e) => setApparatusIconsSize(Number(e.target.value))}
                       className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                       <span>Pequeno (24px)</span>
                       <span>Médio (48px)</span>
                       <span>Grande (96px)</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {[
                     { id: "solo", defaultLabel: "Solo" },
                     { id: "salto", defaultLabel: "Salto" },
                     { id: "paralelas", defaultLabel: "Paralelas Assimétricas" },
                     { id: "trave", defaultLabel: "Trave" }
                   ].map((item) => (
                     <div key={item.id} className="bg-black/40 border border-slate-800/60 rounded-xl p-3 space-y-3">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Aparelho</span>
                         <label className="bg-indigo-500/15 text-indigo-400 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all uppercase tracking-wider">
                           {apparatusIcons[item.id] ? "Trocar" : "Upload"}
                           <input
                             type="file"
                             accept="image/*"
                             onChange={(e) => handleApparatusIconUpload(item.id, e)}
                             className="hidden"
                           />
                         </label>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 p-1">
                           {apparatusIcons[item.id] ? (
                             <img src={apparatusIcons[item.id]} alt="" className="w-full h-full object-contain" />
                           ) : (
                             <span className="text-[9px] text-slate-600 font-bold font-mono">Sem Ícone</span>
                           )}
                         </div>
                         <div className="flex-1">
                           <input
                             type="text"
                             value={apparatusNames[item.id] !== undefined ? apparatusNames[item.id] : item.defaultLabel}
                             onChange={(e) => {
                               const val = e.target.value;
                               setApparatusNames(prev => ({ ...prev, [item.id]: val }));
                             }}
                             placeholder={item.defaultLabel}
                             className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                           />
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>

          {/* Action Bar */}
          <div className="flex justify-end pt-2 mt-6">
            <button
              onClick={saveBranding}
              disabled={saving}
              className="bg-[#009c3b] hover:bg-green-500 text-white font-bold px-8 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-green-950/20 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar Configurações Visuais"}
            </button>
          </div>

        </div>

        {/* Right Preview Column */}
        <div className="lg:col-span-5 bg-[#050B14] p-5 rounded-2xl border border-slate-800/80 h-fit space-y-5">
          <span className="text-[10px] font-black uppercase text-[#009c3b] tracking-wider block mb-1">
            Visualizações Prévias em Tempo Real
          </span>

          {/* Preview: Auth Screen layout draft */}
          <div className="bg-[#070F1C] border border-slate-800 p-4 rounded-xl flex flex-col items-center">
            <span className="text-[9px] font-black uppercase text-slate-500 block mb-2 text-center w-full pb-1 border-b border-white/5 select-none">
              Página de Autenticação (Preview)
            </span>
            <div className="w-full max-w-[200px] border border-slate-800 bg-[#070F1C]/30 rounded-xl p-3 text-center space-y-3">
              <div className="flex flex-col items-center">
                {authLogoType === "upload" && authLogoBase64 ? (
                  <img src={authLogoBase64} alt="" style={{ height: `${authLogoHeight}px` }} className="object-contain" />
                ) : authLogoType === "url" && authLogoUrl ? (
                  <img src={authLogoUrl} alt="" style={{ height: `${authLogoHeight}px` }} className="object-contain" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Star className="w-5 h-5 text-yellow-500 animate-spin-slow mb-0.5" />
                    <div className="text-[8px] font-black text-white leading-none tracking-widest">GYMSTARS</div>
                  </div>
                )}
                <span className="text-slate-400 text-[7px] font-black uppercase tracking-widest mt-1.5 leading-tight">{authTitle}</span>
              </div>
              <div className="h-3.5 bg-slate-900 border border-slate-850 rounded" />
              <div className="h-3.5 bg-slate-900 border border-slate-850 rounded" />
              <div className="text-[6.5px] text-slate-500 leading-normal border-t border-slate-900/60 pt-2 font-sans select-none">
                {authHelpText}
              </div>
            </div>
          </div>

          {/* Preview Side menu */}
          <div className="bg-[#070F1C] border border-slate-800 p-4 rounded-xl">
            <span className="text-[9px] font-black uppercase text-slate-500 block mb-2 text-center w-full pb-1 border-b border-white/5 select-none">
              Menu Lateral Desktop (Preview)
            </span>
            <div className="flex items-center gap-2 bg-[#050B14] p-2 rounded-lg border border-slate-850">
              <div className="pr-2 border-r border-slate-800 py-0.5 max-w-[120px]">
                {sidebarLogoType === "upload" && sidebarLogoBase64 ? (
                  <img src={sidebarLogoBase64} alt="" style={{ height: `${sidebarLogoHeight}px` }} className="object-contain" />
                ) : sidebarLogoType === "url" && sidebarLogoUrl ? (
                  <img src={sidebarLogoUrl} alt="" style={{ height: `${sidebarLogoHeight}px` }} className="object-contain" />
                ) : (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-white shrink-0" />
                    <span className="text-[7.5px] font-black text-white leading-none">GYMSTARS</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                <span className="text-[7px] text-[#009c3b] font-bold">Home</span>
                <span className="text-[7px] text-slate-400">Feed</span>
              </div>
            </div>
          </div>

          {/* Preview Mobile Header */}
          <div className="bg-[#070F1C] border border-slate-800 p-4 rounded-xl">
            <span className="text-[9px] font-black uppercase text-slate-500 block mb-2 text-center w-full pb-1 border-b border-white/5 select-none">
              Cabeçalho Mobile (Preview)
            </span>
            <div className="flex items-center justify-between bg-[#050B14] p-2 rounded-lg border border-slate-850">
              <div>
                {mobileLogoType === "upload" && mobileLogoBase64 ? (
                  <img src={mobileLogoBase64} alt="" style={{ height: `${mobileLogoHeight}px` }} className="object-contain" />
                ) : mobileLogoType === "url" && mobileLogoUrl ? (
                  <img src={mobileLogoUrl} alt="" style={{ height: `${mobileLogoHeight}px` }} className="object-contain" />
                ) : (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-white" />
                    <span className="text-[7.5px] font-black text-white">GYMSTARS</span>
                  </div>
                )}
              </div>
              <div className="w-3 h-3 bg-slate-900 border border-slate-850 rounded-full" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function AboutUsManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "appContent"),
      where("type", "==", "about_us_item"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
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
        };
      });
      docsData.sort((a, b) => a.createdAt - b.createdAt);
      setItems(docsData);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
          setPhotoBase64(compressed);
          setPhotoUrl("");
        }
        setUploadLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSavingLoading(true);
    try {
      const payload = {
        type: "about_us_item",
        title: title.trim(),
        description: description.trim(),
        photoBase64: photoBase64 || null,
        photoUrl: photoUrl.trim() || null,
        createdAt: editingItem ? editingItem.createdAt : Date.now(),
      };

      if (editingItem) {
        await updateDoc(doc(db, "appContent", editingItem.id), payload);
      } else {
        await addDoc(collection(db, "appContent"), payload);
      }
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLoading(false);
    }
  };

  const handleEditSelect = (item: any) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description);
    setPhotoBase64(item.photoBase64 || "");
    setPhotoUrl(item.photoUrl || "");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta seção de Quem Somos?")) return;
    try {
      await deleteDoc(doc(db, "appContent", id));
      if (editingItem?.id === id) resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setTitle("");
    setDescription("");
    setPhotoBase64("");
    setPhotoUrl("");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Configurações do "Quem Somos"
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Adicione, edite ou remova as seções editoriais explicativas da história e metas do GymStars Brasil.
          </p>
        </div>
        <a
          href="#/quem-somos"
          className="text-center bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-400 flex items-center gap-1.5 justify-center font-extrabold text-xs uppercase px-4 py-2.5 rounded-xl border border-indigo-500/30 transition-all select-none"
        >
          <Award className="w-4 h-4" />
          Ver na página pública
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form panel */}
        <form onSubmit={handleSave} className="lg:col-span-5 space-y-4 bg-black/25 p-4 rounded-2xl border border-slate-800/60 w-full">
          <h3 className="text-xs font-black uppercase text-[#009c3b] tracking-wider">
            {editingItem ? "Editar Seção" : "Criar Nova Seção"}
          </h3>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Título da Seção
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Nossa Missão"
              className="w-full bg-black/40 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Descrição / Histórico
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a história ou objetivos..."
              className="w-full bg-black/40 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none text-xs leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Foto da Seção (PNG ou JPG)
            </label>

            {photoBase64 ? (
              <div className="relative group border border-slate-800 rounded-xl overflow-hidden bg-black h-28 flex items-center justify-center">
                <img src={photoBase64} alt="" className="h-full object-contain" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setPhotoBase64("")}
                  className="absolute inset-0 bg-black/80 flex flex-col gap-1 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span className="text-[9px] text-white font-bold uppercase tracking-widest">Remover Imagem</span>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border border-slate-800 border-dashed rounded-xl cursor-pointer bg-black/10 hover:bg-black/30 transition">
                <div className="flex flex-col items-center justify-center pt-3 pb-3">
                  <Upload className="w-5 h-5 text-slate-500 mb-1" />
                  <p className="text-[10px] text-slate-400 font-bold font-sans">
                    {uploadLoading ? "Redimensionando..." : "Upar Foto"}
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
            )}

            <div className="space-y-1 pt-1">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                Ou insira o link direto externo da imagem
              </span>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => {
                  setPhotoUrl(e.target.value);
                  if (e.target.value) setPhotoBase64("");
                }}
                placeholder="https://exemplo.com/foto.png"
                className="w-full bg-black/40 border border-slate-700 rounded-xl px-3 py-1.5 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none text-[11px]"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
            {editingItem && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-bold uppercase rounded-lg transition-all"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={savingLoading || uploadLoading}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-lg transition-all disabled:opacity-50"
            >
              {savingLoading ? "Salvando..." : editingItem ? "Salvar Alterações" : "Criar Seção"}
            </button>
          </div>
        </form>

        {/* List panel */}
        <div className="lg:col-span-7 space-y-3 w-full">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Seções Ativas ({items.length})
          </h3>

          {loading ? (
            <div className="py-12 flex justify-center">
              <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></span>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-black/15 border border-dashed border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 text-xs">
              Nenhuma seção publicada em "Quem Somos" ainda.
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-black/25 hover:bg-black/40 p-3 rounded-xl border border-slate-850 flex items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {(item.photoBase64 || item.photoUrl) ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-800">
                        <img src={item.photoBase64 || item.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <Award className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate max-w-[280px] sm:max-w-[420px]">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleEditSelect(item)}
                      className="p-1.5 hover:bg-slate-800 text-indigo-400 rounded transition"
                      title="Editar"
                    >
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 hover:bg-slate-800 text-red-400 rounded transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


