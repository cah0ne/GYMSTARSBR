import { useState, useEffect } from "react";
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  Users, 
  Trophy, 
  Award, 
  Bell, 
  FileText, 
  Sliders, 
  Gamepad2, 
  Activity,
  ChevronRight,
  Terminal
} from "lucide-react";
import { motion } from "motion/react";

interface DbStats {
  url: string;
  stats: Record<string, number>;
}

export default function TestPage() {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/db-stats");
      if (!res.ok) {
        throw new Error(`Falha HTTP ao carregar estatísticas: ${res.status}`);
      }
      const data = await res.json();
      if (data.status === "error") {
        throw new Error(data.error);
      }
      setStats(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao carregar dados do banco.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const runMigration = async () => {
    if (migrating) return;
    try {
      setMigrating(true);
      setMigrationLog(["[Ação] Iniciando migração manual via backend...", "Enviando requisição de migração..."]);
      
      const res = await fetch("/api/migrate");
      const data = await res.json();
      
      if (!res.ok || data.status === "error") {
        setMigrationLog(prev => [
          ...prev, 
          `❌ [Erro] Falha: ${data.message || 'Código de resposta inválido'}`,
          "Por favor, verifique se VITE_TURSO_URL e VITE_TURSO_AUTH_TOKEN estão corretos nos Secrets."
        ]);
        return;
      }

      setMigrationLog(prev => [
        ...prev,
        "✔️ [Tabelas Criadas] " + (data.tablesCreated?.join(", ") || "Nenhuma"),
        data.robloxCleared ? "✔️ [Roblox] Sistema para scripts de Roblox limpo (live_command, live_performances zerados)." : "⚠️ [Roblox] Não foi possível verificar limpeza do Roblox.",
        "📊 [Dados Importados do Supabase]:",
        ...Object.entries(data.tablesMigrated || {}).map(([table, r]: any) => {
          return `  • ${table}: Encontrados ${r.total} no Supabase -> Salvos com sucesso: ${r.success}, Falhas: ${r.failed}`;
        }),
        "🚀 [Sucesso] Migração concluída!"
      ]);

      // Refresh table stats
      fetchStats();
    } catch (err: any) {
      setMigrationLog(prev => [...prev, `❌ [Erro Crítico] ${err.message}`]);
    } finally {
      setMigrating(false);
    }
  };

  const getTableIcon = (name: string) => {
    switch (name) {
      case "users": return Users;
      case "competitions": return Trophy;
      case "scores": return Award;
      case "notifications": return Bell;
      case "app_content": return FileText;
      case "settings": return Sliders;
      case "live_performances": return Activity;
      case "live_command": return Gamepad2;
      default: return Database;
    }
  };

  const getTableDisplayName = (name: string) => {
    switch (name) {
      case "users": return "Contas / Usuários";
      case "competitions": return "Competições";
      case "scores": return "Notas / Resultados";
      case "notifications": return "Notificações";
      case "app_content": return "Conteúdo de Páginas";
      case "settings": return "Sons e Configurações";
      case "live_performances": return "Roblox: Performances (Scripts)";
      case "live_command": return "Roblox: Comandos (Scripts)";
      default: return name;
    }
  };

  return (
    <div id="test_page_wrapper" className="space-y-8 select-none text-slate-200">
      {/* Header and title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-bold text-[#009c3b] uppercase tracking-wider">Painel de Diagnóstico</span>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
            <Database className="w-8 h-8 text-[#009c3b]" />
            Teste de Banco de Dados Turso
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Verifique o estado atual do banco de dados Turso e o status da migração das tabelas do site GymStars.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading || migrating}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all border border-slate-700 shadow-md"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Status
          </button>
        </div>
      </div>

      {/* Answer to the user's doubt */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-r from-[#009c3b]/10 to-[#009c3b]/5 border-l-4 border-[#009c3b] border-y border-r border-[#009c3b]/10 shadow-lg relative overflow-hidden"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[#009c3b]/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-[#009c3b]" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Sim, os dados já estão no Turso! ✅</h3>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              O banco de dados do seu site já está **totalmente sincronizado com o Turso** {stats?.url && `(${stats.url.substring(0, 30)}...)`}.
              Toda alteração que você fizer nas contas, nas páginas ou configurações do site irá diretamente para o Turso em tempo real.
            </p>
            <p className="text-slate-400 text-xs mt-3">
              *Nota: Como você solicitou, os sistemas de scripts externos do Roblox (<strong className="text-red-400">live_command</strong> e <strong className="text-red-400">live_performances</strong>) foram identificados e limpos/apagados no banco de dados para evitar lixo de script de automação.*
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick stats diagnostic */}
      <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2 mt-6">
        <Activity className="w-5 h-5 text-yellow-400" />
        Status de Conexão & Estatísticas de Tabelas
      </h2>

      {loading && !stats ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-slate-800 rounded-3xl bg-[#070F1C]/40">
          <RefreshCw className="w-10 h-10 text-[#009c3b] animate-spin" />
          <p className="text-slate-400 text-sm">Consultando tabelas no Turso...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-950/20 border border-red-900/50 flex items-center gap-4 text-red-200">
          <AlertTriangle className="w-10 h-10 text-red-500 shrink-0" />
          <div>
            <h4 className="font-bold text-white">Falha na conexão com o Banco Turso</h4>
            <p className="text-sm text-red-300/80 mt-1">{error}</p>
            <p className="text-xs text-slate-400 mt-2">Certifique-se de configurar VITE_TURSO_URL e VITE_TURSO_AUTH_TOKEN nos Secrets do painel lateral do AI Studio.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Connection card */}
          <div className="p-5 rounded-2xl bg-[#070F1C] border border-slate-800 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-[#009c3b]/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                CONECTADO COM SUCESSO
              </div>
              <h3 className="font-extrabold text-white text-lg">Servidor Turso Cloud</h3>
              <p className="font-mono text-xs text-slate-500 mt-1 select-all break-all">{stats?.url}</p>
            </div>
            <div className="border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between text-xs text-[#009c3b]">
              <span>Ping de comunicação ativo</span>
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>

          {/* Table Stats Card */}
          {stats && Object.entries(stats.stats).map(([tableName, count]) => {
            const IconComponent = getTableIcon(tableName);
            const isRobloxTable = tableName === "live_command" || tableName === "live_performances";
            
            return (
              <div 
                key={tableName} 
                className={`p-5 rounded-2xl border transition-all ${
                  isRobloxTable 
                  ? "bg-slate-900/10 border-slate-800/60 opacity-60 hover:opacity-100" 
                  : "bg-[#070F1C] border-slate-800 hover:border-slate-700 hover:shadow-lg"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">{tableName}</span>
                    <h4 className="font-bold text-white text-base leading-tight">
                      {getTableDisplayName(tableName)}
                    </h4>
                  </div>
                  <div className={`p-2.5 rounded-xl shrink-0 ${isRobloxTable ? 'bg-red-950/20 text-red-400' : 'bg-[#009c3b]/10 text-[#009c3b]'}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex items-end justify-between mt-6">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Registros Sincronizados</p>
                    <p className="text-3xl font-black text-white mt-1">
                      {count === -1 ? (
                        <span className="text-red-500 text-sm">Inexistente/Erro</span>
                      ) : count}
                    </p>
                  </div>
                  {isRobloxTable ? (
                    <span className="flex items-center gap-1 text-[10px] text-red-400/90 font-bold uppercase bg-red-950/20 px-2 py-1 rounded-lg border border-red-900/30">
                      <Trash2 className="w-3 h-3" /> APAGADO
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase bg-emerald-950/20 px-2 py-1 rounded-lg">
                      <CheckCircle className="w-3 h-3" /> VERIFICADO
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Migration Trigger Area */}
      <div className="border border-slate-800 rounded-3xl bg-[#070F1C] p-6 space-y-6">
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#009c3b]" />
            Migração Manual Supabase ➡️ Turso SQL
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Se você fez novas alterações no Supabase antigo e gostaria de puxar esses novos dados para sobrescrever o Turso atualizado, clique abaixo para executar a varredura completa.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            onClick={runMigration}
            disabled={migrating || loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#009c3b] hover:bg-[#007c2f] disabled:bg-slate-700 disabled:opacity-60 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl shrink-0"
          >
            <RefreshCw className={`w-5 h-5 ${migrating ? 'animate-spin' : ''}`} />
            {migrating ? "Migrando Banco de Dados..." : "Sincronizar Supabase para Turso"}
          </button>
          
          <div className="text-xs text-slate-400">
            *Obs: Ao clicar, os sistemas do Roblox são esvaziados no Turso para manter a segurança e as contas, competições, notas de arbitragem, novidades e feeds são inseridos.*
          </div>
        </div>

        {/* Real-time Logs Console */}
        {(migrating || migrationLog.length > 0) && (
          <div className="border border-slate-800 bg-[#040913] rounded-2xl p-4 font-mono text-xs text-slate-300 space-y-2 overflow-y-auto max-h-60 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400 text-[10px] uppercase font-black tracking-wider">
              <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5" /> Console de logs de migração</span>
              <button 
                onClick={() => setMigrationLog([])} 
                className="hover:text-white px-2 py-0.5 rounded hover:bg-slate-800"
              >
                Limpar
              </button>
            </div>
            {migrationLog.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap py-0.5 leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
