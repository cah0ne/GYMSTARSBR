/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  HashRouter,
  Routes,
  Route,
  Link,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { auth, db, doc, getDoc, onAuthStateChanged, User, collection, query, onSnapshot, addDoc, where, orderBy } from "./lib/firebase";
import { motion, AnimatePresence } from "motion/react";

// Pages
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import CompetitionsPage from "./pages/CompetitionsPage";
import CompetitionDetail from "./pages/CompetitionDetail";
import GymnastsPage from "./pages/GymnastsPage";
import GymnastProfile from "./pages/GymnastProfile";
import CodePage from "./pages/CodePage";
import ElementsPage from "./pages/ElementsPage";
import ProfilePage from "./pages/ProfilePage";
import RefereePage from "./pages/RefereePage";
import AdminPage from "./pages/AdminPage";
import ChatPage from "./pages/ChatPage";
import CoursesPage from "./pages/CoursesPage";
import NotificationsTicker from "./components/NotificationsTicker";
import GlobalAudioListener from "./components/GlobalAudioListener";
import NotificationCenter from "./components/NotificationCenter";
import GymStarsLogo from "./components/GymStarsLogo";

// Icons
import {
  Home,
  BookOpen,
  Shapes,
  Users,
  UserCircle,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Trophy,
  MoreVertical,
  Newspaper,
  MessageSquare,
  X,
  Send,
  Sparkles,
  Database,
  GraduationCap,
} from "lucide-react";

export type UserData = {
  uid: string;
  username: string;
  email: string;
  tag: "Visitante" | "Ginasta" | "Árbitro" | "Admin";
  competitionName?: string;
  photoURL?: string;
  team?: string;
  medals?: { gold: number; silver: number; bronze: number };
  badges?: string[];
  verified?: boolean;
  createdAt: number;
};

// Global context or state could be used, for now a simple wrapper
function Layout({
  user,
  userData,
}: {
  user: User | null;
  userData: UserData | null;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    const unsubBranding = onSnapshot(doc(db, "appContent", "branding"), (snap) => {
      if (snap.exists()) setBranding(snap.data());
    });
    return () => unsubBranding();
  }, []);

  useEffect(() => {
    if (!userData) return;
    const q = query(collection(db, "chat_rooms"));
    
    const unsub = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((docSnap: any) => {
        const room = docSnap.data();
        const hasPermission = room.allowedTags?.includes?.(userData?.tag || "") || userData?.tag === "Admin";
        const isKicked = room.kickedUsers?.includes?.(userData?.uid || "");
        
        if (hasPermission && !isKicked) {
          const lastRead = Number(localStorage.getItem(`chatLastRead_${docSnap.id}`) || 0);
          if (room.lastMessageAt && room.lastMessageAt > lastRead) {
            count++;
          }
        }
      });
      setUnreadCount(count);
    }, (err) => {
      console.warn("Unable to subscribe to unread count:", err);
    });

    return () => unsub();
  }, [userData]);

  const handleLogout = () => {
    auth.signOut();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return <AuthPage />;
  }

  const showChat = userData?.tag ? ["Ginasta", "Árbitro", "Admin"].includes(userData.tag) : false;

  const mainNavItems = [
    { id: "inicio", path: "/", icon: Home, label: "Início" },
    { id: "quemSomos", path: "/quem-somos", icon: Sparkles, label: "Quem Somos" },
    { id: "competicoes", path: "/competitions", icon: Trophy, label: "Competições" },
    { id: "cursos", path: "/cursos", icon: GraduationCap, label: "Cursos" },
  ];

  const technicalNavItems = [
    { id: "codigo", path: "/code", icon: BookOpen, label: "Código" },
    { id: "elementos", path: "/elements", icon: Shapes, label: "Elementos" },
    { id: "ginastas", path: "/gymnasts", icon: Users, label: "Ginastas" },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#050B14] text-slate-100 font-sans selection:bg-[#009c3b] selection:text-white overflow-hidden">
      {/* Navigation Rail Desktop */}
      <nav className="hidden md:flex flex-col w-24 lg:w-64 border-r border-slate-800 bg-[#070F1C] overflow-y-auto">
        <div className="p-6 mb-4">
          <Link 
            to="/" 
            onContextMenu={(e) => e.preventDefault()}
            className="block select-none"
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
          >
            <div className="hidden lg:block">
              <GymStarsLogo size="sm" variant="horizontal" section="desktop-sidebar" />
            </div>
            <div className="lg:hidden flex items-center justify-center">
              <GymStarsLogo size="xs" variant="symbol" section="desktop-sidebar" />
            </div>
          </Link>
        </div>
        <div className="flex-1 px-4 py-2 space-y-6 overflow-y-auto hidden-scrollbar">
          {/* Main / Core */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-widest text-[#009c3b]/70 mb-3 hidden lg:block">Principal</p>
            {mainNavItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                onContextMenu={(e) => e.preventDefault()}
                className={`group flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 relative overflow-hidden select-none ${
                  isActive(item.path) 
                  ? "bg-[#009c3b]/10 text-white" 
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
              >
                 {isActive(item.path) && (
                   <motion.div layoutId="desktop-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#009c3b] rounded-r-full" />
                 )}
                 <div className="relative z-10 flex items-center space-x-3 transition-transform duration-300 group-hover:translate-x-1">
                   {branding?.menuIcons?.[item.id] ? (
                     <img src={branding.menuIcons[item.id]} alt="" className="object-contain -ml-0.5" style={{ width: branding.menuIconsSize || 24, height: branding.menuIconsSize || 24 }} />
                   ) : (
                     <item.icon className="w-5 h-5 shrink-0 text-slate-450 group-hover:text-slate-200" />
                   )}
                   <span className="font-medium hidden lg:inline text-sm">{item.label}</span>
                 </div>
              </Link>
            ))}
          </div>

          {/* Technical Options */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-widest text-[#009c3b]/70 mb-3 hidden lg:block">Técnica</p>
            {technicalNavItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                onContextMenu={(e) => e.preventDefault()}
                className={`group flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 relative overflow-hidden select-none ${
                  isActive(item.path) 
                  ? "bg-[#009c3b]/10 text-white" 
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
              >
                 {isActive(item.path) && (
                   <motion.div layoutId="desktop-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#009c3b] rounded-r-full" />
                 )}
                 <div className="relative z-10 flex items-center space-x-3 transition-transform duration-300 group-hover:translate-x-1">
                   {branding?.menuIcons?.[item.id] ? (
                     <img src={branding.menuIcons[item.id]} alt="" className="object-contain -ml-0.5" style={{ width: branding.menuIconsSize || 24, height: branding.menuIconsSize || 24 }} />
                   ) : (
                     <item.icon className="w-5 h-5 shrink-0 text-slate-450 group-hover:text-slate-200" />
                   )}
                   <span className="font-medium hidden lg:inline text-sm">{item.label}</span>
                 </div>
              </Link>
            ))}
          </div>

          {/* Social & Admin */}
          {(showChat || userData?.tag === "Árbitro" || userData?.tag === "Admin") && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-white/30 mb-3 hidden lg:block">Sistema</p>
              {showChat && (
                <Link 
                  to="/chat" 
                  className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-300 relative overflow-hidden select-none ${
                    isActive("/chat") 
                    ? "bg-[#009c3b]/10 text-white" 
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                   {isActive("/chat") && (
                     <motion.div layoutId="desktop-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#009c3b] rounded-r-full" />
                   )}
                   <div className="relative z-10 flex items-center space-x-3 transition-transform duration-300 group-hover:translate-x-1">
                     {branding?.menuIcons?.["batePapo"] ? (
                       <img src={branding.menuIcons["batePapo"]} alt="" className="object-contain -ml-0.5" style={{ width: branding.menuIconsSize || 24, height: branding.menuIconsSize || 24 }} />
                     ) : (
                       <MessageSquare className="w-5 h-5 shrink-0 text-slate-450 group-hover:text-slate-200" />
                     )}
                     <span className="font-medium hidden lg:inline flex-1 text-sm">Bate-papo</span>
                   </div>
                   {unreadCount > 0 && (
                     <span className="bg-red-500 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-full flex items-center justify-center lg:absolute lg:top-3 lg:right-4 shadow-md relative z-10">
                       {unreadCount}
                     </span>
                   )}
                </Link>
              )}

              {(userData?.tag === "Árbitro" || userData?.tag === "Admin") && (
                <Link 
                  to="/referee" 
                  className={`group flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 relative overflow-hidden select-none ${
                    isActive("/referee") 
                    ? "bg-yellow-500/10 text-yellow-400" 
                    : "text-slate-400 hover:bg-white/5 hover:text-yellow-400/80"
                  }`}
                >
                   {isActive("/referee") && (
                     <motion.div layoutId="desktop-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-yellow-500 rounded-r-full" />
                   )}
                   <div className="relative z-10 flex items-center space-x-3 transition-transform duration-300 group-hover:translate-x-1">
                     {branding?.menuIcons?.["arbitragem"] ? (
                       <img src={branding.menuIcons["arbitragem"]} alt="" className="object-contain -ml-0.5" style={{ width: branding.menuIconsSize || 24, height: branding.menuIconsSize || 24 }} />
                     ) : (
                       <ShieldCheck className="w-5 h-5 shrink-0 text-slate-450 group-hover:text-slate-200" />
                     )}
                     <span className="font-medium hidden lg:inline text-sm">Arbitragem</span>
                   </div>
                </Link>
              )}

              {userData?.tag === "Admin" && (
                <Link 
                  to="/admin" 
                  className={`group flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 relative overflow-hidden select-none ${
                    isActive("/admin") 
                    ? "bg-indigo-500/10 text-indigo-400" 
                    : "text-slate-400 hover:bg-white/5 hover:text-indigo-400/80"
                  }`}
                >
                   {isActive("/admin") && (
                     <motion.div layoutId="desktop-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                   )}
                   <div className="relative z-10 flex items-center space-x-3 transition-transform duration-300 group-hover:translate-x-1">
                     {branding?.menuIcons?.["admin"] ? (
                       <img src={branding.menuIcons["admin"]} alt="" className="object-contain -ml-0.5" style={{ width: branding.menuIconsSize || 24, height: branding.menuIconsSize || 24 }} />
                     ) : (
                       <ShieldAlert className="w-5 h-5 shrink-0 text-slate-450 group-hover:text-slate-200" />
                     )}
                     <span className="font-medium hidden lg:inline text-sm">Painel Admin</span>
                   </div>
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-800 flex justify-center">
            <NotificationCenter userData={userData} />
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="lg:bg-slate-800/50 lg:p-3 rounded-2xl flex flex-col lg:flex-row items-center space-y-2 lg:space-y-0 lg:space-x-3">
            <Link to="/profile" className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-[#009c3b] flex-shrink-0 border-2 border-white/20 flex items-center justify-center overflow-hidden">
               {userData?.photoURL ? <img src={userData.photoURL} className="w-full h-full object-cover" /> : <UserCircle className="w-6 h-6 text-white/50" />}
            </Link>
            <div className="overflow-hidden hidden lg:block">
              <p className="text-sm font-bold truncate">{userData?.username || "Perfil"}</p>
              <span className="text-[10px] uppercase tracking-widest text-[#009c3b] font-black">{userData?.tag}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Notifications Ticker */}
      <NotificationsTicker />
      <GlobalAudioListener />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Mobile Header (Simulates the old Top Nav on mobile) */}
        <header className="md:hidden h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#050B14] shrink-0 z-50">
          <Link to="/profile" className={`w-8 h-8 rounded-full overflow-hidden border border-white/10 flex items-center justify-center shrink-0 ${isActive("/profile") ? "ring-2 ring-[#009c3b] ring-offset-2 ring-offset-[#050B14]" : ""}`}>
             {userData?.photoURL ? (
               <img src={userData.photoURL} className="w-full h-full object-cover" />
             ) : (
               <UserCircle className={`w-5 h-5 ${isActive("/profile") ? "text-[#009c3b]" : "text-slate-400"}`} />
             )}
          </Link>

          <Link 
            to="/" 
            onContextMenu={(e) => e.preventDefault()}
            className="flex flex-col select-none absolute left-1/2 -translate-x-1/2"
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
          >
            <GymStarsLogo size="xs" variant="horizontal" section="mobile-header" />
          </Link>

          <div className="flex items-center gap-1">
            <NotificationCenter userData={userData} />
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-1 relative">
               <MoreVertical className="w-6 h-6" />
               {unreadCount > 0 && (
                 <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse border border-[#050B14]" />
               )}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-[#070F1C] border-b border-white/5 overflow-hidden z-40 absolute top-14 left-0 right-0 shadow-2xl"
            >
              <div className="px-4 py-4 flex flex-col space-y-6 max-h-[80vh] overflow-y-auto hidden-scrollbar">
                {/* Main / Core */}
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-black uppercase tracking-widest text-[#009c3b]/70 mb-2">Principal</p>
                  {mainNavItems.map((item) => (
                    <Link 
                      key={item.path}
                      to={item.path} 
                      onClick={() => setMobileMenuOpen(false)}
                      className={`group flex items-center space-x-3 p-3 rounded-xl transition-all relative overflow-hidden ${
                        isActive(item.path) 
                        ? "bg-[#009c3b]/10 text-white" 
                        : "text-slate-400 hover:bg-white/5"
                      }`}
                    >
                       {isActive(item.path) && (
                         <motion.div layoutId="mobile-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#009c3b] rounded-r-full" />
                       )}
                       {branding?.menuIcons?.[item.id] ? (
                         <img src={branding.menuIcons[item.id]} alt="" className="object-contain -ml-0.5 relative z-10" style={{ width: branding.menuIconsSize || 24, height: branding.menuIconsSize || 24 }} />
                       ) : (
                         <item.icon className="w-5 h-5 shrink-0 text-slate-450 group-hover:text-slate-200 relative z-10" />
                       )}
                       <span className="font-medium text-sm relative z-10">{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Technical Options */}
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-black uppercase tracking-widest text-[#009c3b]/70 mb-2">Técnica</p>
                  {technicalNavItems.map((item) => (
                    <Link 
                      key={item.path}
                      to={item.path} 
                      onClick={() => setMobileMenuOpen(false)}
                      className={`group flex items-center space-x-3 p-3 rounded-xl transition-all relative overflow-hidden ${
                        isActive(item.path) 
                        ? "bg-[#009c3b]/10 text-white" 
                        : "text-slate-400 hover:bg-white/5"
                      }`}
                    >
                       {isActive(item.path) && (
                         <motion.div layoutId="mobile-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#009c3b] rounded-r-full" />
                       )}
                       {branding?.menuIcons?.[item.id] ? (
                         <img src={branding.menuIcons[item.id]} alt="" className="object-contain -ml-0.5 relative z-10" style={{ width: branding.menuIconsSize || 24, height: branding.menuIconsSize || 24 }} />
                       ) : (
                         <item.icon className="w-5 h-5 shrink-0 text-slate-450 group-hover:text-slate-200 relative z-10" />
                       )}
                       <span className="font-medium text-sm relative z-10">{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Social & Admin */}
                {(showChat || userData?.tag === "Árbitro" || userData?.tag === "Admin") && (
                  <div className="space-y-1 pb-4">
                    <p className="px-3 text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Sistema</p>
                    {showChat && (
                      <Link 
                        to="/chat" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center justify-between p-3 rounded-xl transition-all relative overflow-hidden ${
                          isActive("/chat") 
                          ? "bg-[#009c3b]/10 text-white" 
                          : "text-slate-400 hover:bg-white/5"
                        }`}
                      >
                         {isActive("/chat") && (
                           <motion.div layoutId="mobile-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#009c3b] rounded-r-full" />
                         )}
                         <div className="flex items-center space-x-3 relative z-10">
                           {branding?.menuIcons?.["batePapo"] ? (
                             <img src={branding.menuIcons["batePapo"]} alt="" className="object-contain -ml-0.5" style={{ width: branding.menuIconsSize || 24, height: branding.menuIconsSize || 24 }} />
                           ) : (
                             <MessageSquare className="w-5 h-5 shrink-0 text-slate-450 group-hover:text-slate-200" />
                           )}
                           <span className="font-medium text-sm">Bate-papo</span>
                         </div>
                         {unreadCount > 0 && (
                           <span className="bg-red-500 text-white font-mono text-[9px] font-black px-2 py-0.5 rounded-full relative z-10 shadow-md">
                             {unreadCount} novas
                           </span>
                         )}
                      </Link>
                    )}

                    {(userData?.tag === "Árbitro" || userData?.tag === "Admin") && (
                      <Link 
                        to="/referee" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center space-x-3 p-3 rounded-xl transition-all relative overflow-hidden ${
                          isActive("/referee") 
                          ? "bg-yellow-500/10 text-yellow-400" 
                          : "text-slate-400 hover:bg-white/5 hover:text-yellow-400/80"
                        }`}
                      >
                         {isActive("/referee") && (
                           <motion.div layoutId="mobile-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-yellow-500 rounded-r-full" />
                         )}
                         <div className="flex items-center space-x-3 relative z-10">
                            {branding?.menuIcons?.["arbitragem"] ? (
                              <img src={branding.menuIcons["arbitragem"]} alt="" className="object-contain -ml-0.5" style={{ width: branding.menuIconsSize || 24, height: branding.menuIconsSize || 24 }} />
                            ) : (
                              <ShieldCheck className="w-5 h-5 shrink-0 text-slate-450 group-hover:text-slate-200" />
                            )}
                            <span className="font-medium text-sm">Arbitragem</span>
                         </div>
                      </Link>
                    )}

                    {userData?.tag === "Admin" && (
                      <Link 
                        to="/admin" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center space-x-3 p-3 rounded-xl transition-all relative overflow-hidden ${
                          isActive("/admin") 
                          ? "bg-indigo-500/10 text-indigo-400" 
                          : "text-slate-400 hover:bg-white/5 hover:text-indigo-400/80"
                        }`}
                      >
                         {isActive("/admin") && (
                           <motion.div layoutId="mobile-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                         )}
                         <div className="flex items-center space-x-3 relative z-10">
                            {branding?.menuIcons?.["admin"] ? (
                              <img src={branding.menuIcons["admin"]} alt="" className="object-contain -ml-0.5" style={{ width: branding.menuIconsSize || 24, height: branding.menuIconsSize || 24 }} />
                            ) : (
                              <ShieldAlert className="w-5 h-5 shrink-0 text-slate-450 group-hover:text-slate-200" />
                            )}
                            <span className="font-medium text-sm">Painel Administrativo</span>
                         </div>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 w-full max-w-7xl mx-auto overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-10 pb-6">
             <AnimatePresence mode="wait">
               <motion.div
                 key={location.pathname}
                 className="w-full"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
               >
                 <Outlet context={{ user, userData }} />
               </motion.div>
             </AnimatePresence>
          </div>
        </div>
      </main>


    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target instanceof HTMLImageElement ||
        target.closest('img') ||
        target.closest('a') ||
        target.closest('button') ||
        target.closest('.snap-start')
      ) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target instanceof HTMLImageElement ||
        target.closest('img') ||
        target.closest('a') ||
        target.closest('button')
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('dragstart', handleDragStart, { capture: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('dragstart', handleDragStart, { capture: true });
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      setLoading(true);
      setUser(currUser);
      try {
        if (currUser) {
          const uDoc = await getDoc(doc(db, "users", currUser.uid));
          if (uDoc.exists()) {
            setUserData(uDoc.data() as UserData);
          } else {
            setUserData(null);
          }
        } else {
          setUserData(null);
        }
      } catch (err) {
        console.error("Error loading user profile data:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  if (loading) {
    const isOverlay = window.location.hash.includes("/overlay");
    return (
      <div className={`min-h-screen flex items-center justify-center ${isOverlay ? "bg-transparent" : "bg-[#050B14] text-white"}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#009c3b]"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route element={<Layout user={user} userData={userData} />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/quem-somos" element={<AboutPage />} />
          <Route path="/competitions" element={<CompetitionsPage />} />
          <Route path="/competitions/:id" element={<CompetitionDetail />} />
          <Route path="/gymnasts" element={<GymnastsPage />} />
          <Route path="/gymnasts/:id" element={<GymnastProfile />} />
          <Route path="/profile/:id" element={<GymnastProfile />} />
          <Route path="/code" element={<CodePage />} />
          <Route path="/elements" element={<ElementsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/referee" element={<RefereePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/cursos" element={<CoursesPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
