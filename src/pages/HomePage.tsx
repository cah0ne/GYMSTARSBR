import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { 
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
  Search,
  MessageSquare,
  Pin,
  Trash2,
  Edit2,
  Send,
  Plus,
  Image as ImageIcon,
  User,
  X,
  AlertCircle,
  Link as LinkIcon,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import GymStarsLogo from "../components/GymStarsLogo";
import { 
  db, 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  where, 
  getDocs 
} from "../lib/firebase";
import { UserData } from "../App";
import { RichTextEditor } from "../components/RichTextEditor";
import VerifiedBadge from "../components/VerifiedBadge";
import "quill/dist/quill.snow.css";

// Map strings to Lucide components for dynamic icon rendering
const IconMapping: Record<string, React.ComponentType<{ className?: string }>> = {
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

interface CustomCard {
  title: string;
  desc: string;
  iconName?: string;
  iconUrl?: string;
  iconBase64?: string;
  iconSize?: number;
  color: string;
  link: string;
}

const DEFAULT_CARDS: CustomCard[] = [
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
  },
];

interface Post {
  id: string;
  title: string;
  caption: string;
  imageUrl?: string;
  isPinned?: boolean;
  mentionedLink?: string;
  likes?: string[];
  createdAt: number;
}

interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  text: string;
  userVerified?: boolean;
  userPhotoURL?: string;
  createdAt: number;
}

const AVAILABLE_PAGES = [
  { label: "Nenhuma (Sem menção)", value: "" },
  { label: "Home (Página Inicial)", value: "/" },
  { label: "Quem Somos", value: "/quem-somos" },
  { label: "Competições", value: "/competitions" },
  { label: "Ginastas", value: "/gymnasts" },
  { label: "Código de Pontuação", value: "/code" },
  { label: "Elementos", value: "/elements" },
  { label: "Bate-Papo / Chat", value: "/chat" },
];

export default function HomePage() {
  const { userData } = useOutletContext<{ userData: UserData | null }>();
  const navigate = useNavigate();
  const [heroSubtitle, setHeroSubtitle] = useState("A plataforma definitiva de ginástica artística do Brasil. Ao vivo, transparente e no seu ritmo.");
  const [cards, setCards] = useState<CustomCard[]>(DEFAULT_CARDS);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerType, setBannerType] = useState<"upload"|"url">("upload");
  const [bannerBase64, setBannerBase64] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerLink, setBannerLink] = useState("/");

  // Feed States
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mentionedLink, setMentionedLink] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  
  // Edit post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editMentionedLink, setEditMentionedLink] = useState("");

  // Comment logic states
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [postCommentsMap, setPostCommentsMap] = useState<Record<string, Comment[]>>({});
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [deleteConfirmationState, setDeleteConfirmationState] = useState<{
    id: string;
    postId?: string;
    type: "post" | "comment";
    displayName?: string;
  } | null>(null);

  const [liveCompetitions, setLiveCompetitions] = useState<any[]>([]);

  useEffect(() => {
    // Listen for homepage content (subtitle and cards)
    const unsubContent = onSnapshot(doc(db, "appContent", "homepage"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.heroSubtitle) setHeroSubtitle(data.heroSubtitle);
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
              desc: "Nossa história e missão.",
              iconName: "Sparkles",
              color: "text-indigo-400",
              link: "/quem-somos",
            });
          }
          setCards(loadedCards);
        }
      }
    });

    // Listen for posts
    const qPosts = query(collection(db, "feed"), orderBy("createdAt", "desc"), limit(20));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
      setLoading(false);
    }, (error) => {
      console.error("Error loading posts:", error);
      setLoading(false);
    });

    // Listen for live competitions
    const qLive = query(collection(db, "competitions"), where("status", "==", "ao vivo"));
    const unsubLive = onSnapshot(qLive, (snap) => {
      setLiveCompetitions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubContent();
      unsubPosts();
      unsubLive();
    };
  }, []);

  useEffect(() => {
    const unsubBranding = onSnapshot(doc(db, "appContent", "branding"), (snap) => {
      if (snap.exists()) setBranding(snap.data());
    });
    return () => unsubBranding();
  }, []);

  useEffect(() => {
    if (posts.length === 0) return;

    // Listen for ALL comments for the visible posts for real-time counts
    const postIds = posts.map(p => p.id);
    
    // Firestore 'in' queries are strictly limited to 10 items.
    const chunks = [];
    for ( let i = 0; i < postIds.length; i += 10 ) {
       chunks.push(postIds.slice(i, i + 10));
    }

    const unsubs: (() => void)[] = [];
    let allCommentsAggregated: Comment[] = [];
    const newMap: Record<string, Comment[]> = {};
    
    // We rebuild the map whenever ANY block updates. Since we only fetch up to 20 posts, 
    // it's max 2 chunks.
    const updateMap = () => {
      const computedMap: Record<string, Comment[]> = {};
      allCommentsAggregated.forEach(c => {
        if (!computedMap[c.postId]) computedMap[c.postId] = [];
        computedMap[c.postId].push(c);
      });
      setPostCommentsMap(computedMap);
    };

    chunks.forEach((chunk, chunkIndex) => {
       const q = query(
         collection(db, "feed_comments"), 
         where("postId", "in", chunk)
       );
       
       const unsub = onSnapshot(q, (snap) => {
         const chunkComments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
         // Filter out this chunk's posts from aggregated, then push new ones to prevent dupes
         allCommentsAggregated = allCommentsAggregated.filter(c => !chunk.includes(c.postId));
         allCommentsAggregated.push(...chunkComments);
         updateMap();
       });
       unsubs.push(unsub);
    });

    return () => {
       unsubs.forEach(u => u());
    };
  }, [posts]);

  // Feed Actions (Duplicated from FeedPage for now)
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || userData.tag !== "Admin") return;

    if (!title.trim() || !caption.trim()) {
      setStatusMsg({ text: "Insira um título e uma legenda descritiva.", type: "error" });
      setTimeout(() => setStatusMsg(null), 5000);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "feed"), {
        title: title.trim(),
        caption: caption.trim(),
        imageUrl: imageUrl.trim() || null,
        mentionedLink: mentionedLink || null,
        isPinned: !!isPinned,
        likes: [],
        createdAt: Date.now(),
      });

      // Notify all users about the new post
      await addDoc(collection(db, "notifications"), {
        title: "Novo no Mural!",
        message: title.trim(),
        type: "post",
        link: "/",
        createdAt: Date.now(),
        senderId: userData.uid
      });

      setTitle(""); setCaption(""); setImageUrl(""); setMentionedLink(""); setIsPinned(false); setShowAddForm(false);
      setStatusMsg({ text: "Publicação compartilhada no feed!", type: "success" });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (e: any) {
      console.error(e);
      setStatusMsg({ text: "Erro ao criar post: " + e.message, type: "error" });
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const handleUpdatePost = async (postId: string) => {
    if (!userData || userData.tag !== "Admin") return;
    if (!editTitle.trim() || !editCaption.trim()) {
      setStatusMsg({ text: "Título e legenda são obrigatórios.", type: "error" });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }
    try {
      await updateDoc(doc(db, "feed", postId), {
        title: editTitle.trim(),
        caption: editCaption.trim(),
        imageUrl: editImageUrl.trim() || null,
        mentionedLink: editMentionedLink || null,
      });
      setEditingPostId(null);
      setStatusMsg({ text: "Publicação atualizada com sucesso!", type: "success" });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (e: any) {
      setStatusMsg({ text: "Erro ao atualizar: " + e.message, type: "error" });
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!userData || userData.tag !== "Admin") return;
    try {
      await deleteDoc(doc(db, "feed", postId));
      const q = query(collection(db, "feed_comments"), where("postId", "==", postId));
      const snap = await getDocs(q);
      snap.docs.forEach(async (d) => { await deleteDoc(doc(db, "feed_comments", d.id)); });
      setStatusMsg({ text: "Publicação removida.", type: "success" });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (e: any) {
      setStatusMsg({ text: "Erro ao excluir: " + e.message, type: "error" });
      setTimeout(() => setStatusMsg(null), 5000);
    } finally { setDeleteConfirmationState(null); }
  };

  const handleTogglePin = async (post: Post) => {
    if (!userData || userData.tag !== "Admin") return;
    try {
      await updateDoc(doc(db, "feed", post.id), { isPinned: !post.isPinned });
      setStatusMsg({ text: post.isPinned ? "Publicação desfixada!" : "Publicação fixada!", type: "success" });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) { console.error(e); }
  };

  const handleToggleLike = async (post: Post) => {
    if (!userData) return;
    const currentLikes = post.likes || [];
    const userId = userData.uid;
    const liked = Array.isArray(currentLikes) && currentLikes.includes?.(userId);
    const updatedLikes = liked ? currentLikes.filter((id) => id !== userId) : [...currentLikes, userId];
    try { await updateDoc(doc(db, "feed", post.id), { likes: updatedLikes }); } 
    catch (e: any) { console.error("Error liking:", e); }
  };

  const handleAddComment = async (postId: string) => {
    if (!userData) return;
    const text = commentInputs[postId] || "";
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, "feed_comments"), {
        postId, userId: userData.uid, username: userData.username, text: text.trim(),
        userVerified: !!userData.verified, userPhotoURL: userData.photoURL || null, createdAt: Date.now(),
      });
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch (e: any) { console.error("Error posting comment:", e); }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!userData) return;
    try { await deleteDoc(doc(db, "feed_comments", commentId)); } 
    catch (e: any) { console.error("Error deleting comment:", e); } 
    finally { setDeleteConfirmationState(null); }
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  const promptDeletePost = (post: Post) => setDeleteConfirmationState({ id: post.id, type: "post", displayName: post.title });
  const promptDeleteComment = (commentId: string, text: string, postId: string) => 
    setDeleteConfirmationState({ id: commentId, postId, type: "comment", displayName: text.substring(0, 50) });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <span className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#009c3b]"></span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 max-w-5xl mx-auto pt-4 md:pt-6">
      {/* Live Competitions Banner */}
      <style>{`
        @keyframes seamless-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-seamless-marquee {
          display: flex;
          width: max-content;
          animation: seamless-marquee 15s linear infinite;
        }
      `}</style>
      {liveCompetitions.length > 0 && (
        <div className="px-2">
          {liveCompetitions.map((comp) => (
            <Link 
              key={comp.id} 
              to={`/competitions/${comp.id}`}
              className="block group relative w-full overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 to-black border border-slate-800/60 p-0 mb-6 cursor-pointer shadow-2xl transition-all hover:border-slate-700 hover:shadow-red-500/10"
            >
               {/* Cyber/scanline effect in background */}
               <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
               <div className="absolute top-0 left-0 right-0 h-24 bg-red-500/5 blur-3xl group-hover:bg-red-500/10 transition-all duration-700" />

               <div className="relative pt-6 pb-5 flex flex-col">
                 <div className="px-6 flex items-center justify-between z-10 mb-5">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="relative flex h-2.5 w-2.5">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                     </span>
                     <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.25em]">Score Ao Vivo</span>
                   </div>
                   <div className="text-[10px] uppercase font-mono text-slate-500 font-medium tracking-wide">
                     {comp.type}
                   </div>
                 </div>
                 
                   <div className="w-full overflow-hidden py-4 border-y border-white/[0.03] bg-white/[0.01]" style={{ maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)" }}>
                    <div className="animate-seamless-marquee flex items-center gap-8">
                      {[...Array(6)].map((_, i) => (
                        <h3 key={i} className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 font-black text-3xl sm:text-4xl italic uppercase tracking-tighter whitespace-nowrap">
                          {comp.name}
                          <span className="inline-block mx-8 text-red-500/40 font-sans font-light text-2xl not-italic">✦</span>
                        </h3>
                      ))}
                    </div>
                   </div>

                 <div className="px-6 mt-5 flex items-center justify-between">
                   <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Acompanhar resultados</span>
                   <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-red-400 group-hover:translate-x-1.5 transition-all duration-300" />
                 </div>
               </div>
            </Link>
          ))}
        </div>
      )}

      {/* Outdoor Banner */}
      {bannerEnabled && ((bannerType === "upload" && bannerBase64) || (bannerType === "url" && bannerUrl)) && (
        <div className="px-4 pb-4 pt-2">
          <Link to={bannerLink || "/"} className="block overflow-hidden rounded-2xl md:rounded-3xl shadow-xl border border-slate-800 relative group aspect-[3/1] bg-slate-950 w-full">
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
             <img 
               src={bannerType === "upload" ? bannerBase64 : bannerUrl} 
               alt="Anúncio Especial" 
               className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-500 group-hover:scale-[1.02]" 
               onContextMenu={(e) => e.preventDefault()}
             />
          </Link>
        </div>
      )}

      {/* Quick Navigation Cards - Compact Horizontal Scroll */}
      <div className="space-y-4 px-2">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Acesso Rápido</h3>
        </div>
        <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar snap-x touch-pan-x px-2">
          {cards.map((card, i) => {
            const cardIconSrc = card.iconBase64 || card.iconUrl;

            return (
              <motion.div
                key={card.title + i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="snap-start"
              >
                <Link
                  to={card.link}
                  className="block group bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:bg-neutral-800 transition-all min-w-[140px] sm:min-w-[160px] text-center select-none no-callout"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {cardIconSrc && (
                    <div className={`mx-auto mb-2 w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center ${card.color || "text-yellow-500"}`}>
                      <img 
                        src={cardIconSrc} 
                        alt={card.title} 
                        className="object-contain rounded animate-fade-in select-none pointer-events-none"
                        referrerPolicy="no-referrer"
                        draggable="false"
                        style={{ 
                          width: `${card.iconSize || 22}px`, 
                          height: `${card.iconSize || 22}px`
                        }}
                      />
                    </div>
                  )}
                  <span className="text-xs uppercase tracking-wider font-bold text-white block truncate group-hover:text-green-400 select-none pointer-events-none">{card.title}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Social Feed Section */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 px-4 sm:px-0">
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Timeline</h2>
          {userData?.tag === "Admin" && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-[#009c3b] hover:bg-[#007c2f] transition-colors text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-[#009c3b]/10 cursor-pointer"
            >
              {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddForm ? "Fechar" : "Novo Post"}
            </button>
          )}
        </div>

        {statusMsg && (
          <div className={`p-4 mx-4 sm:mx-0 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
            statusMsg.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            <AlertCircle className="w-4 h-4" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Admin Post Composer */}
        <AnimatePresence>
          {showAddForm && userData?.tag === "Admin" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-4 sm:mx-0 bg-[#070F1C] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <form onSubmit={handleCreatePost} className="space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#009c3b]"
                  placeholder="Título do Post"
                />
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden quill-dark">
                  <RichTextEditor value={caption} onChange={setCaption} placeholder="Mensagem ou Legenda (Commit message)..." />
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#009c3b]"
                  placeholder="URL da Imagem (Opcional)"
                />
                <div className="flex gap-2">
                  <select
                    value={mentionedLink}
                    onChange={(e) => setMentionedLink(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {AVAILABLE_PAGES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button type="submit" className="bg-[#009c3b] hover:bg-[#007c2f] transition-all text-white font-bold text-xs py-2 px-5 rounded-xl flex items-center gap-1 cursor-pointer">
                    <Send className="w-3 h-3" /> Publicar
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline Posts */}
        <div className="space-y-6">
          {sortedPosts.length === 0 ? (
            <div className="text-center py-20 text-slate-500 italic text-sm">Nenhuma publicação ainda.</div>
          ) : (
            sortedPosts.map((post) => {
              const isLiked = post.likes?.includes(userData?.uid || "") || false;
              const postComments = (postCommentsMap[post.id] || []).sort((a, b) => a.createdAt - b.createdAt);
              const isEditing = editingPostId === post.id;
              const showComments = !!openComments[post.id];

              return (
                <article
                  key={post.id}
                  className={`mx-4 sm:mx-0 bg-[#070F1C] border rounded-3xl overflow-hidden shadow-xl transition-all ${
                    post.isPinned ? "border-indigo-500/40" : "border-slate-800/60"
                  }`}
                >
                  <div className="p-4 flex items-center justify-between border-b border-slate-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 shrink-0">
                        {branding?.feedLogoBase64 || branding?.feedLogoUrl ? (
                          <img 
                            src={branding.feedLogoBase64 || branding.feedLogoUrl} 
                            alt="Perfl" 
                            className="w-full h-full object-cover rounded-full border border-slate-800" 
                          />
                        ) : (
                          <GymStarsLogo variant="symbol" size="sm" className="w-full h-full p-1 bg-[#050B14] rounded-full border border-slate-800" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-white text-sm uppercase">GYMSTARS BRASIL</span>
                          <VerifiedBadge className="w-3.5 h-3.5 text-blue-500 inline" />
                        </div>
                        <span className="text-neutral-500 text-[11px] block">@gymstarsbr</span>
                      </div>
                    </div>
                    {userData?.tag === "Admin" && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingPostId(isEditing ? null : post.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleTogglePin(post)} className={`p-1.5 rounded-lg border ${post.isPinned ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" : "text-slate-400 bg-slate-900 border-slate-800"}`}><Pin className="w-3.5 h-3.5" /></button>
                        <button onClick={() => promptDeletePost(post)} className="p-1.5 rounded-lg text-red-400 bg-red-950/20 border border-red-900/30"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="p-5 space-y-3 bg-black/10">
                      <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white" />
                      <div className="quill-dark"><RichTextEditor value={editCaption} onChange={setEditCaption} /></div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingPostId(null)} className="bg-slate-800 text-xs px-3 py-1.5 rounded-lg">Cancelar</button>
                        <button onClick={() => handleUpdatePost(post.id)} className="bg-[#009c3b] text-xs px-4 py-1.5 rounded-lg font-bold">Salvar</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {post.imageUrl && (
                        <div className="aspect-video bg-black/40 border-b border-slate-800/10">
                          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-5 space-y-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">{post.title}</h2>
                        <div className="text-slate-300 text-sm leading-relaxed ql-editor !px-0" dangerouslySetInnerHTML={{ __html: post.caption }} />
                        {post.mentionedLink && (
                          <div className="pt-2">
                            <Link to={post.mentionedLink} className="inline-flex items-center gap-2 bg-[#009c3b]/10 text-[#009c3b] px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105">
                              Explorar Página <LinkIcon className="w-3 h-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-slate-900/30 border-t border-slate-800/40 flex items-center gap-6 text-xs text-slate-400">
                    <button onClick={() => handleToggleLike(post)} className={`flex items-center gap-1.5 font-bold transition-colors ${isLiked ? "text-red-500" : "hover:text-red-400"}`}>
                      <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500" : ""}`} /> <span>{post.likes?.length || 0}</span>
                    </button>
                    <button onClick={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))} className="flex items-center gap-1.5 font-bold hover:text-slate-200">
                      <MessageSquare className="w-4 h-4" /> <span>{postComments.length} Comentários</span>
                    </button>
                    <span className="text-[10px] text-slate-500 ml-auto font-mono">{new Date(post.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>

                  <AnimatePresence>
                    {showComments && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-black/25 border-t border-slate-800/60 p-4 space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && handleAddComment(post.id)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:border-[#009c3b] focus:outline-none"
                            placeholder="Comentar..."
                          />
                          <button onClick={() => handleAddComment(post.id)} className="bg-slate-800 p-2 rounded-xl border border-slate-700 transition-colors hover:text-[#009c3b]"><Send className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="space-y-3">
                          {postComments.map(c => (
                            <div key={c.id} className="flex gap-3 items-start bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/20">
                              <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                                {c.userPhotoURL ? <img src={c.userPhotoURL} className="w-full h-full object-cover" alt="" /> : <div className="flex items-center justify-center h-full text-xs font-bold">@</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-xs text-white">@{c.username}</span>
                                  {c.userVerified && <VerifiedBadge className="w-2.5 h-2.5 text-blue-500" />}
                                </div>
                                <p className="text-slate-300 text-xs mt-1">{c.text}</p>
                              </div>
                              {(userData?.uid === c.userId || userData?.tag === "Admin") && <button onClick={() => promptDeleteComment(c.id, c.text, post.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 className="w-3 h-3" /></button>}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmationState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#050D19] border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="font-bold text-white">Confirmar Exclusão?</h3>
              <p className="text-xs text-slate-400 italic">"{deleteConfirmationState.displayName}"</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteConfirmationState(null)} className="bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold text-slate-400">Cancelar</button>
                <button onClick={() => { if(deleteConfirmationState.type === "post") handleDeletePost(deleteConfirmationState.id); else handleDeleteComment(deleteConfirmationState.id, deleteConfirmationState.postId!); }} className="bg-red-600 px-4 py-2 rounded-xl text-xs font-bold text-white">Excluir</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
