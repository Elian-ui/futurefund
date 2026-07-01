"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFutureFund } from "../context/useFutureFund";
import { useCurrency } from "../context/CurrencyContext";
import CurrencyInput from "../components/CurrencyInput";
import { ArrowDownLeft, ArrowUpRight, Copy, Check, ShieldAlert, Sparkles, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WalletPage() {
  const router = useRouter();
  const { user, deposit, withdraw, isLoaded, platformSettings } = useFutureFund();
  const { format, currency, toLocal, toUSD, rates } = useCurrency();
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [depMethod, setDepMethod] = useState("USDT_TRC20");
  const [wdrMethod, setWdrMethod] = useState("USDT_TRC20");
  const [depAmount, setDepAmount] = useState<number>(500);
  const [wdrAmount, setWdrAmount] = useState<number>(100);
  const [destination, setDestination] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const prevCurrencyRef = useRef(currency.code);

  // Local-currency equivalents for display/validation
  const depositMinUsd = platformSettings.minDeposit;
  const depositMaxUsd = Math.max(platformSettings.minDeposit, platformSettings.maxDeposit);
  const withdrawalMinUsd = platformSettings.minWithdrawal;
  const withdrawalMaxUsd = Math.min(user.balance, Math.max(platformSettings.minWithdrawal, platformSettings.maxWithdrawal));
  const canWithdrawByBalance = user.balance >= platformSettings.minWithdrawal;
  const localDepMin = toLocal(depositMinUsd);
  const localDepMax = toLocal(depositMaxUsd);
  const localWdrMax = canWithdrawByBalance ? toLocal(withdrawalMaxUsd) : 0;
  const localWdrMin = canWithdrawByBalance ? Math.min(toLocal(withdrawalMinUsd), localWdrMax) : 0;
  const usdDepAmount = toUSD(depAmount);
  const usdWdrAmount = toUSD(wdrAmount);
  const depositAmountInvalid = usdDepAmount < depositMinUsd || usdDepAmount > depositMaxUsd;
  const withdrawalAmountInvalid =
    usdWdrAmount < withdrawalMinUsd ||
    usdWdrAmount > withdrawalMaxUsd ||
    user.balance < usdWdrAmount ||
    !canWithdrawByBalance;
  const depositMethods = platformSettings.paymentMethods.filter((method) => method.depositEnabled);
  const withdrawalMethods = platformSettings.paymentMethods.filter((method) => method.withdrawalEnabled);
  const selectedDepositMethod = depositMethods.find((method) => method.id === depMethod) ?? depositMethods[0];
  const selectedWithdrawalMethod = withdrawalMethods.find((method) => method.id === wdrMethod) ?? withdrawalMethods[0];

  useEffect(() => {
    if (depositMethods.length > 0 && !depositMethods.some((method) => method.id === depMethod)) {
      setDepMethod(depositMethods[0].id);
    }
    if (withdrawalMethods.length > 0 && !withdrawalMethods.some((method) => method.id === wdrMethod)) {
      setWdrMethod(withdrawalMethods[0].id);
    }
  }, [depMethod, depositMethods, withdrawalMethods, wdrMethod]);

  useEffect(() => {
    const previousCode = prevCurrencyRef.current;
    if (previousCode === currency.code) return;

    const previousRate = rates[previousCode] ?? 1;
    const nextRate = rates[currency.code] ?? 1;
    const convertLocalAmount = (amount: number, min: number, max: number) => {
      const converted = Math.round((amount / previousRate) * nextRate);
      return Math.min(Math.max(converted, Math.round(min)), Math.round(max));
    };

    setDepAmount((amount) => convertLocalAmount(amount, localDepMin, localDepMax));
    setWdrAmount((amount) =>
      localWdrMax > 0 ? convertLocalAmount(amount, localWdrMin, localWdrMax) : 0,
    );
    prevCurrencyRef.current = currency.code;
  }, [currency.code, localDepMax, localDepMin, localWdrMax, localWdrMin, rates]);

  useEffect(() => {
    setDepAmount((amount) =>
      Math.min(Math.max(amount, Math.round(localDepMin)), Math.round(localDepMax)),
    );
    setWdrAmount((amount) =>
      localWdrMax > 0
        ? Math.min(Math.max(amount, Math.round(localWdrMin)), Math.round(localWdrMax))
        : 0,
    );
  }, [localDepMax, localDepMin, localWdrMax, localWdrMin]);

  useEffect(() => {
    if (isLoaded && !user.email) {
      router.push("/auth");
    }
  }, [isLoaded, user.email, router]);

  if (!isLoaded || !user.email) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedDepositMethod?.address || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    if (!platformSettings.depositsEnabled) {
      setFeedback({ success: false, message: "Deposits are temporarily disabled." });
      setLoading(false);
      return;
    }
    if (!selectedDepositMethod) {
      setFeedback({ success: false, message: "No deposit method is currently available." });
      setLoading(false);
      return;
    }

    if (depositAmountInvalid) {
      setFeedback({
        success: false,
        message: `Deposit amount must be between ${format(depositMinUsd)} and ${format(depositMaxUsd)}.`,
      });
      setLoading(false);
      return;
    }

    try {
      const res = await deposit(usdDepAmount, selectedDepositMethod.id);
      if (res) {
        setFeedback({ success: true, message: `Deposit request for ${format(usdDepAmount)} submitted for admin review.` });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setFeedback({ success: false, message: "Invalid deposit amount." });
      }
    } catch (e) {
      setFeedback({ success: false, message: "Failed to process deposit connection." });
    }
    setLoading(false);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    if (!platformSettings.withdrawalsEnabled) {
      setFeedback({ success: false, message: "Withdrawals are temporarily disabled." });
      setLoading(false);
      return;
    }
    if (!selectedWithdrawalMethod) {
      setFeedback({ success: false, message: "No withdrawal method is currently available." });
      setLoading(false);
      return;
    }

    if (withdrawalAmountInvalid) {
      setFeedback({
        success: false,
        message: `Withdrawal amount must be between ${format(withdrawalMinUsd)} and ${format(withdrawalMaxUsd)}.`,
      });
      setLoading(false);
      return;
    }

    try {
      const res = await withdraw(usdWdrAmount, destination, selectedWithdrawalMethod.id);
      if (res.success) {
        setFeedback({ success: true, message: `Withdrawal request for ${format(usdWdrAmount)} submitted for admin review.` });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setFeedback({ success: false, message: res.error || "Failed to process withdrawal." });
      }
    } catch (e) {
      setFeedback({ success: false, message: "Connection to withdrawal server failed." });
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 flex-1">
      {/* Page Title */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-white">Wallet Center</h2>
        <p className="text-sm text-foreground/50">
          Deposit funds to your wallet or submit a withdrawal request to your address.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-card-border">
        <button
          onClick={() => {
            setActiveTab("deposit");
            setFeedback(null);
          }}
          className={`flex-1 py-4 text-center font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border-b-2 ${
            activeTab === "deposit"
              ? "border-primary text-primary"
              : "border-transparent text-foreground/60 hover:text-white"
          }`}
        >
          <ArrowDownLeft className="h-4.5 w-4.5" />
          Fund Deposit
        </button>
        <button
          onClick={() => {
            setActiveTab("withdraw");
            setFeedback(null);
          }}
          className={`flex-1 py-4 text-center font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border-b-2 ${
            activeTab === "withdraw"
              ? "border-primary text-primary"
              : "border-transparent text-foreground/60 hover:text-white"
          }`}
        >
          <ArrowUpRight className="h-4.5 w-4.5" />
          Request Withdrawal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Side: Form Interface */}
        <div className="md:col-span-7 glass-card rounded-3xl p-6 sm:p-8">
          {activeTab === "deposit" ? (
            <form onSubmit={handleDepositSubmit} className="space-y-5">
              <h3 className="text-base font-bold text-white mb-2">Fund Wallet Balance</h3>

              {/* Deposit Method Select */}
              <div>
                <label className="block text-xs font-semibold text-foreground/75 uppercase tracking-wider mb-2">
                  Deposit Method
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {depositMethods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDepMethod(m.id)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        depMethod === m.id
                          ? "border-primary bg-primary/10 text-white"
                          : "border-card-border bg-card/40 text-foreground/70 hover:bg-card"
                      }`}
                    >
                      {m.label}
                      {m.network && <span className="ml-1 text-foreground/45">({m.network})</span>}
                    </button>
                  ))}
                </div>
                {depositMethods.length === 0 && (
                  <p className="text-xs font-semibold text-amber-300">
                    No deposit methods are currently configured.
                  </p>
                )}
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold text-foreground/75 uppercase tracking-wider mb-2">
                  Amount to Credit ({currency.symbol})
                </label>
                <CurrencyInput
                  value={depAmount}
                  onChange={setDepAmount}
                  min={Math.round(localDepMin)}
                  max={Math.round(localDepMax)}
                  disabled={!platformSettings.depositsEnabled}
                  hint={`Min ${format(depositMinUsd, { compact: true })} · Max ${format(depositMaxUsd, { compact: true })}`}
                />
              </div>

              {!platformSettings.depositsEnabled && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300">
                  Deposits are currently disabled by platform settings.
                </div>
              )}

              {feedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold ${
                    feedback.success
                      ? "bg-primary/10 border-primary/20 text-accent"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !platformSettings.depositsEnabled || depositAmountInvalid || !selectedDepositMethod}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3.5 text-sm font-bold text-background shadow-md shadow-primary/20 hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer mt-6"
              >
                {loading ? (
                  <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  "Submit Deposit Request"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleWithdrawSubmit} className="space-y-5">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-bold text-white">Settlement Outflow</h3>
                <span className="text-xs text-foreground/50 font-medium">
                  Available: {format(user.balance)}
                </span>
              </div>

              {/* Withdrawal Method Select */}
              <div>
                <label className="block text-xs font-semibold text-foreground/75 uppercase tracking-wider mb-2">
                  Withdrawal Method
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {withdrawalMethods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setWdrMethod(m.id)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        wdrMethod === m.id
                          ? "border-primary bg-primary/10 text-white"
                          : "border-card-border bg-card/40 text-foreground/70 hover:bg-card"
                      }`}
                    >
                      {m.label}
                      {m.network && <span className="ml-1 text-foreground/45">({m.network})</span>}
                    </button>
                  ))}
                </div>
                {withdrawalMethods.length === 0 && (
                  <p className="text-xs font-semibold text-amber-300">
                    No withdrawal methods are currently configured.
                  </p>
                )}
              </div>

              {/* Destination address */}
              <div>
                <label className="block text-xs font-semibold text-foreground/75 uppercase tracking-wider mb-2">
                  Destination Details
                </label>
                <div className="relative rounded-2xl border border-card-border bg-card/60 p-3 flex items-center">
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={`${selectedWithdrawalMethod?.method ?? "Wallet"} address destination`}
                    className="bg-transparent border-0 text-white placeholder-foreground/30 focus:outline-none focus:ring-0 w-full text-base font-medium sm:text-sm"
                  />
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold text-foreground/75 uppercase tracking-wider mb-2">
                  Withdrawal Amount ({currency.symbol})
                </label>
                <CurrencyInput
                  value={wdrAmount}
                  onChange={setWdrAmount}
                  min={Math.round(localWdrMin)}
                  max={Math.round(localWdrMax)}
                  disabled={!platformSettings.withdrawalsEnabled || !canWithdrawByBalance}
                  hint={`Min ${format(withdrawalMinUsd, { compact: true })} · Max ${format(withdrawalMaxUsd, { compact: true })}`}
                />
              </div>

              {(!platformSettings.withdrawalsEnabled || !canWithdrawByBalance) && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300">
                  {!platformSettings.withdrawalsEnabled
                    ? "Withdrawals are currently disabled by platform settings."
                    : `Your balance must be at least ${format(withdrawalMinUsd)} to request a withdrawal.`}
                </div>
              )}

              {feedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold ${
                    feedback.success
                      ? "bg-primary/10 border-primary/20 text-accent"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !platformSettings.withdrawalsEnabled || withdrawalAmountInvalid || !destination.trim() || !selectedWithdrawalMethod}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3.5 text-sm font-bold text-background shadow-md shadow-primary/20 hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer mt-6"
              >
                {loading ? (
                  <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  "Request Settlement Withdrawal"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Side: QR code visual mockups */}
        <div className="md:col-span-5 flex flex-col justify-center bg-card/30 rounded-3xl border border-card-border p-6 text-center space-y-6">
          {activeTab === "deposit" ? (
            <>
              <div className="space-y-4">
                <span className="block text-xs font-bold text-white uppercase tracking-wider">
                  Deposit Destination QR Code
                </span>

                {/* Custom Simulated SVG QR Code */}
                <div className="h-40 w-40 mx-auto bg-white rounded-2xl p-3 flex items-center justify-center relative shadow-md">
                  <QrCode className="h-full w-full text-background" />
                  {/* Tiny emerald center glow badge */}
                  <div className="absolute inset-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-card border border-primary/20 flex items-center justify-center">
                    <span className="text-[10px] font-black text-primary">FF</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="block text-[10px] text-foreground/50 font-bold uppercase">
                    Network Address details
                  </span>
                  <div className="flex items-center justify-between rounded-xl bg-card border border-card-border px-3 py-2 text-xs">
                    <span className="text-white font-mono truncate max-w-[150px]">
                      {selectedDepositMethod?.address ?? "No address configured"}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded-lg hover:bg-card-border text-foreground/60 hover:text-white cursor-pointer transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-primary/5 border border-primary/10 p-3 text-[11px] text-foreground/60 text-left leading-normal">
                <ShieldAlert className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                Please transfer only the configured token network payload. Transactions compile within 1 network confirmation.
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="h-6 w-6 glow-text animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-white">Instant Outflow Settlement</h4>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Withdrawal requests compile and settle instantly inside our sandbox simulator database context log. Real balances deduct immediately.
                </p>
              </div>

              <div className="rounded-xl border border-card-border bg-card/60 p-4 text-left text-[11px] text-foreground/50 space-y-2 leading-relaxed">
                <span className="block font-bold text-white uppercase text-[10px] tracking-wider mb-1">
                  Settlement Rules
                </span>
                <p>&bull; Gas network standard fees: 0.00% at all times.</p>
                <p>&bull; Minimum payout request: {format(platformSettings.minWithdrawal)}.</p>
                <p>&bull; Maximum payout per transaction request: {format(platformSettings.maxWithdrawal)}.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
