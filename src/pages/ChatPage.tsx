import React, { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useOutletContext, useNavigate } from "react-router-dom";
import { 
  db, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  limit 
} from "../lib/firebase";
import { UserData } from "../App";
import { motion, AnimatePresence } from "motion/react";
import { Send, Hash, Lock, Users, ShieldAlert, ArrowLeft, MoreVertical, MessageSquare, Plus, Trash2, Edit2, Shield, ChevronDown, Check, Reply, X, Trophy, UserCircle, LogOut, Palette } from "lucide-react";

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  color: string;
  category: string;
  createdAt: number;
  lastMessageText?: string;
  lastMessageAt?: number;
  lastMessageAuthorName?: string;
  allowedTags: ("Ginasta" | "Árbitro" | "Admin" | "Visitante")[];
  isTemporary?: boolean;
  competitionId?: string;
  mutedUsers?: string[];
  kickedUsers?: string[];
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderTag: string;
  senderPhotoURL?: string;
  senderColor?: string;
  senderBalloonColor?: string;
  text: string;
  createdAt: number;
  replyToId?: string;
  replyToName?: string;
  replyToText?: string;
  reactions?: Record<string, string[]>;
  isAnnouncement?: boolean;
  isReported?: boolean;
  pinned?: boolean;
  readBy?: { uid: string; photoURL: string | null; username: string }[];
}

export interface ChatPresence { id: string; userId: string; username: string; tag: string; roomId: string; lastActive: number; photoURL?: string; }
export interface ChatTyping { id: string; userId: string; username: string; roomId: string; updatedAt: number; }

const CATEGORIES = ["Competições ao vivo", "Avisos oficiais", "Área dos árbitros", "Dúvidas dos ginastas", "Treinos e rotinas", "Conversa geral"];
const PRESET_COLORS = [
  { name: "Verde Esmeralda", class: "#009c3b" }, { name: "Azul Radiante", class: "#3b82f6" }, { name: "Ouro Real", class: "#f59e0b" },
  { name: "Rosa Vibrante", class: "#ec4899" }, { name: "Roxo Místico", class: "#a855f7" }, { class: "#06b6d4" }, { name: "Vermelho Fogo", class: "#ef4444" },
];

const BALLOON_COLORS = [
  { name: "Padrão", value: "#009c3b" },
  { name: "Azul Cobalto", value: "#2563eb" },
  { name: "Roxo Imperial", value: "#7c3aed" },
  { name: "Pink Vibrante", value: "#db2777" },
  { name: "Laranja Sol", value: "#ea580c" },
  { name: "Ciano Galáctico", value: "#06b6d4" },
  { name: "Ouro Quente", value: "#d97706" },
  { name: "Rosa Neon", value: "#f43f5e" },
  { name: "Preto Carbono", value: "#1e293b" },
  { name: "Vermelho Rubi", value: "#e11d48" }
];

export default function ChatPage() {
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) { navigate("/login"); return; }
    if (!userData || !userData.tag || !["Ginasta", "Árbitro", "Admin"].includes(userData.tag || "")) { navigate("/"); }
  }, [userData, navigate]);

  // States
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [presenceList, setPresenceList] = useState<ChatPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<ChatTyping[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [userBalloonColor, setUserBalloonColor] = useState(() => localStorage.getItem("chat_balloon_color") || "#009c3b");
  const [showPalette, setShowPalette] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{id: string, name: string, text: string} | null>(null);
  
  // Modals Setup
  const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: "", description: "", color: "#009c3b", category: "Conversa geral", allowedTags: ["Ginasta", "Árbitro", "Admin"] as any[], isTemporary: false
  });
  
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const [isLiveEventDropdownOpen, setIsLiveEventDropdownOpen] = useState(false);
  
  const [roomToDelete, setRoomToDelete] = useState<ChatRoom | null>(null);
  const [rotationOffset, setRotationOffset] = useState(0);
  const [liveCompetitions, setLiveCompetitions] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const q = query(collection(db, "competitions"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: {id: string, name: string}[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === "ao vivo") list.push({ id: doc.id, name: data.name });
      });
      setLiveCompetitions(list);
    });
    return () => unsub();
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userData) return;
    const q = query(collection(db, "chat_rooms"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const roomList: ChatRoom[] = [];
      snapshot.forEach(doc => {
        const item = doc.data();
        if ((item.allowedTags?.includes?.(userData.tag) || userData.tag === "Admin") && !item.kickedUsers?.includes?.(userData.uid)) {
          roomList.push({ id: doc.id, ...item } as ChatRoom);
        }
      });
      setRooms(roomList);
    });
    return () => unsub();
  }, [userData]);

  useEffect(() => {
    if (!userData || !activeRoomId) return;
    const presenceId = `${activeRoomId}_${userData.uid}`;
    const setPresenceDoc = async () => {
      try {
        await setDoc(doc(db, "chat_presence", presenceId), {
          id: presenceId, userId: userData.uid, username: userData.username, tag: userData.tag, roomId: activeRoomId, lastActive: Date.now(), photoURL: userData.photoURL || null
        });
      } catch (err) {}
    };
    setPresenceDoc();
    const interval = setInterval(setPresenceDoc, 45000);
    const qPres = query(collection(db, "chat_presence"), where("roomId", "==", activeRoomId));
    const unsubPres = onSnapshot(qPres, (snapshot) => {
      const list: ChatPresence[] = [];
      const threshold = Date.now() - 120000;
      snapshot.forEach(doc => { if (doc.data().lastActive > threshold) list.push(doc.data() as ChatPresence); });
      setPresenceList(list);
    });
    return () => { clearInterval(interval); unsubPres(); deleteDoc(doc(db, "chat_presence", presenceId)).catch(() => {}); };
  }, [userData, activeRoomId]);

  const prevMessagesLength = useRef(0);
  const prevLastMsgId = useRef<string | null>(null);

  useEffect(() => {
    if (!activeRoomId) return;
    const q = query(
      collection(db, "chat_messages"), 
      where("channelId", "==", activeRoomId), 
      orderBy("createdAt", "desc"), // Order by desc so limit works from newest
      limit(100)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as ChatMessage));
      // Re-sort ascending for display
      const sorted = msgs.sort((a,b) => a.createdAt - b.createdAt);
      setMessages(sorted);
      
      const newLen = sorted.length;
      const lastId = newLen > 0 ? sorted[newLen - 1].id : null;
      
      // Only scroll down if new message arrived
      if (newLen > prevMessagesLength.current || lastId !== prevLastMsgId.current) {
         setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
      
      prevMessagesLength.current = newLen;
      prevLastMsgId.current = lastId;
    });
    return () => unsub();
  }, [activeRoomId]);

  useEffect(() => {
    if (messages.length > 0 && userData && activeRoomId) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== userData.uid && lastMsg.senderId !== "system") {
        const hasRead = Array.isArray(lastMsg.readBy) ? lastMsg.readBy.some(r => r.uid === userData.uid) : false;
        if (!hasRead) {
          const newReadEntry = { uid: userData.uid, photoURL: userData.photoURL || null, username: userData.username };
          const updatedReadBy = Array.isArray(lastMsg.readBy) ? [...lastMsg.readBy, newReadEntry] : [newReadEntry];
          updateDoc(doc(db, "chat_messages", lastMsg.id), { readBy: updatedReadBy }).catch(() => {});
        }
      }
    }
  }, [messages, userData, activeRoomId]);

  useEffect(() => {
    if (!activeRoomId || !userData) return;
    const q = query(collection(db, "chat_typing"), where("roomId", "==", activeRoomId));
    const unsub = onSnapshot(q, (snapshot) => {
      const activeTyping: ChatTyping[] = [];
      const now = Date.now();
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.userId !== userData.uid && now - d.updatedAt < 5000) activeTyping.push(d as ChatTyping);
      });
      setTypingUsers(activeTyping);
    });
    return () => unsub();
  }, [activeRoomId, userData]);

  useEffect(() => {
    if (presenceList.length <= 3) {
      setRotationOffset(0);
      return;
    }
    const interval = setInterval(() => {
      setRotationOffset(prev => (prev + 1) % presenceList.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [presenceList.length]);

  const displayedPresences = useMemo(() => {
    if (presenceList.length === 0) return [];
    if (presenceList.length <= 3) return presenceList;
    const items = [];
    for (let i = 0; i < 3; i++) {
       items.push(presenceList[(rotationOffset + i) % presenceList.length]);
    }
    return items;
  }, [presenceList, rotationOffset]);

  const renderMessages = useMemo(() => {
    const filteredMessages = messages.filter(msg => {
      if (msg.senderId === "system" && typeof msg.text === "string" && msg.text.includes("criada!")) {
        return false;
      }
      return true;
    });

    return filteredMessages.map((msg, idx) => {
      const isSystem = msg.senderId === "system" || msg.isAnnouncement;
      const isMe = msg.senderId === userData?.uid;
      const showHeader = idx === 0 || filteredMessages[idx - 1]?.senderId !== msg.senderId || filteredMessages[idx - 1]?.createdAt < msg.createdAt - 300000;

      if (isSystem) {
        const isScore = msg.text && typeof msg.text === "string" && (msg.text.includes("RESULTADO") || msg.text.includes("NOTA"));
        
        if (isScore) {
          const text = msg.text;
          const isRealTimeScore = text.includes("RESULTADO EM TEMPO REAL");
          let gymnastName = "";
          let category = "";
          let score = "";
          
          if (isRealTimeScore) {
            const lines = text.split('\n');
            lines.forEach(l => {
              if (l.includes('Ginasta:')) gymnastName = l.replace(/.*Ginasta:\*\*/, '').trim();
              if (l.includes('Categoria:')) category = l.replace(/.*Categoria:\*\*/, '').trim();
              if (l.includes('Nota:')) score = l.replace(/.*Nota:\*\*/, '').trim();
            });
          }

          return (
            <div key={msg.id} className="flex justify-center my-6 w-full relative z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-[#009c3b]/30 via-emerald-500/20 to-cyan-500/20 blur-xl opacity-60 pointer-events-none rounded-3xl mix-blend-screen scale-95" />
              
              <div className="relative border border-white/10 rounded-2xl w-[92%] sm:w-[500px] shadow-2xl backdrop-blur-xl bg-[#050B14]/80 overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#009c3b] via-emerald-400 to-cyan-400" />
                
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="bg-gradient-to-br from-[#009c3b]/30 to-emerald-600/30 w-12 h-12 rounded-full border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      {msg.senderPhotoURL ? (
                        <img src={msg.senderPhotoURL} className="w-full h-full rounded-full object-cover p-0.5" alt="Avatar" referrerPolicy="no-referrer" />
                      ) : (
                        <Trophy className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-emerald-400 uppercase tracking-[0.15em] text-[10px] sm:text-xs mb-0.5">Sistema de Notas</h4>
                      <p className="text-white font-medium text-xs sm:text-sm bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent truncate">Novo resultado publicado</p>
                    </div>
                  </div>
                  
                  {isRealTimeScore && gymnastName ? (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-1">
                      <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-emerald-500/80 font-bold mb-1">Ginasta</span>
                        <span className="text-xs sm:text-sm font-semibold text-white truncate">{gymnastName}</span>
                      </div>
                      <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-cyan-500/80 font-bold mb-1">Categoria</span>
                        <span className="text-xs sm:text-sm font-semibold text-white truncate">{category}</span>
                      </div>
                      <div className="col-span-2 bg-gradient-to-br from-emerald-500/20 to-[#009c3b]/10 rounded-xl p-4 sm:p-5 border border-emerald-500/20 flex flex-col items-center justify-center shadow-inner mt-1 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-emerald-500/10 rotate-12">
                           <Trophy className="w-24 h-24" />
                        </div>
                        <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-emerald-400/90 font-black mb-1 relative z-10">Nota Final</span>
                        <span className="text-3xl sm:text-4xl font-mono font-black text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] relative z-10">{score}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/60 rounded-xl p-4 border border-white/5 shadow-inner">
                      <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-[14px] font-mono text-emerald-50/90 custom-scrollbar overflow-x-auto">
                        {typeof msg.text === 'string' ? msg.text.replace(/📣 \[Aviso\] /g, "") : String(msg.text)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id} className="flex justify-center my-4 w-full">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm flex items-start gap-3 max-w-[90%] sm:max-w-[450px] shadow-lg text-slate-300">
              <div className="bg-[#009c3b]/20 p-2 rounded-lg text-[#009c3b] shrink-0 mt-0.5">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex-1 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                {typeof msg.text === 'string' ? msg.text.replace(/📣 \[Aviso\] /g, "") : String(msg.text)}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div 
          key={msg.id} 
          className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%] ${isMe ? "ml-auto" : ""}`}
        >
          {showHeader && (
            <div className={`flex items-center gap-2 mb-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
              {msg.senderPhotoURL ? (
                <img src={msg.senderPhotoURL} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover" referrerPolicy="no-referrer" alt="" />
              ) : (
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${isMe ? "bg-[#009c3b]" : "bg-slate-700"}`}>
                  {msg.senderName?.[0]?.toUpperCase()}
                </div>
              )}
              <div className={`flex items-center gap-1.5 sm:gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <span className={`text-[11px] sm:text-xs font-bold ${isMe ? "text-[#009c3b]" : "text-emerald-400"}`}>{msg.senderName}</span>
                {msg.senderTag && <span className="text-[9px] sm:text-[10px] bg-white/10 px-1.5 rounded text-slate-300">{msg.senderTag}</span>}
                <span className="text-[9px] sm:text-[10px] text-slate-500">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
              </div>
            </div>
          )}

          <div className={`relative group flex ${isMe ? "flex-row-reverse" : "flex-row"} items-start gap-2 max-w-full`}>
            <div 
              style={{
                backgroundColor: msg.senderBalloonColor || (isMe ? "#009c3b" : "#1E293B"),
                boxShadow: msg.senderBalloonColor ? `0 4px 14px ${msg.senderBalloonColor}22` : undefined
              }}
              className={`
                px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-[13px] sm:text-[15px] leading-relaxed shadow-sm break-words text-white
                ${isMe 
                  ? "rounded-tr-sm" 
                  : "rounded-tl-sm border border-slate-800"
                }
              `}
            >
              {msg.replyToId && (
                 <div className={`mb-1.5 p-1.5 sm:p-2 rounded-lg text-[10px] sm:text-xs border-l-2 ${isMe ? "bg-black/20 border-white/50 text-emerald-50" : "bg-black/30 border-[#009c3b] text-slate-300"} flex flex-col gap-0.5`}>
                   <span className="font-bold opacity-80">{msg.replyToName}</span>
                   <span className="truncate opacity-90">{msg.replyToText}</span>
                 </div>
              )}
              <div className="whitespace-pre-wrap">{typeof msg.text === 'string' ? msg.text : String(msg.text)}</div>
              
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"} -mb-2 z-10`}>
                  {Object.entries(msg.reactions).filter(([_, uids]) => (uids as string[]).length > 0).map(([emoji, uids]) => (
                    <button 
                      key={emoji} 
                      onClick={() => handleToggleReaction(msg, emoji)}
                      className={`flex items-center gap-1 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                        Array.isArray(uids) && (uids as string[]).includes(userData!.uid) 
                        ? "bg-[#009c3b]/20 border-[#009c3b] text-[#009c3b]" 
                        : "bg-[#0F172A] border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <span>{emoji}</span> <span>{(uids as string[]).length}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Read Receipts */}
              {idx === messages.length - 1 && Array.isArray(msg.readBy) && msg.readBy.filter(r => r.uid !== msg.senderId).length > 0 && (
                <div className={`flex items-center -space-x-1 mt-1.5 ${isMe ? "justify-end pr-2" : "justify-start pl-2"}`}>
                  <Check className="w-3 h-3 text-[#009c3b] mr-1" />
                  {msg.readBy.filter(r => r.uid !== msg.senderId).map((reader, i) => (
                      <div key={reader.uid} className="w-3.5 h-3.5 rounded-full border border-[#050B14] bg-[#1E293B] shadow-sm flex items-center justify-center overflow-hidden shrink-0 relative" style={{ zIndex: 10 - i }} title={`Visto por ${reader.username}`}>
                        {reader.photoURL ? (
                          <img src={reader.photoURL} alt={reader.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[6px] font-bold text-white">{(reader.username || "G").slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="opacity-60 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 mt-1 shrink-0 px-1">
              <button 
                onClick={() => setReplyingTo({ id: msg.id, name: msg.senderName, text: msg.text })} 
                className="p-1.5 rounded-full hover:bg-[#009c3b]/20 text-slate-300 hover:text-[#009c3b] transition-all" 
                title="Responder"
              >
                <Reply className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    });
  }, [messages, userData?.uid]);

  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const lastTypingTime = useRef<number>(0);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!userData || !activeRoomId) return;
    const now = Date.now();
    if (now - lastTypingTime.current > 2500) {
      lastTypingTime.current = now;
      const tid = `${activeRoomId}_${userData.uid}`;
      setDoc(doc(db, "chat_typing", tid), { id: tid, userId: userData.uid, username: userData.username, roomId: activeRoomId, updatedAt: now }).catch(() => {});
    }
  };

  const handleSendMessage = async (isAnnouncement = false, overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || !userData || !activeRoomId || !activeRoom || isSending) return;
    if (activeRoom?.mutedUsers?.includes?.(userData.uid)) { alert("Você foi silenciado."); return; }
    
    // Optistic clear for immediate feedback
    if (!overrideText) {
       setInputText("");
    }
    setIsSending(true);

    try {
      await addDoc(collection(db, "chat_messages"), {
        channelId: activeRoomId, senderId: userData.uid, senderName: userData.username, senderTag: userData.tag,
        senderPhotoURL: userData.photoURL || null,
        senderBalloonColor: userBalloonColor,
        text: textToSend, createdAt: Date.now(), reactions: {}, isAnnouncement, isReported: false, pinned: false,
        replyToId: replyingTo?.id || null,
        replyToName: replyingTo?.name || null,
        replyToText: replyingTo?.text || null
      });
      await updateDoc(doc(db, "chat_rooms", activeRoomId), {
        lastMessageText: isAnnouncement ? `📣 [Aviso] ${textToSend}` : textToSend, lastMessageAt: Date.now(), lastMessageAuthorName: userData.username
      });
      setReplyingTo(null);
      deleteDoc(doc(db, "chat_typing", `${activeRoomId}_${userData.uid}`)).catch(() => {});
    } catch (err: any) {
      if (!overrideText) setInputText(textToSend); // Restore on error
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleReaction = async (message: ChatMessage, emoji: string) => {
    if (!userData) return;
    try {
      const currentReactions = message.reactions ? { ...message.reactions } : {};
      const emojiUids = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
      const idx = emojiUids.indexOf(userData.uid);
      if (idx > -1) emojiUids.splice(idx, 1);
      else emojiUids.push(userData.uid);
      if (emojiUids.length === 0) delete currentReactions[emoji];
      else currentReactions[emoji] = emojiUids;
      await updateDoc(doc(db, "chat_messages", message.id), { reactions: currentReactions });
    } catch (err) {}
  };

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || (userData.tag !== "Admin" && userData.tag !== "Árbitro")) return;
    try {
      const result = await addDoc(collection(db, "chat_rooms"), {
        ...roomForm, createdAt: Date.now(), mutedUsers: [], kickedUsers: []
      });

      // Notify all users about the new chat room
      await addDoc(collection(db, "notifications"), {
        title: "Nova Sala de Chat!",
        message: `O admin abriu a sala: ${roomForm.name}`,
        type: "chat",
        link: "/chat",
        createdAt: Date.now(),
        senderId: userData.uid
      });

      setIsNewRoomModalOpen(false);
      setActiveRoomId(result.id);
      setRoomForm({ name: "", description: "", color: "#009c3b", category: "Conversa geral", allowedTags: ["Ginasta", "Árbitro", "Admin"], isTemporary: false });
    } catch (err: any) {}
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      setActiveRoomId(null);
      await deleteDoc(doc(db, "chat_rooms", roomToDelete.id));
      setRoomToDelete(null);
    } catch (e) {
      console.error("Erro ao excluir", e);
      alert("Houve um erro ao excluir a sala. Tente novamente.");
    }
  };

  return (
    <div className="flex flex-col flex-grow min-h-0 h-full bg-[#050B14] rounded-2xl border border-white/10 shadow-2xl font-sans overflow-hidden">
      {/* Sidebar - Rooms List */}
      <div className="w-full flex-1 flex flex-col bg-[#070F1C] transition-transform duration-300">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#070F1C] shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <MessageSquare className="w-5 h-5 text-[#009c3b]" /> 
            <span className="font-black italic uppercase tracking-tighter">Salas</span>
          </h2>
          {(userData?.tag === "Admin" || userData?.tag === "Árbitro") && (
            <button onClick={() => setIsNewRoomModalOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {CATEGORIES.map(category => {
            const catRooms = rooms.filter(r => r.category === category);
            if (catRooms.length === 0) return null;
            return (
              <div key={category} className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">{category}</h3>
                <div className="space-y-1">
                  {catRooms.map(room => (
                    <div
                      key={room.id}
                      className="w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 hover:bg-white/5 border border-transparent"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0" style={{ color: room.color, border: `1px solid ${room.color}40` }}>
                        {room.category === "Área dos árbitros" ? <ShieldAlert className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="font-semibold text-slate-100 truncate">{room.name}</span>
                          {room.isTemporary && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-2 shrink-0"></span>}
                        </div>
                        <p className="text-xs text-slate-400 truncate mb-2">{room.lastMessageText ? `${room.lastMessageAuthorName}: ${room.lastMessageText}` : room.description || "Nenhuma mensagem ainda"}</p>
                        <button
                          onClick={() => setActiveRoomId(room.id)}
                          className="self-start px-4 py-1.5 rounded-lg text-xs font-bold bg-[#009c3b] text-white hover:bg-green-600 transition-colors shadow-md flex items-center gap-1.5"
                        >
                          Entrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area - Full Screen Portal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {activeRoomId && activeRoom && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 z-[100] flex flex-col bg-[#050B14]"
            >
              <header className="pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:py-4 border-b border-white/5 flex items-center justify-between px-3 sm:px-6 bg-[#070F1C] shrink-0 select-none relative z-10 shadow-md">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button 
                    onClick={() => setActiveRoomId(null)} 
                    className="p-1.5 sm:p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors shrink-0"
                    title="Voltar para as salas"
                  >
                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <div className="hidden xs:flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0" style={{ backgroundColor: `${activeRoom.color}20`, color: activeRoom.color }}>
                    <Hash className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 ml-1">
                    <h2 className="font-bold text-[15px] sm:text-lg text-white truncate leading-tight">{activeRoom.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#009c3b] font-medium bg-[#009c3b]/10 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                          <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {presenceList.length} online
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {(userData?.tag === "Admin" || userData?.tag === "Árbitro") && (
                     <button onClick={() => setRoomToDelete(activeRoom)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-full transition-colors" title="Excluir sala">
                       <Trash2 className="w-5 h-5" />
                     </button>
                  )}
                </div>
              </header>

              <div className="flex-1 flex flex-col overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                  {renderMessages}
                  <div ref={messagesEndRef} className="h-2" />
                </main>
              </div>

          <footer className="p-3 sm:p-4 pb-safe bg-[#070F1C] border-t border-white/5 shrink-0 z-10 relative flex flex-col gap-2 shadow-2xl">
            {typingUsers.length > 0 && (
               <div className="absolute -top-6 left-6 text-xs text-[#009c3b] italic bg-[#070F1C] px-2 py-0.5 rounded-t-lg border-x border-t border-white/5">
                 {typingUsers.map(u => u.username).join(", ")} digitando...
               </div>
            )}
            
            <AnimatePresence>
              {replyingTo && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="flex items-center justify-between bg-[#1E293B] border border-slate-700 rounded-lg p-2 px-3">
                  <div className="min-w-0 pr-4 border-l-2 border-[#009c3b] pl-2 opacity-80">
                    <span className="text-xs font-bold text-[#009c3b] block truncate flex gap-1 items-center"><Reply className="w-3 h-3" /> Repondendo a {replyingTo.name}</span>
                    <p className="text-xs text-slate-300 truncate">{replyingTo.text}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Modern Balloon Color Palette Bar */}
            <AnimatePresence>
              {showPalette && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-center gap-2 px-1 py-1 border-b border-white/5 pb-2.5 mb-1 shrink-0 overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 xs:pb-0 scrollbar-none max-w-full">
                    {BALLOON_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setUserBalloonColor(c.value);
                          localStorage.setItem("chat_balloon_color", c.value);
                        }}
                        className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 rounded-full border border-white/10 transition-all relative flex items-center justify-center cursor-pointer shrink-0 hover:scale-110 active:scale-95"
                        style={{ 
                          backgroundColor: c.value, 
                          borderColor: userBalloonColor === c.value ? "#ffffff" : "transparent",
                          boxShadow: userBalloonColor === c.value ? `0 0 10px ${c.value}cc` : "none",
                          transform: userBalloonColor === c.value ? "scale(1.15)" : undefined,
                        }}
                        title={c.name}
                      >
                        {userBalloonColor === c.value && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3.5px] drop-shadow-md" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex flex-row gap-2 sm:gap-3 items-center w-full">
              <div className="relative flex-1 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPalette(prev => !prev)}
                  className={`absolute left-3.5 z-10 p-1 rounded-full transition-colors ${showPalette ? "bg-[#009c3b]/20 text-[#009c3b]" : "text-slate-400 hover:text-white"}`}
                  title="Alterar cor do balão"
                >
                  <Palette className="w-5.5 h-5.5" />
                </button>
                <input
                  type="text"
                  value={inputText}
                  autoComplete="off"
                  onChange={handleInputChange}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage() }}
                  placeholder="Mensagem..."
                  className="w-full bg-[#1E293B] border border-slate-700 rounded-2xl pl-12 pr-14 py-3 sm:py-3.5 focus:outline-none focus:border-[#009c3b] focus:ring-1 focus:ring-[#009c3b] text-slate-100 placeholder:text-slate-500 shadow-inner text-[16px] transition-colors"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                  className="absolute right-1.5 p-2.5 bg-[#009c3b] text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:hover:bg-[#009c3b] transition-colors shadow-md flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                </button>
              </div>
            </div>
          </footer>
        </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Empty State when no room is selected */}
      {!activeRoomId && (
          <div className="hidden md:flex flex-1 items-center justify-center bg-[#050B14]">
            <div className="flex flex-col items-center text-slate-500 max-w-sm text-center">
               <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                 <MessageSquare className="w-10 h-10 text-slate-600" />
               </div>
               <h3 className="text-xl font-bold text-slate-300 mb-2">Comunidade GYMSTARS</h3>
               <p className="text-sm">Selecione uma sala à esquerda para interagir com ginastas, árbitros e membros da equipe técnica.</p>
            </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {roomToDelete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-[#0F172A] border border-slate-700 rounded-2xl flex-shrink-0 break-words shadow-2xl overflow-hidden flex flex-col relative px-6 py-8"
                style={{ width: "90%", maxWidth: "400px" }}
              >
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-5 shrink-0">
                   <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 text-center">Excluir Sala?</h3>
                <p className="text-slate-400 text-sm mb-8 text-center break-words">
                  Tem certeza que deseja excluir a sala <b>{roomToDelete.name}</b>?<br className="hidden sm:block"/> Todas as mensagens serão perdidas permanentemente.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full mt-auto">
                  <button onClick={() => setRoomToDelete(null)} className="w-full px-5 py-3 rounded-xl font-bold text-slate-300 hover:bg-white/5 transition-colors border border-transparent hover:border-slate-700">Cancelar</button>
                  <button onClick={handleDeleteRoom} className="w-full px-5 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Excluir</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Create Room Modal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isNewRoomModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-[#0F172A] border border-slate-700 rounded-2xl flex-shrink-0 break-words shadow-2xl overflow-hidden flex flex-col relative"
                style={{ width: "90%", maxWidth: "450px" }}
              >
                <div className="p-5 border-b border-slate-700 font-bold text-lg flex justify-between items-center text-white shrink-0">
                  Criar Nova Sala
                  <button onClick={() => setIsNewRoomModalOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors focus:outline-none mb-0">
                    <Lock className="w-5 h-5"/>
                  </button>
                </div>
                <form onSubmit={handleCreateRoomSubmit} className="p-4 space-y-4 max-h-[85vh] overflow-y-auto w-full">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nome da Sala</label>
                    <input required value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})} className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#009c3b]" placeholder="Ex: Geral, Dúvidas..." />
                  </div>
                  
                  {liveCompetitions.length > 0 && (
                    <div className="relative z-[65]">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vincular Competição ao Vivo</label>
                      <button type="button" onClick={() => {
                        setIsColorDropdownOpen(false); 
                        setIsCategoryDropdownOpen(false);
                        setIsLiveEventDropdownOpen(!isLiveEventDropdownOpen);
                      }} className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-4 py-3 text-white flex justify-between items-center transition-colors relative z-[65]">
                         <span className="truncate">{liveCompetitions.find(c => c.name === roomForm.name)?.name || "Selecione (Opcional)"}</span>
                         <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isLiveEventDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                         {isLiveEventDropdownOpen && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-[75] w-full mt-1 bg-[#1E293B] border border-slate-600 rounded-xl shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto w-[100%] max-w-full">
                               <div onClick={() => { setIsLiveEventDropdownOpen(false); }} className={`px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors text-slate-400`}>
                                  Nenhum
                               </div>
                               {liveCompetitions.map(c => (
                                  <div key={c.id} onClick={() => { 
                                    setRoomForm({...roomForm, name: c.name, category: "Competições ao vivo"}); 
                                    setIsLiveEventDropdownOpen(false); 
                                  }} className={`px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors ${roomForm.name === c.name ? "text-[#009c3b] font-bold bg-[#009c3b]/10" : "text-slate-200"}`}>
                                     {c.name}
                                     {roomForm.name === c.name && <Check className="w-4 h-4" />}
                                  </div>
                               ))}
                            </motion.div>
                         )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Custom Category Dropdown */}
                  <div className="relative z-[60]">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Categoria</label>
                    <button type="button" onClick={() => {
                        setIsColorDropdownOpen(false); 
                        setIsLiveEventDropdownOpen(false);
                        setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                    }} className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#009c3b] flex justify-between items-center transition-colors relative z-[60]">
                       <span>{roomForm.category}</span>
                       <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                       {isCategoryDropdownOpen && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-[70] w-full mt-1 bg-[#1E293B] border border-slate-600 rounded-xl shadow-xl overflow-hidden py-1">
                             {CATEGORIES.map(c => (
                                <div key={c} onClick={() => { setRoomForm({...roomForm, category: c}); setIsCategoryDropdownOpen(false); }} className={`px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors ${roomForm.category === c ? "text-[#009c3b] font-bold bg-[#009c3b]/10" : "text-slate-200"}`}>
                                   {c}
                                   {roomForm.category === c && <Check className="w-4 h-4" />}
                                </div>
                             ))}
                          </motion.div>
                       )}
                    </AnimatePresence>
                  </div>

                  {/* Custom Color Dropdown */}
                  <div className="relative z-[50]">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cor</label>
                    <button type="button" onClick={() => {
                      setIsCategoryDropdownOpen(false); 
                      setIsLiveEventDropdownOpen(false);
                      setIsColorDropdownOpen(!isColorDropdownOpen);
                    }} className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#009c3b] flex justify-between items-center transition-colors relative z-[50]">
                       <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: roomForm.color }}></span>
                          {PRESET_COLORS.find(c => c.class === roomForm.color)?.name}
                       </span>
                       <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isColorDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                       {isColorDropdownOpen && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-[70] w-full mt-1 bg-[#1E293B] border border-slate-600 rounded-xl shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto w-[100%] max-w-full">
                             {PRESET_COLORS.map(c => (
                                <div key={c.class} onClick={() => { setRoomForm({...roomForm, color: c.class}); setIsColorDropdownOpen(false); }} className={`px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors ${roomForm.color === c.class ? "bg-white/5 font-bold" : "text-slate-200"}`}>
                                   <span className="flex items-center gap-2">
                                       <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.class }}></span>
                                       <span style={{ color: roomForm.color === c.class ? c.class : "inherit" }}>{c.name}</span>
                                   </span>
                                   {roomForm.color === c.class && <Check className="w-4 h-4" style={{ color: c.class }} />}
                                </div>
                             ))}
                          </motion.div>
                       )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="pt-2 pb-1 relative z-10 w-full overflow-hidden">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer w-fit max-w-[100%]">
                      <input type="checkbox" checked={roomForm.isTemporary} onChange={e => setRoomForm({...roomForm, isTemporary: e.target.checked})} className="rounded bg-[#1E293B] border-slate-700 text-[#009c3b] focus:ring-[#009c3b] w-4 h-4 shrink-0" />
                      <span className="truncate">Marcar como evento ao vivo</span>
                    </label>
                  </div>
                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/50 mt-4 relative z-10">
                    <button type="button" onClick={() => setIsNewRoomModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:bg-white/5 transition-colors w-full sm:w-auto">Cancelar</button>
                    <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-[#009c3b] text-white hover:bg-green-600 transition-colors shadow-[0_0_15px_rgba(0,156,59,0.3)] w-full sm:w-auto">Criar Sala</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
