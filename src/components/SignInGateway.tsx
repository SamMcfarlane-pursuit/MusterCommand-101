import React, { useState, useEffect, useRef } from "react";
import { Fingerprint, Lock, ShieldCheck, Loader2, Monitor, Tablet, Smartphone } from "lucide-react";

interface SignInGatewayProps {
  onAuthenticated: (profile: any) => void;
}

const QUICK_PROFILES = [
  {
    token: "usr_d4e3f2a1",
    label: "Fire Safety Director",
    sublabel: "F-89 Certified • Command Center",
    icon: Monitor,
    color: "from-red-600 to-orange-500",
    borderColor: "border-red-500/40",
    bgColor: "bg-red-950/30",
  },
  {
    token: "usr_a7f8c9d1",
    label: "Floor Warden (NW)",
    sublabel: "F-58 Certified • Tablet Kiosk",
    icon: Tablet,
    color: "from-amber-500 to-yellow-500",
    borderColor: "border-amber-500/40",
    bgColor: "bg-amber-950/30",
  },
  {
    token: "usr_b3c7d6e5",
    label: "Standard Occupant",
    sublabel: "NE Legal • Mobile Handheld",
    icon: Smartphone,
    color: "from-slate-500 to-slate-400",
    borderColor: "border-slate-500/40",
    bgColor: "bg-slate-800/30",
  },
];

export default function SignInGateway({ onAuthenticated }: SignInGatewayProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuickLogin, setActiveQuickLogin] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input for rapid RFID scanner entry
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleAuthenticate = async (tokenOverride?: string) => {
    const token = tokenOverride || employeeId.trim();
    if (!token) return;

    setIsAuthenticating(true);
    setError(null);
    if (tokenOverride) setActiveQuickLogin(tokenOverride);

    try {
      // Send token to the Just-In-Time Decryption API
      const response = await fetch("/api/vault/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Using fsd_admin as the requester to bypass the role check during global login
        body: JSON.stringify({ token, requesterId: "fsd_admin" })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed. Invalid ID.");
      }

      // Introduce a slight artificial delay for the "secure decryption" effect
      setTimeout(() => {
        setIsAuthenticating(false);
        setActiveQuickLogin(null);
        onAuthenticated(data.decrypted);
      }, 800);

    } catch (err: any) {
      setTimeout(() => {
        setIsAuthenticating(false);
        setActiveQuickLogin(null);
        setError(err.message);
        setEmployeeId("");
        if (inputRef.current) inputRef.current.focus();
      }, 500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuthenticate();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header outside card */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-orange-600/10 border border-orange-500/20 text-orange-500">
          <ShieldCheck size={24} />
        </span>
        <h1 className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
          MusterCommand
          <span className="text-sm font-mono tracking-widest bg-slate-800 text-slate-300 font-bold border border-slate-700 px-1.5 py-0.5 rounded">
            PHASE 1
          </span>
        </h1>
      </div>

      <div className="absolute top-6 right-6 flex items-center gap-3 text-slate-400 font-mono text-base">
        <span className="animate-pulse">
          <Lock size={18} className="text-amber-500" />
        </span>
        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-10 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center text-center animate-fadeIn">

        <h2 className="text-4xl font-extrabold text-white tracking-tight mb-2">
          MUSTERCOMMAND<br/>ACCESS
        </h2>
        <p className="text-lg text-slate-400 mb-8">
          Secure Employee Identification
        </p>

        {/* Quick Access Demo Cards */}
        <div className="w-full mb-8">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Quick Demo Access</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_PROFILES.map((profile) => {
              const Icon = profile.icon;
              const isActive = activeQuickLogin === profile.token;
              return (
                <button
                  key={profile.token}
                  onClick={() => handleAuthenticate(profile.token)}
                  disabled={isAuthenticating}
                  className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive
                      ? `${profile.bgColor} ${profile.borderColor} scale-95`
                      : `bg-slate-950/60 border-slate-800 hover:${profile.borderColor} hover:${profile.bgColor}`
                  }`}
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${profile.color} text-slate-950 transition-transform group-hover:scale-110 ${isActive ? "animate-pulse" : ""}`}>
                    {isActive ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-200 leading-tight">{profile.label}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-0.5 leading-tight">{profile.sublabel}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">or enter manually</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Fingerprint size={24} className="text-amber-500 group-focus-within:text-amber-400 transition-colors" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Enter Vault Token (e.g. usr_d4e3f2a1)"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-12 pr-4 py-4 text-lg text-white font-mono placeholder:text-slate-600 outline-none transition-all"
              disabled={isAuthenticating}
            />
          </div>

          {error && (
            <div className="bg-red-950/80 border border-red-500/50 text-red-400 p-3 rounded-lg text-base font-mono animate-fadeIn">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isAuthenticating || !employeeId.trim()}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xl py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] cursor-pointer"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>DECRYPTING VAULT...</span>
              </>
            ) : (
              <span>AUTHENTICATE</span>
            )}
          </button>
        </form>

        <div className="mt-8 relative">
          <div className="w-16 h-16 rounded-full border border-slate-700 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-t border-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
            <Fingerprint size={32} className="text-slate-600" />
          </div>
        </div>

      </div>

      <div className="absolute bottom-6 text-center text-[10px] text-slate-500 font-mono space-y-1">
        <p>Vault Tokens: usr_d4e3f2a1 (FSD) • usr_a7f8c9d1 (Warden) • usr_b3c7d6e5 (Occupant)</p>
        <p className="text-slate-600">ConEdison Floor 7 Pilot • 4 Irving Plaza, New York NY</p>
      </div>

    </div>
  );
}
