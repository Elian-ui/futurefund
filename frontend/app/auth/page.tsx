"use client";

import React, { useState, useEffect } from "react";
import { useFutureFund } from "../context/useFutureFund";
import { Shield, Mail, User, Check, KeyRound, Lock, Eye, EyeOff, AlertCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import PhoneNumberInput from "../components/PhoneNumberInput";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function Auth() {
  const router = useRouter();
  const { user, isLoaded, loginWithToken, platformSettings } = useFutureFund();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Already logged in → go to dashboard
  useEffect(() => {
    if (isLoaded && user.email) {
      router.push("/dashboard");
    }
  }, [isLoaded, user.email, router]);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      setReferralCode(ref.trim().toUpperCase());
      setActiveTab("register");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    if (activeTab === "register" && !agreeTerms) {
      setFeedback({ success: false, message: "You must agree to the terms and conditions." });
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setFeedback({ success: false, message: "Email address is required." });
      setLoading(false);
      return;
    }

    if (!password) {
      setFeedback({ success: false, message: "Password is required." });
      setLoading(false);
      return;
    }

    if (activeTab === "register" && !name.trim()) {
      setFeedback({ success: false, message: "Full name is required." });
      setLoading(false);
      return;
    }

    if (activeTab === "register" && !phoneNumber.trim()) {
      setFeedback({ success: false, message: "Phone number is required." });
      setLoading(false);
      return;
    }

    try {
      const endpoint =
        activeTab === "login" ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;

      const body =
        activeTab === "login"
          ? { email: email.trim(), password }
          : {
              name: name.trim(),
              email: email.trim(),
              phoneNumber: phoneNumber.trim(),
              password,
              referralCode: referralCode.trim() || undefined,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          success: false,
          message: data.message || "Authentication failed. Please try again.",
        });
        setLoading(false);
        return;
      }

      // data = { access_token, user: { name, email, balance, ... } }
      setFeedback({
        success: true,
        message:
          activeTab === "login"
            ? "Welcome back! Redirecting to dashboard..."
            : "Account created! Redirecting to dashboard...",
      });

      await loginWithToken(data.access_token, {
        name: data.user.name,
        email: data.user.email,
        phoneNumber: data.user.phoneNumber,
        balance: data.user.balance,
        totalInvested: data.user.totalInvested,
        totalEarned: data.user.totalEarned,
        referralCode: data.user.referralCode,
        referralCount: data.user.referralCount ?? 0,
        referralEarnings: data.user.referralEarnings ?? 0,
      });

      setTimeout(() => {
        setLoading(false);
        router.push("/dashboard");
      }, 800);
    } catch {
      setFeedback({ success: false, message: "Could not connect to server. Please try again." });
      setLoading(false);
    }
  };

  return (
    <div className="relative flex-1 flex items-center justify-center min-h-[calc(100vh-4rem-8rem)] px-4 sm:px-6 lg:px-8 bg-background py-12">
      {/* Decorative ambient blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-card-glow rounded-3xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <KeyRound className="h-6 w-6 glow-text animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">FutureFund Portal</h2>
          <p className="text-xs text-foreground/50">Access your high-yield ROI investment account</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-card-border">
          <button
            onClick={() => { setActiveTab("login"); setFeedback(null); }}
            className={`flex-1 pb-3 text-center text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === "login"
                ? "border-primary text-primary"
                : "border-transparent text-foreground/55 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab("register"); setFeedback(null); }}
            className={`flex-1 pb-3 text-center text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === "register"
                ? "border-primary text-primary"
                : "border-transparent text-foreground/55 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name (register only) */}
          {activeTab === "register" && (
            <div>
              <label className="block text-xs font-semibold text-foreground/75 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative rounded-xl border border-card-border bg-card/60 p-3 flex items-center">
                <User className="h-4 w-4 text-foreground/45 shrink-0 mr-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="bg-transparent border-0 text-white placeholder-foreground/25 focus:outline-none focus:ring-0 w-full text-base font-medium sm:text-sm"
                />
              </div>
            </div>
          )}

          {/* Phone number (register only) */}
          {activeTab === "register" && (
            <div>
              <label className="block text-xs font-semibold text-foreground/75 uppercase tracking-wider mb-2">
                Mobile Money Number
              </label>
              <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-foreground/75 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative rounded-xl border border-card-border bg-card/60 p-3 flex items-center">
              <Mail className="h-4 w-4 text-foreground/45 shrink-0 mr-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-transparent border-0 text-white placeholder-foreground/25 focus:outline-none focus:ring-0 w-full text-base font-medium sm:text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-foreground/75 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative rounded-xl border border-card-border bg-card/60 p-3 flex items-center">
              <Lock className="h-4 w-4 text-foreground/45 shrink-0 mr-3" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent border-0 text-white placeholder-foreground/25 focus:outline-none focus:ring-0 w-full text-base font-medium sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-foreground/45 hover:text-white transition-colors cursor-pointer ml-2"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Referral code */}
          {activeTab === "register" && (
            <div>
              <label className="block text-xs font-semibold text-foreground/75 uppercase tracking-wider mb-2">
                Referral Code
              </label>
              <div className="relative rounded-xl border border-card-border bg-card/60 p-3 flex items-center">
                <Users className="h-4 w-4 text-foreground/45 shrink-0 mr-3" />
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Optional invite code"
                  className="bg-transparent border-0 text-white placeholder-foreground/25 focus:outline-none focus:ring-0 w-full text-base font-medium sm:text-sm"
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-foreground/50">
                Have an invite? Enter it here. Referrers earn {platformSettings.referralBonusPercent}% of your first approved deposit.
              </p>
            </div>
          )}

          {/* Remember Me */}
          {activeTab === "login" && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  rememberMe ? "bg-primary border-primary" : "border-card-border bg-card/40"
                }`}
              >
                {rememberMe && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
              </button>
              <span
                className="text-xs text-foreground/60 cursor-pointer"
                onClick={() => setRememberMe(!rememberMe)}
              >
                Remember me on this device
              </span>
            </div>
          )}

          {/* Terms */}
          {activeTab === "register" && (
            <div className="flex items-start gap-2.5">
              <button
                type="button"
                onClick={() => setAgreeTerms(!agreeTerms)}
                className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  agreeTerms ? "bg-primary border-primary" : "border-card-border bg-card/40"
                }`}
              >
                {agreeTerms && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
              </button>
              <span
                className="text-xs text-foreground/60 cursor-pointer leading-relaxed"
                onClick={() => setAgreeTerms(!agreeTerms)}
              >
                I agree to the Terms of Service and compounding wealth disclosure.
              </span>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                feedback.success
                  ? "bg-primary/10 border-primary/20 text-accent"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              {feedback.success ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {feedback.message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3.5 text-sm font-bold text-background shadow-md shadow-primary/20 hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer mt-6"
          >
            {loading ? (
              <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : activeTab === "login" ? (
              "Sign In & Enter Dashboard"
            ) : (
              "Create Account & Start Earning"
            )}
          </button>
        </form>

        {/* Secure marker */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-foreground/45 border-t border-card-border/60 pt-4">
          <Shield className="h-3.5 w-3.5 text-primary" />
          JWT Secured · End-to-End Encrypted
        </div>
      </div>
    </div>
  );
}
