import React, { useState, useEffect } from "react";
import clsx from "clsx";
import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  auth,
  onAuthStateChanged,
} from "../lib/firebase";
import {
  BookOpen,
  GraduationCap,
  ChevronRight,
  Calendar,
  Bookmark,
  Award,
  Clock,
  Trophy,
  Flame,
  CheckCircle2,
  ChevronLeft,
  Play,
  FileText,
  Download,
  Lock,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Interactive Modal for the classroom
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isClassroomOpen, setIsClassroomOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState<string | null>(null);

  // Authentication observer
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (curr) => {
      setUser(curr);
    });
    return () => unsub();
  }, []);

  // Fetch only published courses
  useEffect(() => {
    const q = query(
      collection(db, "appContent"),
      where("type", "==", "course"),
      where("status", "==", "Publicado"),
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
      },
    );

    return () => unsub();
  }, []);

  // Watch currently opened course for real-time updates (e.g. when Admin uploads certificate)
  useEffect(() => {
    if (!selectedCourse) return;
    const courseRef = doc(db, "appContent", selectedCourse.id);
    const unsub = onSnapshot(courseRef, (snap) => {
      if (snap.exists()) {
        setSelectedCourse({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [selectedCourse?.id]);

  // Statistics calculation
  const totalEnrolled = courses.filter((c) =>
    c.enrolledUsers?.includes(user?.uid),
  ).length;
  const completedCourses = courses.filter((c) =>
    c.completedUsers?.includes(user?.uid),
  );
  const totalCompleted = completedCourses.length;
  const totalHours = completedCourses.reduce(
    (sum, c) => sum + (Number(c.cargaHoraria) || 20),
    0,
  );

  // Enrollment handler
  const handleEnroll = async (course: any) => {
    if (!user) {
      alert(
        "Por favor, faça login ou cadastre-se para se matricular no curso.",
      );
      return;
    }
    setIsRegistering(course.id);
    try {
      const enrolled = course.enrolledUsers || [];
      if (!enrolled.includes(user.uid)) {
        await updateDoc(doc(db, "appContent", course.id), {
          enrolledUsers: [...enrolled, user.uid],
        });
      }
    } catch (err) {
      console.error("Erro ao realizar matrícula:", err);
    } finally {
      setIsRegistering(null);
    }
  };

  // Complete course action
  const handleCompleteCourse = async (course: any) => {
    if (!user) return;
    try {
      const completed = course.completedUsers || [];
      if (!completed.includes(user.uid)) {
        await updateDoc(doc(db, "appContent", course.id), {
          completedUsers: [...completed, user.uid],
        });
      }
    } catch (err) {
      console.error("Erro ao concluir curso:", err);
    }
  };

  // Download custom certificate
  const handleDownloadCertificate = (
    base64Cert: string,
    courseTitle: string,
  ) => {
    try {
      const link = document.createElement("a");
      link.href = base64Cert;
      link.download = `Certificado_GymStars_${courseTitle.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Falaha ao realizar o download:", error);
      // Fallback
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(
          `<img src="${base64Cert}" style="max-width:100%;" />`,
        );
      }
    }
  };

  // Download guidelines PDF manual helper
  const handleDownloadPdf = (base64Pdf: string, filename: string) => {
    try {
      const link = document.createElement("a");
      link.href = base64Pdf;
      link.download = filename || "Manual_Diretrizes_GYMSTARS_BRASIL.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro ao baixar o manual PDF:", error);
      // Fallback
      window.open(base64Pdf, "_blank");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="bg-[#009c3b]/10 border border-[#009c3b]/20 p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#009c3b]/5 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-32 h-32 bg-[#009c3b]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="bg-[#009c3b]/20 p-4 rounded-3xl backdrop-blur-md">
              <GraduationCap className="w-10 h-10 text-[#009c3b] shadow-[0_0_15px_rgba(0,156,59,0.3)]" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter">
                Portal de Cursos
              </h1>
              <p className="text-slate-400 font-medium text-sm sm:text-base mt-1">
                Aprimore suas habilidades e conquiste novas certificações na
                ginástica
              </p>
            </div>
          </div>
          <div className="bg-black/30 border border-slate-800 px-5 py-3 rounded-2xl backdrop-blur-md text-slate-400 text-xs font-semibold flex items-center gap-2 shrink-0">
            <Award className="w-4 h-4 text-amber-500 animate-bounce" />
            CERTIFICADO OFICIAL GYMSTARS BRASIL
          </div>
        </div>
      </div>

      {/* User Progress Stats Dashboard */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {/* Card 1: Enrolled */}
          <div className="bg-[#070F1C]/70 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
            <div className="bg-blue-500/10 p-3 rounded-2xl">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Cursos Inscritos
              </h4>
              <p className="text-2xl font-black text-white mt-1">
                {totalEnrolled}
              </p>
            </div>
          </div>

          {/* Card 2: Concluded count */}
          <div className="bg-[#070F1C]/70 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#009c3b]/5 rounded-full blur-2xl group-hover:bg-[#009c3b]/10 transition-colors pointer-events-none" />
            <div className="bg-[#009c3b]/10 p-3 rounded-2xl">
              <Award className="w-6 h-6 text-[#009c3b]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Cursos Concluídos
              </h4>
              <p className="text-2xl font-black text-white mt-1">
                {totalCompleted}
              </p>
            </div>
          </div>

          {/* Card 3: Summed Workload hours */}
          <div className="bg-[#070F1C]/70 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
            <div className="bg-amber-500/10 p-3 rounded-2xl">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Horas de Carga Horária
              </h4>
              <p className="text-2xl font-black text-white mt-1">
                {totalHours}{" "}
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  horas
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Catalog Area */}
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#009c3b]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-full mb-6 shadow-2xl relative z-10">
            <BookOpen className="w-12 h-12 text-slate-600" />
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none mb-3 uppercase italic relative z-10">
            Nenhum curso disponível no momento
          </h3>
          <p className="text-slate-400 w-full max-w-md mx-auto font-medium text-sm sm:text-base leading-relaxed mb-6 relative z-10 text-center">
            Nossos instrutores estão preparando materiais exclusivos para você.
            Fique de olho nas novidades para garantir sua vaga!
          </p>

          <div className="bg-[#009c3b]/10 border border-[#009c3b]/20 px-4 py-2 rounded-full text-[11px] text-[#009c3b] font-black uppercase tracking-widest relative z-10 animate-bounce">
            Em breve novos lançamentos
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, index) => {
            const isEnrolled =
              user && course.enrolledUsers?.includes(user?.uid);
            const isCompleted =
              user && course.completedUsers?.includes(user?.uid);
            const isRegistrationOpen = course.registrationStatus !== "Fechado";

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="group bg-[#070F1C] border border-slate-850 hover:border-[#009c3b]/40 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl hover:shadow-[#009c3b]/5 transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Cover Image in 4:5 Portrait Ratio */}
                <div className="aspect-[4/5] w-full relative overflow-hidden bg-slate-950">
                  {course.coverImage ? (
                    <img
                      src={course.coverImage || undefined}
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

                  {/* Gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-80" />

                  {/* Status Badges Overlaid on 4:5 image */}
                  <div className="absolute top-4 left-4 flex gap-1.5 flex-wrap">
                    <span className="bg-black/80 border border-slate-800 px-3 py-1.5 rounded-xl text-[9px] text-slate-300 font-black uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-sm shadow-lg">
                      <Clock className="w-3.5 h-3.5 text-[#009c3b]" />
                      {course.cargaHoraria || 20} HORAS
                    </span>
                  </div>

                  <div className="absolute top-4 right-4 flex gap-1.5">
                    {isEnrolled ? (
                      <span
                        className={clsx(
                          "bg-black/90 border px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-sm shadow-xl",
                          isCompleted
                            ? "border-[#009c3b] text-[#009c3b]"
                            : "border-indigo-500 text-indigo-400",
                        )}
                      >
                        {isCompleted ? "✓ Concluído" : "Estudando"}
                      </span>
                    ) : !isRegistrationOpen ? (
                      <span className="bg-red-500 border border-red-500 px-3 py-1.5 rounded-xl text-[9px] text-white font-black uppercase tracking-wider flex items-center gap-1 backdrop-blur-sm shadow-xl">
                        <Lock className="w-3 h-3" /> Encerrado
                      </span>
                    ) : (
                      <span className="bg-[#009c3b] text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xl">
                        Aberto
                      </span>
                    )}
                  </div>

                  {/* Bottom Text Overlay in Cover to give more space */}
                  <div className="absolute bottom-0 inset-x-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black via-black/80 to-transparent">
                    <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Curso Certificado
                    </div>

                    <h3 className="text-xl font-black text-white leading-tight uppercase italic tracking-tight group-hover:text-[#009c3b] transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                  </div>
                </div>

                {/* Sub Body for descriptions and action */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div
                    className="text-slate-400 text-sm leading-relaxed font-medium mb-6 ql-editor !p-0"
                    dangerouslySetInnerHTML={{
                      __html: course.description || "",
                    }}
                  />

                  <div className="pt-5 border-t border-slate-800/60 flex items-center justify-between gap-4">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#009c3b]" />
                      {course.enrolledUsers?.length || 0} alunos
                    </span>

                    {isEnrolled ? (
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setIsClassroomOpen(true);
                        }}
                        className="flex items-center gap-1.5 bg-[#009c3b] hover:bg-[#008031] text-white py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-[#009c3b]/20 active:scale-95 shadow-md shadow-[#009c3b]/10"
                      >
                        Entrar no Curso
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : !isRegistrationOpen ? (
                      <button
                        disabled
                        className="flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-500 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-not-allowed opacity-60"
                      >
                        Inscrições Encerradas
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course)}
                        disabled={isRegistering === course.id}
                        className="flex items-center gap-1.5 bg-white text-black hover:bg-slate-200 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-transparent active:scale-95 shadow-md disabled:opacity-50"
                      >
                        {isRegistering === course.id
                          ? "Matriculando..."
                          : "Matricular-se"}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Classroom environment View overlay / custom modal */}
      <AnimatePresence>
        {isClassroomOpen && selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#040812]/95 backdrop-blur-md z-50 overflow-y-auto"
          >
            <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-between">
              {/* Classroom header */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-6 mb-8">
                <button
                  onClick={() => {
                    setIsClassroomOpen(false);
                    setSelectedCourse(null);
                  }}
                  className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-slate-300 font-bold px-4 py-2.5 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-1.5 transition active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Sair da Sala
                </button>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-block text-[11px] font-black uppercase tracking-widest bg-[#009c3b]/10 text-[#009c3b] px-3.5 py-1.5 rounded-full border border-[#009c3b]/20">
                    Sua Matrícula está Ativa ✅
                  </span>
                </div>
              </div>

              {/* Classroom Body */}
              <div className="space-y-8 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left panel: Info & work load */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#070F1C] border border-slate-850 p-6 rounded-3xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#009c3b]/5 rounded-full blur-2xl pointer-events-none" />

                      <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-slate-800/80 mb-5">
                        {selectedCourse.coverImage ? (
                          <img
                            src={selectedCourse.coverImage || undefined}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                            <GraduationCap className="w-12 h-12 text-[#009c3b]" />
                          </div>
                        )}
                      </div>

                      <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
                        {selectedCourse.title}
                      </h2>

                      {/* Prominent hours workload info display block requested */}
                      <div className="mt-5 p-4 bg-[#009c3b]/10 border border-[#009c3b]/20 rounded-2xl flex items-center gap-3">
                        <Clock className="w-6 h-6 text-[#009c3b] flex-shrink-0" />
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Carga Horária Oficial
                          </span>
                          <span className="text-sm font-black text-white uppercase">
                            {selectedCourse.cargaHoraria || 20} horas
                            certificadas
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right panel: Lessons status content & completion Certificate actions */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#070F1C] border border-slate-850 p-6 rounded-3xl space-y-5">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider italic flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[#009c3b]" />
                        Módulos do Curso & Homologação
                      </h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Instruções: A liberação do seu certificado está
                        condicionada à sua presença nas aulas e à conclusão das
                        tarefas propostas.
                      </p>

                      {/* Real database status modules */}
                      <div className="space-y-3.5">
                        {/* Module 1 */}
                        {(() => {
                          const isM1Done =
                            !!selectedCourse.completedModulesByStudent?.[
                              user?.uid
                            ]?.m1;
                          return (
                            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex items-center justify-between gap-4 transition duration-200">
                              <div className="flex items-center gap-3">
                                <div
                                  className={clsx(
                                    "p-2 rounded-xl",
                                    isM1Done
                                      ? "bg-[#009c3b]/15 text-[#009c3b]"
                                      : "bg-slate-900 text-slate-500",
                                  )}
                                >
                                  <GraduationCap className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                                    Módulo 1: Introdução Básica e Regras
                                  </h4>
                                </div>
                              </div>
                              <span
                                className={clsx(
                                  "text-[9px] font-black border px-3 py-1 rounded-lg uppercase tracking-wider",
                                  isM1Done
                                    ? "bg-[#009c3b]/10 border-[#009c3b]/20 text-[#009c3b]"
                                    : "bg-slate-900 border-slate-800 text-slate-500",
                                )}
                              >
                                {isM1Done ? "CONCLUÍDO" : "PENDENTE"}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Module 2 */}
                        {(() => {
                          const isM2Done =
                            !!selectedCourse.completedModulesByStudent?.[
                              user?.uid
                            ]?.m2;
                          return (
                            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex items-center justify-between gap-4 transition duration-200">
                              <div className="flex items-center gap-3">
                                <div
                                  className={clsx(
                                    "p-2 rounded-xl",
                                    isM2Done
                                      ? "bg-[#009c3b]/15 text-[#009c3b]"
                                      : "bg-slate-900 text-slate-500",
                                  )}
                                >
                                  <GraduationCap className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                                    Módulo 2: Técnicas Avançadas e Julgamento
                                  </h4>
                                </div>
                              </div>
                              <span
                                className={clsx(
                                  "text-[9px] font-black border px-3 py-1 rounded-lg uppercase tracking-wider",
                                  isM2Done
                                    ? "bg-[#009c3b]/10 border-[#009c3b]/20 text-[#009c3b]"
                                    : "bg-slate-900 border-slate-800 text-slate-500",
                                )}
                              >
                                {isM2Done ? "CONCLUÍDO" : "PENDENTE"}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Module 3 (Prova Presencial) */}
                        {(() => {
                          const isM3Done =
                            !!selectedCourse.completedModulesByStudent?.[
                              user?.uid
                            ]?.m3;
                          return (
                            <div className="bg-[#1f2937]/10 border border-amber-500/10 p-4 rounded-2xl flex items-center justify-between gap-4 transition duration-200">
                              <div className="flex items-center gap-3">
                                <div
                                  className={clsx(
                                    "p-2 rounded-xl",
                                    isM3Done
                                      ? "bg-amber-500/15 text-amber-500"
                                      : "bg-slate-900 text-slate-500 border border-amber-500/10",
                                  )}
                                >
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                                    Módulo 3: Prova Presencial
                                  </h4>
                                  <span className="text-[8px] font-bold text-amber-500 tracking-widest bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 block mt-1 w-max">
                                    AVALIAÇÃO PRÁTICA PRESENCIAL
                                  </span>
                                </div>
                              </div>
                              <span
                                className={clsx(
                                  "text-[9px] font-black border px-3 py-1 rounded-lg uppercase tracking-wider shrink-0",
                                  isM3Done
                                    ? "bg-[#009c3b]/10 border-[#009c3b]/20 text-[#009c3b]"
                                    : "bg-slate-900 border-slate-800 text-slate-500",
                                )}
                              >
                                {isM3Done ? "CONCLUÍDO" : "PENDENTE"}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Scheduled classes list inside course */}
                        {selectedCourse.lessons &&
                          selectedCourse.lessons.length > 0 && (
                            <div className="border-t border-slate-850/60 pt-4 space-y-3 text-left">
                              <h4 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                                <Calendar className="w-4 h-4 text-[#009c3b]" />
                                Cronograma de Aulas e Atividades
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                                {selectedCourse.lessons.map((less: any) => (
                                  <div
                                    key={less.id}
                                    className="bg-black/40 border border-slate-900 p-3.5 rounded-2xl flex flex-col justify-between"
                                  >
                                    <span className="text-[10px] text-slate-100 font-bold leading-tight mb-2">
                                      {less.title}
                                    </span>
                                    <div className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 pt-1.5 border-t border-slate-900/40">
                                      <Clock className="w-3 h-3 text-[#009c3b]" />
                                      <span>
                                        {less.date
                                          .split("-")
                                          .reverse()
                                          .join("/")}{" "}
                                        às {less.time}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition duration-200">
                          <div className="flex items-center gap-3 text-left">
                            <div className="bg-[#009c3b]/15 p-2 rounded-xl text-[#009c3b] shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                                Material Teórico de Apoio Geral
                              </h4>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                Manual de Diretrizes Oficiais GYMSTARS BRASIL
                                PDF
                              </p>
                            </div>
                          </div>
                          {selectedCourse.guidelinesPdf ? (
                            <button
                              onClick={() =>
                                handleDownloadPdf(
                                  selectedCourse.guidelinesPdf,
                                  selectedCourse.guidelinesPdfName ||
                                    "Manual_Diretrizes_GYMSTARS_BRASIL.pdf",
                                )
                              }
                              className="w-full sm:w-auto text-[10px] text-[#009c3b] font-black bg-[#009c3b]/10 border border-[#009c3b]/20 px-3.5 py-1.5 rounded-xl hover:bg-[#009c3b] hover:text-white transition-all uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" /> Baixar PDF
                            </button>
                          ) : (
                            <span className="w-full sm:w-auto text-center text-[9px] text-slate-500 font-black bg-slate-900 border border-slate-850 px-3.5 py-1.5 rounded-xl uppercase tracking-wider shrink-0">
                              Disponível em breve
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Completion and Custom PDF/PNG Certificate download box */}
                    <div className="bg-black/35 border border-slate-850 p-6 rounded-3xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                      {/* Case 1: Student is NOT approved yet by Admin */}
                      {!selectedCourse.completedUsers?.includes(user?.uid) ? (
                        <div className="text-center space-y-5 py-6 px-4 md:px-8 w-full flex flex-col items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 select-none">
                            <Clock className="w-7 h-7 animate-pulse" />
                          </div>

                          <div className="space-y-3 w-full">
                            <h3 className="text-base font-black text-white uppercase italic tracking-tight text-center">
                              Status: Aguardando Homologação
                            </h3>
                          </div>

                          <div className="inline-flex bg-slate-900 border border-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-sm">
                            Em Análise Curricular
                          </div>
                        </div>
                      ) : (
                        // Case 2: Student is APPROVED by Admin
                        <div className="space-y-5">
                          <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#009c3b]/10 border border-[#009c3b]/20 p-5 rounded-2xl">
                            <CheckCircle2 className="w-10 h-10 text-[#009c3b] flex-shrink-0" />
                            <div className="text-center sm:text-left">
                              <h4 className="text-sm font-black text-white uppercase tracking-tight">
                                CURSO CONCLUÍDO COM SUCESSO!
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Parabéns! Sua carga horária de{" "}
                                {selectedCourse.cargaHoraria || 20} horas foi
                                registrada com êxito.
                              </p>
                            </div>
                          </div>

                          {/* Certificate download action box */}
                          <div className="border border-slate-800 p-5 rounded-2xl bg-slate-950/60 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-1 text-center md:text-left">
                              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block font-mono">
                                Status do Certificado
                              </span>
                              <h4 className="text-sm font-black text-white uppercase tracking-tight">
                                {selectedCourse.certificates?.[user?.uid]
                                  ? "🟢 CERTIFICADO DISPONÍVEL!"
                                  : "⏳ EM EMISSÃO PELA ADMINISTRAÇÃO"}
                              </h4>
                              <p className="text-[11px] text-slate-400 max-w-sm mt-0.5">
                                {selectedCourse.certificates?.[user?.uid]
                                  ? "Seu certificado digital oficial customizado em PNG foi emitido pela equipe administrativa e já está liberado para download abaixo."
                                  : "Seu certificado está sendo providenciado com os dados da sua matrícula. Fique de olho, ele estará aqui para download muito em breve!"}
                              </p>
                            </div>

                            {selectedCourse.certificates?.[user?.uid] ? (
                              <button
                                onClick={() =>
                                  handleDownloadCertificate(
                                    selectedCourse.certificates[user.uid],
                                    selectedCourse.title,
                                  )
                                }
                                className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-95"
                              >
                                <Download className="w-4 h-4" />
                                Baixar Certificado (PNG)
                              </button>
                            ) : (
                              <div className="bg-slate-900 border border-slate-800 text-slate-500 px-4 py-2.5 rounded-xl text-[10px] font-bold text-center uppercase tracking-widest">
                                Homologando Assinatura Admin
                              </div>
                            )}
                          </div>

                          {/* Certificate Preview if loaded */}
                          {selectedCourse.certificates?.[user?.uid] && (
                            <div className="mt-4 border border-slate-800 rounded-2xl overflow-hidden aspect-[4/3] bg-black max-w-md mx-auto relative group">
                              <img
                                src={
                                  selectedCourse.certificates[user.uid] ||
                                  undefined
                                }
                                alt="Visualização do Certificado Oficial"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Classroom footer spacing */}
              <div className="border-t border-slate-900 pt-6 mt-12 text-center text-[10px] text-slate-600 uppercase font-black tracking-widest">
                Ambiente de Aprendizado GymStars Brasil • Todos os direitos
                reservados
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
