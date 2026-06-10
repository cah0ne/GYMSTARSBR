import React, { useState, useEffect } from "react";
import { db, collection, query, where, onSnapshot } from "../lib/firebase";
import { BookOpen, GraduationCap, ChevronRight, Calendar, Bookmark, Award } from "lucide-react";
import { motion } from "motion/react";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch published courses for public view
    const q = query(
      collection(db, "appContent"),
      where("type", "==", "course"),
      where("status", "==", "Publicado")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCourses(loaded);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar cursos públicos:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="bg-[#009c3b]/10 border border-[#009c3b]/20 p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#009c3b]/5 rounded-full -mr-24 -mt-24 blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-32 h-32 bg-[#009c3b]/10 rounded-full blur-2xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="bg-[#009c3b]/20 p-4 rounded-3xl backdrop-blur-md">
              <GraduationCap className="w-10 h-10 text-[#009c3b] shadow-[0_0_15px_rgba(0,156,59,0.3)] animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter">
                Portal de Cursos
              </h1>
              <p className="text-slate-400 font-medium text-sm sm:text-base mt-1">
                Aprimore suas habilidades e conquiste novas certificações na ginástica
              </p>
            </div>
          </div>
          <div className="bg-black/30 border border-slate-800 px-5 py-3 rounded-2xl backdrop-blur-md text-slate-400 text-xs font-semibold flex items-center gap-2 shrink-0">
            <Award className="w-4 h-4 text-amber-500" />
            Certificado Oficial GymStars
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-4 bg-[#070F1C] border border-slate-800 rounded-[2.5rem]">
          <div className="w-10 h-10 border-4 border-[#009c3b]/30 border-t-[#009c3b] rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 animate-pulse">
            Carregando cursos disponíveis...
          </span>
        </div>
      ) : courses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-24 px-6 flex flex-col items-center text-center bg-[#070F1C]/60 border border-slate-800/80 rounded-[2.5rem] relative overflow-hidden"
        >
          {/* Ambient background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#009c3b]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-full mb-6 shadow-2xl relative z-10">
            <BookOpen className="w-12 h-12 text-slate-600" />
          </div>
          
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none mb-3 uppercase italic relative z-10">
            Nenhum curso disponível no momento
          </h3>
          <p className="text-slate-400 max-w-md font-medium text-sm sm:text-base leading-relaxed mb-6 relative z-10">
            Nossos instrutores estão preparando materiais exclusivos para você. Fique de olho nas novidades para garantir sua vaga!
          </p>
          
          <div className="bg-[#009c3b]/10 border border-[#009c3b]/20 px-4 py-2 rounded-full text-[11px] text-[#009c3b] font-black uppercase tracking-widest relative z-10 animate-bounce">
            Em breve novos lançamentos 🚀
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="group bg-[#070F1C] border border-slate-850 hover:border-[#009c3b]/40 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl hover:shadow-[#009c3b]/5 transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Cover Image */}
              <div className="aspect-[16/9] w-full relative overflow-hidden bg-slate-950">
                {course.coverImage ? (
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#070F1C] to-[#0A1221] flex items-center justify-center relative">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#009c3b_1px,transparent_1px)] [background-size:16px_16px]" />
                    <GraduationCap className="w-12 h-12 text-[#009c3b]/40 group-hover:scale-110 transition-transform" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-65" />
                <div className="absolute top-4 right-4 bg-black/60 border border-slate-800/80 px-3 py-1 rounded-full text-[10px] text-slate-300 font-bold tracking-wider flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-amber-500" />
                  Curso Ativo
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  Atualizado Recentemente
                </div>
                
                <h3 className="text-xl font-black text-white leading-snug uppercase italic tracking-tight group-hover:text-[#009c3b] transition-colors line-clamp-1">
                  {course.title}
                </h3>
                
                <p className="text-slate-400 text-sm leading-relaxed mt-2.5 line-clamp-3 mb-6 font-medium flex-1">
                  {course.description}
                </p>

                <div className="pt-5 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#009c3b]">
                    Conteúdo Completo
                  </span>
                  <button className="flex items-center gap-1 bg-[#009c3b] hover:bg-[#008031] text-white py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-[#009c3b]/20 active:scale-95 cursor-not-allowed opacity-80 shadow-md">
                    Matricular-se
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
