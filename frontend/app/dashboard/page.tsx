"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFutureFund } from "../context/useFutureFund";
import { useCurrency } from "../context/CurrencyContext";
import CustomChart from "../components/CustomChart";
import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Briefcase,
  Layers,
  Bell,
  Check,
  Copy,
  Gift,
  Users,
} from "lucide-react";

export default function Dashboard() {
  const { user, activeInvestments, transactions, notifications, isLoaded, platformSettings } = useFutureFund();
  const { format } = useCurrency();
  const router = useRouter();
  const [referralCopied, setReferralCopied] = useState(false);
  const referralLink = useMemo(() => {
    if (!user.referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/auth?ref=${encodeURIComponent(user.referralCode)}`;
  }, [user.referralCode]);

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

  // Calculate active investments sums
  const activeCapital = activeInvestments
    .filter((inv) => inv.status === "active")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const activeCount = activeInvestments.filter((inv) => inv.status === "active").length;

  const copyReferralLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 1800);
  };

  return (
    <div className="mx-auto w-full max-w-7xl overflow-hidden px-4 py-6 sm:px-6 lg:px-8 sm:py-8 space-y-6 sm:space-y-8 flex-1">
      {/* Welcome header */}
      <div className="flex min-w-0 flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary/80">
            Investor Dashboard
          </p>
          <h2 className="break-words text-2xl font-extrabold leading-tight text-white sm:text-2xl">
            Welcome, {user.name}
          </h2>
          <p className="mt-1 text-xs text-foreground/50">
            Monitor and manage your compounding ROI packages.
          </p>
        </div>

        {/* Action button triggers */}
        <div className="grid w-full grid-cols-3 gap-2.5 sm:flex sm:w-auto sm:items-center">
          <Link
            href="/wallet"
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-card-border bg-card/60 hover:bg-card px-2 py-3 text-[11px] font-bold text-white transition-colors sm:flex-row sm:gap-1.5 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-xs"
          >
            <ArrowDownLeft className="h-5 w-5 text-emerald-400 sm:h-4 sm:w-4" />
            Deposit
          </Link>
          <Link
            href="/wallet"
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-card-border bg-card/60 hover:bg-card px-2 py-3 text-[11px] font-bold text-white transition-colors sm:flex-row sm:gap-1.5 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-xs"
          >
            <ArrowUpRight className="h-5 w-5 text-rose-400 sm:h-4 sm:w-4" />
            Withdraw
          </Link>
          <Link
            href="/packages"
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl bg-primary hover:bg-primary-hover px-2 py-3 text-[11px] font-bold text-background transition-colors sm:flex-row sm:gap-1.5 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-xs"
          >
            <PlusCircle className="h-5 w-5 text-background sm:h-4 sm:w-4" />
            Buy
          </Link>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Latest Notifications
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {notifications.slice(0, 3).map((notice) => (
              <div
                key={notice.id}
                className="rounded-2xl border border-card-border bg-card/50 p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-bold text-white">{notice.title}</p>
                  {!notice.read && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      New
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/60">
                  {notice.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Wallet Balance */}
        <div className="col-span-2 min-w-0 rounded-3xl border border-primary/20 bg-primary/10 p-5 sm:col-span-1 sm:rounded-2xl sm:border-card-border sm:bg-card/30 flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary sm:h-10 sm:w-10 sm:rounded-xl">
            <Wallet className="h-6 w-6 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Wallet Balance</span>
            <span className="block break-words text-2xl font-black text-white sm:text-lg">
              {format(user.balance)}
            </span>
          </div>
        </div>

        {/* Total Active Investment */}
        <div className="min-w-0 rounded-2xl border border-card-border bg-card/30 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Active Capital</span>
            <span className="block break-words text-base font-black text-white sm:text-lg">{format(activeCapital)}</span>
          </div>
        </div>

        {/* Total ROI Earned */}
        <div className="min-w-0 rounded-2xl border border-card-border bg-card/30 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Total Earned ROI</span>
            <span className="block break-words text-base font-black text-white sm:text-lg">
              +{format(user.totalEarned)}
            </span>
          </div>
        </div>

        {/* Active Packages Count */}
        <div className="col-span-2 min-w-0 rounded-2xl border border-card-border bg-card/30 p-4 sm:col-span-1 sm:p-5 flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Active plans</span>
            <span className="block break-words text-lg font-black text-white">
              {activeCount} {activeCount === 1 ? "Package" : "Packages"}
            </span>
          </div>
        </div>
      </div>

      {user.referralCode && (
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Referral Program
                </h3>
              </div>
              <p className="mb-3 max-w-2xl text-xs leading-relaxed text-foreground/55">
                Share your link and earn {format(platformSettings.referralBonusUsd)} when a referred investor&apos;s first deposit is approved.
              </p>
              <div className="grid gap-3 text-xs sm:grid-cols-3">
                <div className="rounded-2xl border border-card-border bg-card/35 p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45">
                    Your Code
                  </span>
                  <span className="mt-1 block break-words font-black text-white">
                    {user.referralCode}
                  </span>
                </div>
                <div className="rounded-2xl border border-card-border bg-card/35 p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45">
                    Invited
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 font-black text-white">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    {user.referralCount ?? 0}
                  </span>
                </div>
                <div className="rounded-2xl border border-card-border bg-card/35 p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45">
                    Bonus Earned
                  </span>
                  <span className="mt-1 block break-words font-black text-primary">
                    {format(user.referralEarnings ?? 0)}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={copyReferralLink}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
            >
              {referralCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {referralCopied ? "Copied" : "Copy Referral Link"}
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Chart */}
      <div className="w-full">
        <CustomChart transactions={transactions} initialBalance={user.balance} />
      </div>

      {/* Lower Row: Investments and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Investments */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-card-border pb-3">
            Active Investment Plans
          </h3>

          {activeInvestments.length === 0 ? (
            <div className="text-center py-10 space-y-4">
              <p className="text-xs text-foreground/50">You have no active investment packages.</p>
              <Link
                href="/packages"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 px-4 py-2 text-xs font-bold text-primary transition-all"
              >
                Browse Investment Plans
              </Link>
            </div>
          ) : (
            <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-card-border text-foreground/55 font-bold uppercase tracking-wider">
                    <th className="py-2.5">Package</th>
                    <th className="py-2.5">Capital</th>
                    <th className="py-2.5">Accrued Yield</th>
                    <th className="py-2.5 text-right">Cycle Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/50">
                  {activeInvestments.map((inv) => {
                    const progress = (inv.durationSpent / inv.duration) * 100;
                    return (
                      <tr key={inv.id} className="text-foreground/80 hover:text-white transition-colors">
                        <td className="py-3">
                          <span className="font-bold block text-white">{inv.packageName}</span>
                          <span className="text-[10px] text-foreground/40 capitalize">
                            {inv.rate}% {inv.cycle} Payout
                          </span>
                        </td>
                        <td className="py-3 font-semibold">{format(inv.amount)}</td>
                        <td className="py-3">
                          <span className="text-primary font-bold">
                            +{format(inv.accumulatedYield)}
                          </span>
                          <span className="block text-[9px] text-foreground/40 font-bold uppercase mt-0.5">
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold block">
                              {inv.durationSpent}/{inv.duration}{" "}
                              {inv.cycle === "daily" ? "Days" : inv.cycle === "weekly" ? "Wks" : "Mos"}
                            </span>
                            {inv.status === "active" && (
                              <div className="w-16 h-1 rounded-full bg-card-border overflow-hidden mt-1">
                                <div
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {activeInvestments.map((inv) => {
                const progress = Math.min(100, (inv.durationSpent / inv.duration) * 100);
                return (
                  <div key={inv.id} className="rounded-2xl border border-card-border bg-card/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-white">{inv.packageName}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground/45">
                          {inv.rate}% {inv.cycle} payout
                        </p>
                      </div>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase text-primary">
                        {inv.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block text-foreground/45">Capital</span>
                        <span className="block break-words font-bold text-white">{format(inv.amount)}</span>
                      </div>
                      <div>
                        <span className="block text-foreground/45">Accrued Yield</span>
                        <span className="block break-words font-bold text-primary">+{format(inv.accumulatedYield)}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-foreground/45">
                        <span>Cycle Progress</span>
                        <span>
                          {inv.durationSpent}/{inv.duration} {inv.cycle === "daily" ? "Days" : inv.cycle === "weekly" ? "Weeks" : "Months"}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-card-border">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>

        {/* Transaction History Log */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-card-border pb-3">
            Transaction Activity Log
          </h3>

          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs text-foreground/50">No transaction records found.</p>
            </div>
          ) : (
            <div className="flow-root max-h-[300px] overflow-y-auto pr-1">
              <ul role="list" className="-mb-8">
                {transactions.map((tx, idx) => {
                  const isPositive =
                    tx.type === "deposit" || tx.type === "payout" || tx.type === "maturity_refund";

                  return (
                    <li key={tx.id}>
                      <div className="relative pb-8">
                        {idx !== transactions.length - 1 && (
                          <span
                            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-card-border"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex space-x-3 items-center">
                          <div>
                            <span
                              className={`h-8 w-8 rounded-full flex items-center justify-center border text-xs font-black ${
                                tx.type === "deposit"
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                  : tx.type === "withdrawal"
                                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                  : tx.type === "investment"
                                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                  : tx.type === "payout"
                                  ? "bg-primary/10 border-primary/20 text-primary"
                                  : "bg-accent-gold/10 border-accent-gold/20 text-accent-gold"
                              }`}
                            >
                              {tx.type === "deposit" && "DP"}
                              {tx.type === "withdrawal" && "WD"}
                              {tx.type === "investment" && "IN"}
                              {tx.type === "payout" && "ROI"}
                              {tx.type === "maturity_refund" && "MR"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                            <div>
                              <p className="text-xs font-bold text-white leading-normal">
                                {tx.description}
                              </p>
                              <p className="text-[10px] text-foreground/45 mt-0.5">{tx.timestamp}</p>
                              {tx.status && tx.status !== "completed" && (
                                <p className="text-[10px] text-primary font-bold uppercase mt-0.5">
                                  {tx.status}
                                </p>
                              )}
                            </div>
                            <div className="text-right whitespace-nowrap text-xs font-bold">
                              {tx.amount > 0 ? (
                                <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                                  {isPositive ? "+" : "-"}
                                  {format(tx.amount)}
                                </span>
                              ) : (
                                <span className="text-foreground/40">Event</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
