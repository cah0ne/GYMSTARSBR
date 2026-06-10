import { useState, useEffect } from "react";
import { 
  GraduationCap, 
  Search, 
  BookOpen, 
  Award, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  SlidersHorizontal,
  ChevronRight,
  BookOpenCheck,
  Star,
  Users,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Course {
  id: string;
  title: string;
  category: "arbitragem" | "treinadores" | "ginastas" | "seguranca";
  categoryLabel: string;
  description: string;
  hours: number;
  instructor: string;
  rating: number;
  level: "Iniciante" | "Intermediário" | "Avançado";
  lessons: string[];
}

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [enrolledCourses, setEnrolledCourses] = useState<Record<string, { progress: number; currentLesson: number }>>({});
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState<number>(0);

  // Initial list of gymnastics courses
  const courses: Course[] = [
    {
      id: "cur-01",
      title: "Curso Oficial de Arbitragem - Código de Pontos WAG",
      category: "arbitragem",
      categoryLabel: "Arbitragem",
      description: "Domine todas as exigências e deduções para aparelhos femininos de acordo com o regulamento oficial brasileiro e internacional (FIG).",
      hours: 24,
      instructor: "Profa. Márcia Regina (Árbitra Internacional WAG)",
      rating: 4.9,
      level: "Avançado",
      lessons: [
        "Introdução à Tabela de Elementos",
        "Deduções Gerais de Execução e Postura",
        "Exigências de Composição do Solo",
        "Julgamento de Trave: Equilíbrio e Flutuação",
        "Instruções para Salto e Paralelas Assimétricas",
        "Simulação com Vídeos Oficiais de Competição",
        "Prova Teórica de Certificação"
      ]
    },
    {
      id: "cur-02",
      title: "Fundamentos Técnicos e Progressão de Saltos em GAF",
      category: "treinadores",
      categoryLabel: "Treinadores",
      description: "Aprenda a biomecânica correta, exercícios de força específica e a ajuda manual necessária para ensinar saltos com segurança.",
      hours: 18,
      instructor: "Coach Diego Azevedo (Treinador de Alto Rendimento)",
      rating: 4.8,
      level: "Intermediário",
      lessons: [
        "Fases do Salto: Corrida de Aproximação e Batida",
        "Bloqueio de Ombros e Repulsão na Mesa",
        "Técnicas de Salto Reverso e Piruetas",
        "Segurança na Ajuda Manual (Spoting)",
        "Progressões com Colchões e Trampolins",
        "Análise de Erros Comuns e Ajuste Físico"
      ]
    },
    {
      id: "cur-03",
      title: "Planejamento de Carreira e Rotina Mental para Ginastas",
      category: "ginastas",
      categoryLabel: "Ginastas",
      description: "Especialmente desenvolvido para ginastas competidores. Controle ansiedade competitiva, estipule metas de rotinas e aumente o foco.",
      hours: 12,
      instructor: "Dra. Carolina Mendes (Psicóloga Esportiva COB)",
      rating: 4.7,
      level: "Iniciante",
      lessons: [
        "A Mente de Campeão: Foco sob Pressão",
        "O Poder da Visualização de Séries (Treino Mental)",
        "Como Superar Medos de Elementos Novos (Gips, Piruetas)",
        "Criação de Gatilhos de Concentração para Competições",
        "Nutrição Básica e Cronograma de Recuperação",
        "Análise e Anotações pós-competição"
      ]
    },
    {
      id: "cur-04",
      title: "Segurança de Aparelhos, Fixações e Prevenção de Lesões",
      category: "seguranca",
      categoryLabel: "Segurança & Saúde",
      description: "Normas de segurança de montagem de aparelhos da ginástica, manutenção de cabos de paralelas, argolas e prevenção primária de lesões.",
      hours: 10,
      instructor: "Dr. Roberto Silva (Ortopedista e Fisioterapeuta de Ginástica)",
      rating: 4.9,
      level: "Iniciante",
      lessons: [
        "Inspeção Diária de Tensões e Cabos",
        "Checklist de Fricção e Acomodação de Colchões",
        "Bandagens Funcionais (Taping) Preventivas",
        "Biomecânica de Aterrissagens Seguras",
        "Primeiros Socorros em Entorses e Quedas",
        "Protocolo de Retorno Progressivo aos Treinos"
      ]
    },
    {
      id: "cur-05",
      title: "Composição de Coreografias Artísticas de Solo e Trave",
      category: "treinadores",
      categoryLabel: "Treinadores",
      description: "Dicas de sincronismo musical, expressão corporal e uso inteligente do espaço para obter notas máximas de apresentação artística.",
      hours: 16,
      instructor: "Camila Prado (Coreógrafa da Seleção Nacional)",
      rating: 4.9,
      level: "Intermediário",
      lessons: [
        "Histórico e Critérios de Dedução Artística",
        "Mapeamento Musical e Transições Fluídas",
        "Expressão Facial e Linguagem Corporal do Esporte",
        "Utilização de Elementos Acrobáticos e de Dança Combinados",
        "Estrutura Teatral no Solo WAG",
        "Avaliação de Sincronismo e Ritmo da Música"
      ]
    },
    {
      id: "cur-06",
      title: "Regulamento Nacional de Categorias de Base",
      category: "arbitragem",
      categoryLabel: "Arbitragem",
      description: "Curso detalhado sobre as regras dos níveis Iniciante, Pré-infantil e Infantil. Ideal para árbitros estaduais e professores de escolinhas.",
      hours: 15,
      instructor: "Prof. Alberto Neto (Árbitro Nacional CBG)",
      rating: 4.6,
      level: "Iniciante",
      lessons: [
        "Apresentação do Regulamento de Categorias Iniciais",
        "Tabela Simplificada de Deduções",
        "Regras Específicas de Bônus de Dificuldade de Base",
        "Erros Comuns de Montagem de Séries Obrigatórias",
        "Simulações de Atletas de 7 a 10 anos",
        "Avaliação Teórica em Grupo"
      ]
    }
  ];

  // Load enrolled courses status from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("gymstars_cursos_inscritos");
    if (saved) {
      try {
        setEnrolledCourses(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save changes to localStorage
  const saveEnrolled = (updated: Record<string, { progress: number; currentLesson: number }>) => {
    setEnrolledCourses(updated);
    localStorage.setItem("gymstars_cursos_inscritos", JSON.stringify(updated));
  };

  const enrollInCourse = (courseId: string) => {
    const updated = {
      ...enrolledCourses,
      [courseId]: { progress: 0, currentLesson: 0 }
    };
    saveEnrolled(updated);
  };

  const advanceLesson = (courseId: string, courseLessonsCount: number) => {
    const current = enrolledCourses[courseId];
    if (!current) return;

    const nextLessonIndex = current.currentLesson + 1;
    let newProgress = Math.round((nextLessonIndex / courseLessonsCount) * 100);
    if (newProgress > 100) newProgress = 100;

    const updated = {
      ...enrolledCourses,
      [courseId]: {
        progress: newProgress,
        currentLesson: nextLessonIndex >= courseLessonsCount ? current.currentLesson : nextLessonIndex
      }
    };
    saveEnrolled(updated);
    if (nextLessonIndex < courseLessonsCount) {
      setActiveLessonIndex(nextLessonIndex);
    }
  };

  const getStats = () => {
    const list = Object.keys(enrolledCourses);
    const countEnrolled = list.length;
    let totalStudiedHours = 0;
    let countCompleted = 0;

    list.forEach(id => {
      const course = courses.find(c => c.id === id);
      if (course) {
        const item = enrolledCourses[id];
        totalStudiedHours += Math.round((item.progress / 100) * course.hours);
        if (item.progress === 100) {
          countCompleted += 1;
        }
      }
    });

    return {
      enrolled: countEnrolled,
      hours: totalStudiedHours,
      completed: countCompleted
    };
  };

  const stats = getStats();

  const handleOpenClassroom = (course: Course) => {
    setSelectedCourse(course);
    const currentInfo = enrolledCourses[course.id];
    setActiveLessonIndex(currentInfo ? currentInfo.currentLesson : 0);
  };

  const categories = [
    { id: "all", label: "Todos os Cursos" },
    { id: "arbitragem", label: "Arbitragem" },
    { id: "treinadores", label: "Treinadores" },
    { id: "ginastas", label: "Ginastas" },
    { id: "seguranca", label: "Segurança & Saúde" }
  ];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="courses_page_container" className="space-y-8 select-none text-slate-200">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-bold text-[#009c3b] uppercase tracking-wider">Capacitação e Desenvolvimento</span>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
            <GraduationCap className="w-8 h-8 text-[#009c3b]" />
            Cursos & Certificações GymStars
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Estude regulamentos de arbitragem brasileira, aprimore metodologias de treino e coreografia para competições.
          </p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-[#070F1C] border border-slate-800 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3.5 rounded-xl bg-[#009c3b]/10 text-[#009c3b]">
            <BookOpenCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Cursos em Andamento</p>
            <p className="text-2xl font-black text-white mt-0.5">{stats.enrolled}</p>
          </div>
          <div className="absolute right-[-10px] bottom-[-10px] w-16 h-16 bg-[#009c3b]/5 rounded-tl-full" />
        </div>

        <div className="p-5 rounded-2xl bg-[#070F1C] border border-slate-800 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Horas Consumidas</p>
            <p className="text-2xl font-black text-white mt-0.5">{stats.hours} hrs</p>
          </div>
          <div className="absolute right-[-10px] bottom-[-10px] w-16 h-16 bg-cyan-500/5 rounded-tl-full" />
        </div>

        <div className="p-5 rounded-2xl bg-[#070F1C] border border-slate-800 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Certificados Concluídos</p>
            <p className="text-2xl font-black text-white mt-0.5">{stats.completed}</p>
          </div>
          <div className="absolute right-[-10px] bottom-[-10px] w-16 h-16 bg-amber-500/5 rounded-tl-full" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch justify-between bg-[#070F1C] p-4 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por título, instrutor ou palavra-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-[#009c3b] focus:border-transparent transition-all"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <SlidersHorizontal className="w-4 h-4 text-slate-500 hidden sm:block mr-1" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                selectedCategory === cat.id 
                ? "bg-[#009c3b] text-white shadow-lg shadow-[#009c3b]/10" 
                : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid list */}
      {filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 border border-slate-800/60 rounded-3xl bg-[#070F1C]/30 text-center px-6">
          <GraduationCap className="w-14 h-14 text-slate-600 stroke-1" />
          <div>
            <h3 className="text-white font-bold text-lg">Nenhum curso encontrado</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              Tente redefinir o filtro de categoria ou buscar por termos diferentes ou parciais.
            </p>
          </div>
          <button 
            onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }} 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition-all"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCourses.map((course) => {
            const enrollInfo = enrolledCourses[course.id];
            const isEnrolled = !!enrollInfo;
            const isCompleted = enrollInfo?.progress === 100;

            return (
              <motion.div
                key={course.id}
                layout
                className="rounded-2xl border border-slate-800 bg-[#070F1C] hover:border-slate-700 hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  {/* Category and difficulty level */}
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      course.category === "arbitragem" ? "bg-[#009c3b]/10 text-[#009c3b]" :
                      course.category === "treinadores" ? "bg-cyan-500/10 text-cyan-400" :
                      course.category === "ginastas" ? "bg-pink-500/10 text-pink-400" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {course.categoryLabel}
                    </span>
                    <span className={`text-[10px] font-bold ${
                      course.level === "Iniciante" ? "text-slate-400" :
                      course.level === "Intermediário" ? "text-yellow-400" :
                      "text-red-400"
                    }`}>
                      • {course.level}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-white text-lg tracking-tight leading-snug hover:text-[#009c3b] transition-colors cursor-pointer" onClick={() => (isEnrolled ? handleOpenClassroom(course) : enrollInCourse(course.id))}>
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium italic">Ministrado por {course.instructor}</p>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">
                    {course.description}
                  </p>

                  {/* Course stats inside course container */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 font-semibold border-t border-slate-800/50 pt-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {course.hours} horas aula
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      {course.lessons.length} tópicos
                    </span>
                    <span className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {course.rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Enrollment status button bar */}
                <div className="border-t border-slate-800 px-6 py-4 bg-slate-900/40 flex items-center justify-between">
                  {isEnrolled ? (
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          {isCompleted ? (
                            <span className="text-emerald-500 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 fill-emerald-500/10" /> Concluído
                            </span>
                          ) : (
                            <span className="text-[#009c3b] animate-pulse">Em andamento</span>
                          )}
                        </span>
                        <span className="text-white font-black">{enrollInfo.progress}%</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Progress slider bar */}
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-[#009c3b]'}`} 
                            style={{ width: `${enrollInfo.progress}%` }}
                          />
                        </div>

                        <button
                          onClick={() => handleOpenClassroom(course)}
                          className="px-4 py-1.5 bg-[#009c3b]/10 hover:bg-[#009c3b]/25 border border-[#009c3b]/40 hover:border-[#009c3b] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                        >
                          <PlayCircle className="w-3.5 h-3.5 text-[#009c3b]" />
                          {isCompleted ? "Rever Aulas" : "Acessar Sala"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-slate-400">Inscreva-se gratuitamente</div>
                      <button
                        onClick={() => enrollInCourse(course.id)}
                        className="px-4 py-2 bg-[#009c3b] hover:bg-[#007f30] text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-[#009c3b]/5 hover:shadow-lg flex items-center gap-1"
                      >
                        Iniciar Curso
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Classroom Video Overlay modal */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#02050b]/90 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#070F1C] border border-slate-800 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative"
            >
              {/* Left Column: Interactive Course Player Video Simulation */}
              <div className="flex-1 bg-black flex flex-col justify-between relative overflow-hidden h-[35vh] md:h-full">
                {/* Simulated Header inside Player */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#009c3b] uppercase tracking-wider">Sala de Aula Virtual</span>
                    <h4 className="text-white font-bold text-sm truncate max-w-md mt-0.5">{selectedCourse.title}</h4>
                  </div>
                </div>

                {/* Player screen */}
                <div className="flex-1 flex flex-col items-center justify-center relative p-8">
                  {/* Backdrop glowing art */}
                  <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,_var(--tw-gradient-stops)) from-[#009c3b]/10 via-transparent to-transparent opacity-80 pointer-events-none" />
                  
                  <div className="relative text-center max-w-sm space-y-4 z-10">
                    <div className="w-16 h-16 rounded-full bg-[#009c3b]/20 border border-[#009c3b]/40 flex items-center justify-center mx-auto text-[#009c3b] animate-pulse">
                      <PlayCircle className="w-10 h-10" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Módulo {activeLessonIndex + 1}</span>
                      <h3 className="text-white font-extrabold text-base mt-2 leading-relaxed">
                        {selectedCourse.lessons[activeLessonIndex]}
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 italic">Treinamento Oficial para Árbitros e Ginastas</p>
                    </div>
                  </div>
                  
                  {/* Floating simulated play status overlay */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 border border-slate-900/50 rounded-xl px-4 py-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      <span>Transmissão offline simulada</span>
                    </div>
                    <span>Duração: 45 min de carga horária</span>
                  </div>
                </div>

                {/* Sub-footer player controllers */}
                <div className="p-4 bg-slate-950 border-t border-slate-900 flex items-center justify-between gap-4">
                  <div className="text-xs text-slate-400 truncate hidden sm:block">
                    Instrutor: <strong className="text-[#009c3b]">{selectedCourse.instructor}</strong>
                  </div>
                  
                  <button
                    onClick={() => advanceLesson(selectedCourse.id, selectedCourse.lessons.length)}
                    disabled={!enrolledCourses[selectedCourse.id]}
                    className="ml-auto flex items-center gap-1 px-5 py-2 bg-[#009c3b] hover:bg-[#008232] disabled:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all"
                  >
                    Marcar Aula Concluída
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right Column: Lessons Index or Class material */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col justify-between h-[50vh] md:h-full bg-slate-900/25">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-white text-sm">Cronograma</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Clique para trocar de aula</p>
                  </div>
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs font-extrabold"
                  >
                    Sair
                  </button>
                </div>

                {/* List items of lessons */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 hidden-scrollbar">
                  {selectedCourse.lessons.map((lesson, idx) => {
                    const isEnrolled = !!enrolledCourses[selectedCourse.id];
                    const isCompleted = isEnrolled && enrolledCourses[selectedCourse.id].currentLesson > idx;
                    const isCurrent = activeLessonIndex === idx;

                    return (
                      <button
                        key={idx}
                        disabled={!isEnrolled}
                        onClick={() => setActiveLessonIndex(idx)}
                        className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 transition-all ${
                          isCurrent 
                          ? "bg-[#009c3b]/15 border-[#009c3b] text-white" 
                          : isCompleted 
                          ? "bg-[#009c3b]/5 border-slate-800/80 text-slate-300"
                          : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:border-slate-700"
                        } disabled:opacity-45`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-[#009c3b]" />
                          ) : (
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${isCurrent ? 'bg-[#009c3b] text-white' : 'border border-slate-600'}`}>
                              {idx + 1}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold leading-tight line-clamp-2">{lesson}</p>
                          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block">
                            {idx === selectedCourse.lessons.length - 1 ? 'Avaliação Final' : `Módulo 0${idx + 1}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Registration requirement info footer */}
                {!enrolledCourses[selectedCourse.id] && (
                  <div className="p-4 bg-[#009c3b]/10 border-t border-[#009c3b]/20 m-4 rounded-2xl text-center space-y-2">
                    <p className="text-[11px] text-[#009c3b] font-extrabold leading-normal">Inscreva-se para obter certificação e registrar seu progresso!</p>
                    <button
                      onClick={() => enrollInCourse(selectedCourse.id)}
                      className="w-full py-2 bg-[#009c3b] hover:bg-[#007f30] text-white rounded-xl text-xs font-black transition-all shadow-md"
                    >
                      Inscreva-se Grátis
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Information text helping manually uploading to Github */}
      <div className="border border-slate-800 rounded-3xl bg-[#070F1C] p-6 space-y-4">
        <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#009c3b]" />
          Como enviar o ZIP do site para seu repositório do GitHub?
        </h3>
        
        <p className="text-slate-300 text-sm leading-relaxed">
          Se você baixou o ZIP com o código do site do GymStars Brasil e quer guardá-lo ou colocá-lo no seu próprio repositório GitHub de forma rápida e segura, siga o passo a passo a seguir:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 space-y-1">
            <span className="font-extrabold text-[#009c3b]">Passo 1: Criar Repositório</span>
            <p className="text-slate-400">
              Acesse <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">github.com/new</a>, faça o login, dê um nome (como <strong className="text-white">gymstars-brasil</strong>), selecione como Público/Privado e clique em "Create repository" sem adicionar README ou .gitignore.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 space-y-1">
            <span className="font-extrabold text-[#009c3b]">Passo 2: Extrair os Arquivos</span>
            <p className="text-slate-400">
              Extraia o arquivo ZIP completo que você baixou do painel do AI Studio em uma pasta do seu computador (por exemplo, na Área de Trabalho com o nome da pasta).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 space-y-1">
            <span className="font-extrabold text-[#009c3b]">Passo 3: Enviar por Linha de Comando</span>
            <p className="text-slate-400 leading-normal">
              Abra o terminal/Prompt do computador na pasta descompactada e use estes comandos:
              <span className="block font-mono bg-black/60 p-2 rounded border border-slate-800 text-yellow-400 text-[10px] mt-1 space-y-0.5 select-all">
                git init <br/>
                git add . <br/>
                git commit -m "upload gymstars oficial" <br/>
                git branch -M main <br/>
                git remote add origin https://github.com/seu-usuario/seu-repositorio.git <br/>
                git push -u origin main
              </span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 space-y-1">
            <span className="font-extrabold text-[#009c3b]">Bônus: Publicar na Web de Graça</span>
            <p className="text-slate-400">
              Caso deseje colocar o site no ar de forma gratuita após ligar com o GitHub, acesse a <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Vercel</a> ou o <a href="https://netlify.com" target="_blank" rel="noreferrer" className="text-[#009c3b] hover:underline">Netlify</a>, importe esse repositório do github diretamente e clique em Deploy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
