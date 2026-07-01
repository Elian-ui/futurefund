"use client";

import React, { useState, useEffect, useRef } from "react";
import { InvestmentPackage, useFutureFund } from "../context/useFutureFund";
import { useCurrency } from "../context/CurrencyContext";
import CurrencyInput from "../components/CurrencyInput";
import { Shield, Sparkles, ChevronRight, AlertTriangle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Packages() {
  const router = useRouter();
  const { buyPackage, user, isLoaded, investmentPackages } = useFutureFund();
  const { format, currency, toLocal, toUSD } = useCurrency();
  const [investAmounts, setInvestAmounts] = useState<{ [key: string]: number }>({});
  const [activeModalPkg, setActiveModalPkg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const usdBoundaryTolerance = 1;

  const normalizeUsdAmount = (pkg: InvestmentPackage, localAmount: number) => {
    const usdAmount = toUSD(localAmount);

    if (Math.abs(usdAmount - pkg.minInvestment) <= usdBoundaryTolerance) {
      return pkg.minInvestment;
    }

    if (Math.abs(usdAmount - pkg.maxInvestment) <= usdBoundaryTolerance) {
      return pkg.maxInvestment;
    }

    return usdAmount;
  };

  // Amounts stored in local currency and converted to USD before API calls.
  const prevCurrencyRef = useRef(currency.code);
  useEffect(() => {
    if (prevCurrencyRef.current === currency.code) return;

    setInvestAmounts((prev) => {
      const next: { [key: string]: number } = {};
      for (const k in prev) {
        next[k] = Math.round(toLocal(toUSD(prev[k])));
      }
      return next;
    });
    prevCurrencyRef.current = currency.code;
  }, [currency.code, toLocal, toUSD]);

  useEffect(() => {
    setInvestAmounts((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const pkg of investmentPackages) {
        const localMin = Math.round(toLocal(pkg.minInvestment));
        const localMax = Math.round(toLocal(pkg.maxInvestment));
        const current = next[pkg.id];

        if (current === undefined || current < localMin || current > localMax) {
          next[pkg.id] = Math.min(Math.max(current ?? localMin, localMin), localMax);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [investmentPackages, toLocal]);

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleAmountChange = (pkgId: string, val: number) => {
    setInvestAmounts((prev) => ({
      ...prev,
      [pkgId]: val,
    }));
  };

  const openConfirmation = (pkgId: string) => {
    if (!user.email) {
      router.push("/auth");
      return;
    }

    setActiveModalPkg(pkgId);
    setFeedback(null);
  };

  const handleInvestConfirm = async () => {
    if (!activeModalPkg) return;
    const pkg = investmentPackages.find((item) => item.id === activeModalPkg);
    if (!pkg) return;
    const amount = investAmounts[activeModalPkg] || 0;
    const usdAmount = normalizeUsdAmount(pkg, amount);
    
    setLoading(true);
    setFeedback(null);

    try {
      const res = await buyPackage(activeModalPkg, usdAmount);
      if (res.success) {
        setFeedback({
          success: true,
          message: `Success! Invested ${format(usdAmount)} in ${pkg.name}.`,
        });
        setTimeout(() => {
          setActiveModalPkg(null);
          router.push("/dashboard");
        }, 1500);
      } else {
        setFeedback({
          success: false,
          message: res.error || "Failed to complete purchase.",
        });
      }
    } catch (e) {
      setFeedback({
        success: false,
        message: "An unexpected error occurred.",
      });
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 flex-1">
      {/* Page Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="text-3xl font-extrabold text-white">Investment Package Store</h2>
        <p className="text-sm text-foreground/50">
          Deposit funds to purchase standard packages. Collect daily, weekly, or monthly ROI compounding yields.
        </p>
      </div>

      {/* Grid of Packages */}
      {investmentPackages.length === 0 ? (
        <div className="rounded-3xl border border-card-border bg-card/25 p-8 text-center text-sm text-foreground/60">
          No investment packages are available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {investmentPackages.map((pkg) => {
          const amountLocal = investAmounts[pkg.id] || Math.round(toLocal(pkg.minInvestment));
          const usdAmount = normalizeUsdAmount(pkg, amountLocal);
          const isAmountInvalid = usdAmount < pkg.minInvestment || usdAmount > pkg.maxInvestment;
          
          // ROI Math (all in USD)
          const totalEarnings = usdAmount * (pkg.rate / 100) * pkg.duration;
          const roiPercentage = ((usdAmount + totalEarnings - usdAmount) / usdAmount) * 100;

          return (
            <div
              key={pkg.id}
              className="relative rounded-3xl border border-card-border bg-card/25 p-6 flex flex-col justify-between hover:border-primary/40 hover:bg-card/35 transition-all duration-300"
            >
              {/* Hot/Popular tag */}
              {pkg.id === "weekly-growth" && (
                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-black text-background uppercase tracking-widest">
                  <Sparkles className="h-3 w-3 fill-background" /> Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{pkg.name}</h3>
                  <p className="text-[11px] text-foreground/45 uppercase font-bold tracking-wider capitalize">
                    {pkg.cycle} compounding cycle
                  </p>
                </div>

                <div className="py-2">
                  <span className="text-5xl font-black text-primary tracking-tight">{pkg.rate}%</span>
                  <span className="text-xs text-foreground/50 ml-1">/{pkg.cycle.slice(0, 3)} yield</span>
                </div>

                <p className="text-xs text-foreground/60 leading-relaxed min-h-[50px]">{pkg.description}</p>

                {/* Input block inside card */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-foreground/60">
                    <span>Investment Amount:</span>
                    <span>{user.email ? `Wallet Balance: ${format(user.balance)}` : "Sign in to invest"}</span>
                  </div>
                  
                  <CurrencyInput
                    value={amountLocal}
                    min={Math.round(toLocal(pkg.minInvestment))}
                    max={Math.round(toLocal(pkg.maxInvestment))}
                    onChange={(val) => handleAmountChange(pkg.id, val)}
                    className="py-1.5 px-3 bg-card/50"
                  >
                    <button
                      type="button"
                      onClick={() => handleAmountChange(pkg.id, Math.round(toLocal(pkg.maxInvestment)))}
                      className="px-2.5 py-1.5 rounded-xl bg-card border border-card-border text-[10px] font-bold text-foreground/75 hover:text-white hover:border-primary/45 cursor-pointer whitespace-nowrap"
                    >
                      Max
                    </button>
                  </CurrencyInput>
                </div>
              </div>

              {/* Package Specs & Calculations */}
              <div className="border-t border-card-border/60 pt-4 mt-6 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/50">Min / Max Invest:</span>
                  <span className="font-semibold text-white">
                    {format(pkg.minInvestment)} – {format(pkg.maxInvestment)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/50">Maturity Period:</span>
                  <span className="font-semibold text-white">
                    {pkg.duration} {pkg.cycle === "daily" ? "Days" : pkg.cycle === "weekly" ? "Weeks" : "Months"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/50">Projected Profit:</span>
                  <span className="font-bold text-accent-gold">
                    +{format(totalEarnings)}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-b border-card-border/30 pb-2">
                  <span className="text-foreground/50">Total Return ROI:</span>
                  <span className="font-bold text-primary">
                    {roiPercentage.toFixed(0)}%
                  </span>
                </div>

                <button
                  onClick={() => openConfirmation(pkg.id)}
                  disabled={isAmountInvalid}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-xs font-extrabold text-background hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer mt-2"
                >
                  {user.email ? "Invest In Package" : "Sign In To Invest"}
                  <ChevronRight className="h-4 w-4 text-background" />
                </button>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {activeModalPkg && (() => {
        const pkg = investmentPackages.find((p) => p.id === activeModalPkg);
        if (!pkg) return null;
        const amountLocal = investAmounts[pkg.id] || Math.round(toLocal(pkg.minInvestment));
        const usdAmount = normalizeUsdAmount(pkg, amountLocal);
        const yieldPayout = usdAmount * (pkg.rate / 100);
        const totalEarnings = yieldPayout * pkg.duration;
        const finalReturn = usdAmount + totalEarnings;
        const hasBalance = user.balance >= usdAmount;
        const amountInRange = usdAmount >= pkg.minInvestment && usdAmount <= pkg.maxInvestment;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md glass-card-glow rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-extrabold text-white">Confirm Investment</h3>
                <p className="text-xs text-foreground/50">Please review the terms of your contract purchase</p>
              </div>

              {/* Order Details */}
              <div className="rounded-2xl border border-card-border bg-card/50 p-4 space-y-3.5">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/50">Plan Name:</span>
                  <span className="font-bold text-white">{pkg.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/50">Principal Investment:</span>
                  <span className="font-extrabold text-white">{format(usdAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/50">Cycle Payout Rate:</span>
                  <span className="font-semibold text-primary">
                    {pkg.rate}% ({format(yieldPayout)}) per {pkg.cycle.slice(0, 3)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/50">Maturity Horizon:</span>
                  <span className="font-semibold text-white">
                    {pkg.duration} {pkg.cycle === "daily" ? "Days" : pkg.cycle === "weekly" ? "Weeks" : "Months"}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t border-card-border/60 pt-3">
                  <span className="text-foreground/50">Net ROI Payouts:</span>
                  <span className="font-bold text-accent-gold">
                    +{format(totalEarnings)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-foreground/50">Total Return:</span>
                  <span className="font-extrabold text-white">
                    {format(finalReturn)}
                  </span>
                </div>
              </div>

              {/* Warnings and errors */}
              {!amountInRange ? (
                <div className="flex items-start gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 text-xs font-semibold">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
                  <div>
                    <span className="block font-bold">Amount Outside Package Range</span>
                    This package accepts investments from {format(pkg.minInvestment)} to {format(pkg.maxInvestment)}.
                  </div>
                </div>
              ) : !hasBalance ? (
                <div className="flex items-start gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 text-xs font-semibold">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
                  <div>
                    <span className="block font-bold">Insufficient Wallet Balance</span>
                    You need another {format(usdAmount - user.balance)} to buy this package. Please deposit funds first.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl bg-card border border-card-border p-4 text-foreground/60 text-xs leading-normal">
                  <Shield className="h-5 w-5 shrink-0 text-primary" />
                  Upon maturity, the capital principal is returned to your dashboard wallet automatically.
                </div>
              )}

              {/* Feedback messages */}
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

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveModalPkg(null)}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-card-border bg-card/60 hover:bg-card py-3 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvestConfirm}
                  disabled={loading || !hasBalance || !amountInRange}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-xs font-bold text-background shadow-md shadow-primary/20 hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  ) : (
                    <>
                      Confirm & Invest
                      <ArrowRight className="h-3.5 w-3.5 text-background" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
