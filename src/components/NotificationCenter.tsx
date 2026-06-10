import React, { useEffect, useState } from "react";
import { 
  Bell, 
  X, 
  MessageSquare, 
  Trophy, 
  Shield, 
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { db, collection, query, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, where } from "../lib/firebase";
import { Notification } from "../types";
import { UserData } from "../App";

interface NotificationCenterProps {
  userData: UserData | null;
}

export default function NotificationCenter({ userData }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastClearedAt, setLastClearedAt] = useState(() => Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, "notifications"),
      where("createdAt", ">", lastClearedAt),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      setNotifications(list);
    }, (err) => {
      // If index is missing or other issue, fallback
      console.warn("Notification stream error:", err);
    });

    return () => unsub();
  }, [userData, lastClearedAt]);

  const unreadCount = notifications.filter(n => !n.readBy?.includes(userData?.uid || "")).length;

  const handleMarkAsRead = async (notification: Notification) => {
    if (!userData) return;
    const currentReadBy = notification.readBy || [];
    if (currentReadBy.includes(userData.uid)) return;

    try {
      await updateDoc(doc(db, "notifications", notification.id), {
        readBy: [...currentReadBy, userData.uid]
      });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleClick = (n: Notification) => {
    handleMarkAsRead(n);
    if (n.link) {
      navigate(n.link);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setLastClearedAt(Date.now());
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "post": return <Shield className="w-4 h-4 text-emerald-400" />;
      case "score": return <Trophy className="w-4 h-4 text-yellow-400" />;
      case "live": return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "chat": return <MessageSquare className="w-4 h-4 text-blue-400" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/5 transition-colors group"
      >
        <Bell className={`w-6 h-6 transition-colors ${unreadCount > 0 ? "text-[#009c3b] animate-pulse" : "text-slate-400 group-hover:text-white"}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-[#050B14] shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed left-4 right-4 top-20 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 max-h-[70vh] sm:max-h-[480px] bg-[#070F1C] border border-slate-800 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#009c3b]" />
                  <span className="font-bold text-sm text-white uppercase tracking-wider">Notificações</span>
                </div>
                <div className="flex items-center gap-3">
                  {notifications.length > 0 && (
                    <button 
                      onClick={handleClear}
                      className="text-[9px] font-black text-slate-500 hover:text-red-400 uppercase tracking-tighter transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <div className="flex justify-center">
                      <Bell className="w-8 h-8 text-slate-800" />
                    </div>
                    <p className="text-slate-600 italic text-[11px]">
                      Aguardando novas notificações
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isRead = n.readBy?.includes(userData?.uid || "");
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={`p-4 hover:bg-white/5 cursor-pointer transition-colors relative group ${!isRead ? "bg-[#009c3b]/5" : ""}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!isRead ? "bg-slate-800" : "bg-slate-900 opacity-60"}`}>
                            {getIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${!isRead ? "text-white" : "text-slate-400"}`}>
                              {n.title}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                              {n.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[9px] text-slate-600 font-mono">
                                {new Date(n.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {n.link && (
                                <span className="text-[9px] text-[#009c3b] font-black uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Ver <ExternalLink className="w-2 h-2" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!isRead && (
                          <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-[#009c3b] rounded-full shadow-[0_0_5px_#009c3b]" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
