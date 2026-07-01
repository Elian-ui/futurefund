"use client";

import React, { useState, useEffect } from "react";
import { useFutureFund } from "../context/useFutureFund";
import { useCurrency } from "../context/CurrencyContext";
import CurrencyInput from "./CurrencyInput";
import { Calculator as CalcIcon, Percent, Calendar, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Calculator() {
  const router = useRouter();
  const { buyPackage, user, investmentPackages } = useFutureFund();
  const { format, currency, toLocal, toUSD } = useCurrency();
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [amount, setAmount] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!investmentPackages.length) return;

    if (!selectedPkgId || !investmentPackages.some((pkg) => pkg.id === selectedPkgId)) {
      setSelectedPkgId(investmentPackages[0].id);
    }
  }, [investmentPackages, selectedPkgId]);

  // Keep amount synchronized to local currency when currency changes
  const prevCurrencyRef = React.useRef(currency.code);
  useEffect(() => {
    if (prevCurrencyRef.current !== currency.code) {
      setAmount((prev) => Math.round(toLocal(toUSD(prev))));
      prevCurrencyRef.current = currency.code;
    }
  }, [currency.code, toLocal, toUSD]);

  const selectedPkg = investmentPackages.find((p) => p.id === selectedPkgId) || investmentPackages[0];
  const localMin = selectedPkg ? Math.round(toLocal(selectedPkg.minInvestment)) : 0;
  const localMax = selectedPkg ? Math.round(toLocal(selectedPkg.maxInvestment)) : 0;
  const sliderStep = Math.max(
    1,
    Math.round(toLocal(selectedPkg?.cycle === "daily" ? 50 : selectedPkg?.cycle === "weekly" ? 250 : 1000)),
  );

  // Adjust amount bounds when selected package changes (amount is in local currency)
  useEffect(() => {
    if (!selectedPkg) return;

    if (amount < localMin) {
      setAmount(localMin);
    } else if (amount > localMax) {
      setAmount(localMax);
    }
  }, [selectedPkg, selectedPkgId, localMin, localMax, amount]);

  if (!selectedPkg) {
    return (
      <div className="w-full glass-card-glow rounded-3xl p-6 sm:p-8 text-sm text-foreground/60">
        Investment packages are currently unavailable.
      </div>
    );
  }

  // Convert to USD for logic calculations
  const usdAmount = toUSD(amount);
  const rateMultiplier = selectedPkg.rate / 100;
  const cyclePayout = usdAmount * rateMultiplier;
  const totalPayoutEarnings = cyclePayout * selectedPkg.duration;
  const totalReturn = usdAmount + totalPayoutEarnings;
  const netProfit = totalPayoutEarnings;
  const roiPercentage = ((totalReturn - usdAmount) / usdAmount) * 100;

  const handleInvest = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await buyPackage(selectedPkg.id, toUSD(amount));
      if (res.success) {
        setFeedback({ success: true, message: `Successfully purchased ${selectedPkg.name} for ${format(toUSD(amount))}!` });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setFeedback({ success: false, message: res.error || "Failed to invest." });
      }
    } catch (e) {
      setFeedback({ success: false, message: "An unexpected error occurred." });
    }
    setLoading(false);
  };

  return (
    <div className="w-full glass-card-glow rounded-3xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <CalcIcon className="h-5 w-5 glow-text" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">ROI Profit Calculator</h3>
          <p className="text-xs text-foreground/60">Calculate potential returns before you invest</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Select Package */}
          <div>
            <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2">
              Select Package Plan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {investmentPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`px-4 py-3 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                    selectedPkgId === pkg.id
                      ? "border-primary bg-primary/10 text-white shadow-sm shadow-primary/10"
                      : "border-card-border bg-card/40 text-foreground/75 hover:bg-card/70"
                  }`}
                >
                  <span className="block text-sm font-bold">{pkg.name.split(" ")[0]}</span>
                  <span className="block text-[11px] text-foreground/50 capitalize">
                    {pkg.rate}% {pkg.cycle}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Investment Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                Investment Amount ({currency.symbol})
              </label>
            </div>

            <CurrencyInput
              value={amount}
              min={localMin}
              max={localMax}
              onChange={(localVal) => setAmount(localVal)}
              className="py-1.5 px-3"
            >
              {/* Quick Min/Max Buttons */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-1 sm:pr-1">
                <button
                  type="button"
                  onClick={() => setAmount(localMin)}
                  className="min-w-0 rounded-xl border border-card-border bg-card px-2.5 py-2 text-[10px] font-bold text-foreground/70 hover:text-white hover:border-primary/45 cursor-pointer whitespace-nowrap sm:px-3 sm:py-1.5"
                >
                  Min ({format(selectedPkg.minInvestment, { compact: true })})
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(localMax)}
                  className="min-w-0 rounded-xl border border-card-border bg-card px-2.5 py-2 text-[10px] font-bold text-foreground/70 hover:text-white hover:border-primary/45 cursor-pointer whitespace-nowrap sm:px-3 sm:py-1.5"
                >
                  Max ({format(selectedPkg.maxInvestment, { compact: true })})
                </button>
              </div>
            </CurrencyInput>

            {/* Slider */}
            <input
              type="range"
              min={localMin}
              max={localMax}
              step={sliderStep}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full mt-4 h-1.5 rounded-lg bg-card-border appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="p-4 rounded-2xl bg-card/30 border border-card-border text-xs text-foreground/65 leading-relaxed">
            <span className="font-semibold text-white block mb-0.5">Package Details:</span>
            {selectedPkg.description} This package will compound payouts for exactly{" "}
            <span className="text-primary font-semibold">
              {selectedPkg.duration} {selectedPkg.cycle === "daily" ? "days" : selectedPkg.cycle === "weekly" ? "weeks" : "months"}
            </span>.
          </div>
        </div>

        {/* Right Column: Earnings Summary */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-card/30 rounded-2xl border border-card-border p-6">
          <div className="space-y-5">
            <h4 className="text-sm font-bold text-white border-b border-card-border pb-3 uppercase tracking-wider">
              Projected Earnings
            </h4>

            {/* Metric List */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[11px] text-foreground/50 uppercase font-semibold">Nominal ROI</span>
                <span className="text-xl font-extrabold text-primary flex items-center gap-0.5">
                  <Percent className="h-4 w-4 text-primary shrink-0" />
                  {roiPercentage.toFixed(0)}%
                </span>
              </div>

              <div>
                <span className="block text-[11px] text-foreground/50 uppercase font-semibold">Cycle Yield</span>
                <span className="text-lg font-bold text-white">
                  {format(cyclePayout)}
                  <span className="text-xs font-normal text-foreground/50 capitalize">/{selectedPkg.cycle.slice(0, 3)}</span>
                </span>
              </div>

              <div>
                <span className="block text-[11px] text-foreground/50 uppercase font-semibold">Net Profit</span>
                <span className="text-lg font-bold text-accent-gold">
                  +{format(netProfit)}
                </span>
              </div>

              <div>
                <span className="block text-[11px] text-foreground/50 uppercase font-semibold">Term Duration</span>
                <span className="text-lg font-bold text-white flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-foreground/40 shrink-0" />
                  {selectedPkg.duration} {selectedPkg.cycle === "daily" ? "Days" : selectedPkg.cycle === "weekly" ? "Weeks" : "Months"}
                </span>
              </div>
            </div>

            {/* Split Visualizer */}
            <div className="pt-2">
              <span className="block text-[10px] font-semibold text-foreground/50 uppercase tracking-wider mb-2">
                Return Distribution Bar
              </span>
              <div className="h-4 w-full rounded-lg bg-card-border flex overflow-hidden">
                <div
                  className="h-full bg-slate-500 transition-all duration-300"
                  style={{ width: `${(amount / totalReturn) * 100}%` }}
                  title={`Principal: ${format(amount)}`}
                />
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                  style={{ width: `${(netProfit / totalReturn) * 100}%` }}
                  title={`Net Profit: ${format(netProfit)}`}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-foreground/55 mt-1.5">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-500 inline-block" /> Principal
                </span>
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary inline-block" /> Total ROI Payouts
                </span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-4 border-t border-card-border flex justify-between items-end">
              <div>
                <span className="block text-xs text-foreground/50 font-bold uppercase">Total Return Value</span>
                <span className="text-2xl font-extrabold text-white">
                  {format(totalReturn)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Invest Button */}
          <div className="mt-6">
            {feedback && (
              <div
                className={`p-3.5 mb-3 rounded-xl border text-xs font-semibold ${
                  feedback.success
                    ? "bg-primary/10 border-primary/20 text-accent"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <button
              onClick={handleInvest}
              disabled={loading || amount <= 0 || usdAmount < selectedPkg.minInvestment || usdAmount > selectedPkg.maxInvestment}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3.5 text-sm font-bold text-background shadow-md shadow-primary/20 hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                <>
                  Invest Now
                  <ArrowRight className="h-4 w-4 text-background" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
