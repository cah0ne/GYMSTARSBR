import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { UserData } from "../App";
import { auth, db, doc, updateDoc, collection, query, where, getDocs } from "../lib/firebase";
import { updatePassword, signOut } from "firebase/auth";
import { UserCircle, Trophy, Shield, Calendar, Lock, Key, Check, Info, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const [username, setUsername] = useState(userData?.username || "");
  const [photoURL, setPhotoURL] = useState(userData?.photoURL || "");
  const [newPassword, setNewPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  
  const [refereeHistory, setRefereeHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (userData?.tag === "Árbitro") {
      fetchRefereeHistory();
    }
  }, [userData]);

  const fetchRefereeHistory = async () => {
    if (!userData?.username) return;
    setLoadingHistory(true);
    try {
      const q = query(collection(db, "scores"), where("refereeName", "==", userData.username));
      const snap = await getDocs(q);
      const history = snap.docs.map(d => d.data());
      // Group by competition
      setRefereeHistory(history);
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    
    // Restrictions by role
    const isVisitante = userData.tag === "Visitante";
    const isGinasta = userData.tag === "Ginasta";

    const trimmedUsername = username.trim();
    if (!/^[a-zA-Z0-9À-ÿ]+$/.test(trimmedUsername)) {
      setStatusMessage({ 
        text: "O nome de usuário deve conter apenas uma única palavra, sem espaços ou símbolos.", 
        type: "error" 
      });
      return;
    }

    try {
      const updateData: any = { username: trimmedUsername, displayName: trimmedUsername };
      
      // Photo is NOT editable for Visitante and Ginasta
      if (!isVisitante && !isGinasta) {
        updateData.photoURL = photoURL;
      }
      
      // Handle Password Change if provided
      if (newPassword.trim().length >= 6) {
        updateData.password = newPassword.trim();
        updateData.email = `pass_${newPassword.trim()}_${userData.uid}@gymstars.internal`;
        setNewPassword("");
      }

      await updateDoc(doc(db, "users", userData.uid), updateData);

      setStatusMessage({ text: "Perfil atualizado com sucesso!", type: "success" });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: "Erro: " + err.message, type: "error" });
    }
  };

  const isVisitante = userData?.tag === "Visitante";
  const isGinasta = userData?.tag === "Ginasta";
  const isArbitro = userData?.tag === "Árbitro";

  const showEmail = userData?.email && !userData.email.includes("gymstars.internal");

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Meu Perfil</h1>
        <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          isArbitro ? "bg-amber-500/20 text-amber-500" : 
          isGinasta ? "bg-blue-500/20 text-blue-500" :
          isVisitante ? "bg-green-500/20 text-green-500" :
          "bg-indigo-500/20 text-indigo-500"
        }`}>
          {userData?.tag}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0A1221] border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-5xl overflow-hidden shadow-2xl border-4 border-white/5 mb-6 relative group bg-slate-900"
            >
              {userData?.photoURL ? (
                <img src={userData.photoURL} className="w-full h-full object-cover select-none pointer-events-none" draggable="false" onContextMenu={(e) => e.preventDefault()} />
              ) : (
                <UserCircle className="w-16 h-16 text-white/20" />
              )}
            </div>
            
            <h2 className="text-2xl font-black text-white lowercase tracking-tight break-all">
              @{userData?.username}
            </h2>
            {userData?.team && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-full">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-bold text-slate-300">EQUIPE {userData.team}</span>
              </div>
            )}
            {showEmail && <p className="text-slate-500 text-sm mt-3">{userData?.email}</p>}

            {userData?.badges && userData.badges.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-800 w-full">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Emblemas Conquistados</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {userData.badges.map((b, i) => (
                    <div key={i} className="group relative">
                      <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center hover:border-amber-500/50 transition-colors shadow-sm">
                        <Trophy className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[9px] text-white font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-slate-800">
                        {b}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isArbitro && (
            <div className="bg-[#0A1221] border border-slate-800 rounded-3xl p-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" /> Histórico de Arbitragem
              </h3>
              {loadingHistory ? (
                <div className="text-center py-4 text-slate-600 text-xs italic">Carregando...</div>
              ) : refereeHistory.length === 0 ? (
                <div className="text-center py-4 text-slate-600 text-xs italic">Nenhuma nota publicada ainda.</div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar">
                  {[...new Set(refereeHistory.map(h => h.competitionId))].map(id => {
                    const compId = id as string;
                    const compNotes = refereeHistory.filter(h => h.competitionId === compId);
                    return (
                      <div key={compId} className="border-b border-slate-800/50 pb-3 last:border-0">
                        <div className="flex items-center justify-between mb-1 text-[10px] font-bold text-slate-300">
                          <span className="truncate">Competição #{compId.substring(0, 5)}</span>
                          <span className="text-amber-500">{compNotes.length} notas</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(compNotes.map(n => n.category))].map(cat => (
                            <span key={cat} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-400 font-mono">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Settings Form */}
        <div className="lg:col-span-2">
          <div className="bg-[#0A1221] border border-slate-800 rounded-3xl p-8 h-full">
            <h3 className="text-lg font-bold text-white mb-6">Configurações da Conta</h3>

            {statusMessage && (
              <div className={`p-4 mb-6 rounded-2xl text-xs font-bold border flex items-center gap-3 animate-in fade-in slide-in-from-top-1 ${
                statusMessage.type === "success" 
                  ? "bg-green-500/10 border-green-500/30 text-green-400" 
                  : statusMessage.type === "info"
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}>
                {statusMessage.type === "info" ? <Info className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                {statusMessage.text}
              </div>
            )}

            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Nome de Usuário
                </label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/40 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-[#009c3b] focus:ring-1 focus:ring-[#009c3b] transition-all outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  Trocar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    type="password"
                    placeholder="Deixe em branco para não alterar"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/40 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-[#009c3b] transition-all outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-600 mt-2 italic">* Mínimo 6 caracteres.</p>
              </div>

              {/* URL da Foto (Show only if NOT Ginasta or Visitante as restricted) */}
              {!isGinasta && !isVisitante && (
                <div className={isVisitante ? "md:col-span-2" : "md:col-span-2"}>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    URL da Foto de Perfil
                  </label>
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://exemplo.com/foto.jpg"
                    className="w-full bg-black/40 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-[#009c3b] transition-all outline-none"
                  />
                </div>
              )}

              <div className="md:col-span-2 pt-6 flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full bg-[#009c3b] hover:bg-[#009c3b]/90 text-white font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl transition-all shadow-xl shadow-[#009c3b]/10 active:scale-95 flex items-center justify-center gap-3"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl transition-all border border-red-500/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
