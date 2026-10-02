"use client";

import React, { useState } from "react";
import { X, Lock, Mail, User } from "lucide-react";
import AventixLogo from "./AventixLogo";

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: "login" | "register";
  onClose: () => void;
}

export default function AuthModal({
  isOpen,
  initialMode = "login",
  onClose,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0e1622] border border-[#213145] rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#182332] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <AventixLogo size="md" className="justify-center mb-3" />
          <h3 className="text-xl font-bold text-white">
            {mode === "login" ? "Welcome Back" : "Create Your Account"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "login"
              ? "Access your concert tickets and upcoming events"
              : "Join millions of music lovers across the Philippines"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-[#131b26] p-1 border border-[#1e2a39] mb-5">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "login"
                ? "bg-[#00e5be] text-[#091519] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "register"
                ? "bg-[#00e5be] text-[#091519] shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Juan dela Cruz"
                  className="w-full bg-[#141e2b] text-sm text-white placeholder-slate-500 pl-9 pr-3.5 py-2.5 rounded-xl border border-[#233348] focus:outline-none focus:border-[#00e5be]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-[#141e2b] text-sm text-white placeholder-slate-500 pl-9 pr-3.5 py-2.5 rounded-xl border border-[#233348] focus:outline-none focus:border-[#00e5be]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#141e2b] text-sm text-white placeholder-slate-500 pl-9 pr-3.5 py-2.5 rounded-xl border border-[#233348] focus:outline-none focus:border-[#00e5be]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#00e5be] hover:bg-[#32efcc] text-[#091519] font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,229,190,0.3)] hover:scale-[1.02] active:scale-98 mt-2"
          >
            {isSuccess
              ? "✓ Success!"
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <p className="text-[11px] text-slate-500 text-center mt-5">
          By continuing, you agree to Aventix&apos;s{" "}
          <span className="text-[#00e5be] cursor-pointer hover:underline">Terms</span> &amp;{" "}
          <span className="text-[#00e5be] cursor-pointer hover:underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
