import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GymStarsLogo from "../components/GymStarsLogo";
import {
  auth,
  db,
  doc,
  setDoc,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onSnapshot,
} from "../lib/firebase";
import { Trophy, Lock, User, Sparkles, Check, Info } from "lucide-react";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [authTitle, setAuthTitle] = useState(
    "Portal de Resultados & Arbitragem",
  );
  const [authHelpText, setAuthHelpText] = useState(
    "Dúvidas ou problemas? Contate a comissão GYMSTARS BRASIL.",
  );

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appContent", "branding"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.authTitle) setAuthTitle(data.authTitle);
        if (data.authHelpText) setAuthHelpText(data.authHelpText);
      }
    });
    return () => unsub();
  }, []);

  // Login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [username, setUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const loginStr = loginUsername.trim();
      const isEmail = loginStr.includes("@");
      const virtualEmail = isEmail ? loginStr : `${loginStr}@gymstars.internal`;
      await signInWithEmailAndPassword(auth, virtualEmail, loginPassword);
      setSuccess("Acesso autorizado! Carregando painel...");
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de login desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !registerPassword || !confirmPassword) {
      setError("Por favor, preencha todos os campos do formulário.");
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9]+$/.test(trimmedUsername)) {
      setError(
        "O nome de usuário deve conter apenas letras minúsculas e números, sem espaços ou símbolos. Exemplo: simonebiles ou patinho223.",
      );
      return;
    }

    if (registerPassword.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (registerPassword !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      // Create remote user in the Firebase auth system using a virtual email
      const virtualEmail = `${trimmedUsername}@gymstars.internal`;
      const result = await createUserWithEmailAndPassword(
        auth,
        virtualEmail,
        registerPassword,
      );

      const userId = result.user?.uid;

      if (userId) {
        // Automatically grant Admin for admin identifiers, otherwise Visitante
        const tag =
          trimmedUsername.toLowerCase() === "gymstarsbr"
            ? "Admin"
            : "Visitante";

        // Save metadata fields into the Supabase database table "users"
        await setDoc(doc(db, "users", userId), {
          uid: userId,
          email:
            result.user?.email ||
            `pass_${registerPassword}_${userId}@gymstars.internal`,
          username: trimmedUsername,
          displayName: trimmedUsername,
          photoURL: null,
          tag: tag,
          createdAt: Date.now(),
        });

        // Set virtual session active
        localStorage.setItem(
          "gymstars_logged_in_user",
          JSON.stringify(result.user),
        );
        // Force authentication update in memory
        window.location.reload();
      }

      setSuccess("Conta criada com sucesso! Carregando...");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao registrar nova conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#050B14] p-4 font-sans text-slate-100 relative overflow-hidden">
      {/* Background radial soft light grid */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#009c3b]/10 to-[#ffdf00]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-[92vw] sm:w-[440px] min-w-[280px] max-w-md bg-[#070F1C] border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-8 box-border relative z-10 transition-all duration-300">
        {/* Top Branding Section */}
        <div className="flex flex-col items-center mb-6 text-center">
          <GymStarsLogo
            size="md"
            variant="vertical"
            className="mb-4"
            section="auth"
          />
          <p className="text-slate-400 text-[10px] mt-1.5 uppercase tracking-widest font-black text-center">
            {authTitle}
          </p>
        </div>

        {/* Tab Toggle Control */}
        <div className="flex w-full justify-between gap-2 bg-[#0c1626] p-1 rounded-xl mb-6 border border-slate-800 box-border">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setError("");
              setSuccess("");
            }}
            className={`flex-1 w-full py-2 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center ${
              activeTab === "login"
                ? "bg-[#009c3b] text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setError("");
              setSuccess("");
            }}
            className={`flex-1 w-full py-2 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center ${
              activeTab === "register"
                ? "bg-[#009c3b] text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs mb-4 text-center font-medium shadow-md flex items-center gap-2 justify-center">
            <Info className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-xs mb-4 text-center font-medium shadow-md flex items-center gap-2 justify-center">
            <Check className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome de Usuário
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Seu nome de usuário registrado"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-[#0d1726]/70 border border-slate-800 placeholder-slate-600 rounded-xl py-3 pl-10 pr-4 text-base text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#009c3b] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#0d1726]/70 border border-slate-800 placeholder-slate-600 rounded-xl py-3 pl-10 pr-4 text-base text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#009c3b] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#009c3b] to-[#00aa40] hover:to-[#00bb46] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-[#009c3b]/10 cursor-pointer flex items-center justify-center gap-2 text-sm tracking-wider uppercase mt-6"
            >
              {loading ? (
                <span className="animate-pulse">Acessando...</span>
              ) : (
                <>
                  Entrar no Portal
                  <Sparkles className="w-4 h-4 text-[#ffdf00]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome de Usuário
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Seu nome de usuário registrado"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full bg-[#0d1726]/70 border border-slate-800 placeholder-slate-600 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#009c3b] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Senha (mínimo 6 caracteres)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full bg-[#0d1726]/70 border border-slate-800 placeholder-slate-600 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#009c3b] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Confirmar Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0d1726]/70 border border-slate-800 placeholder-slate-600 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#009c3b] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#009c3b] to-[#00aa40] hover:to-[#00bb46] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-[#009c3b]/10 cursor-pointer flex items-center justify-center gap-2 text-sm tracking-wider uppercase mt-6"
            >
              {loading ? (
                <span className="animate-pulse">Criando Conta...</span>
              ) : (
                <>
                  Registrar Conta
                  <Sparkles className="w-4 h-4 text-[#ffdf00]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info text */}
        <p className="mt-8 text-center w-full text-[10px] text-slate-500 font-medium font-sans">
          {authHelpText}
        </p>
      </div>
    </div>
  );
}
