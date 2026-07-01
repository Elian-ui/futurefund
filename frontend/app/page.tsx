"use client";

import React, { useState } from "react";
import Link from "next/link";
import Calculator from "./components/Calculator";
import { useFutureFund } from "./context/useFutureFund";
import { useCurrency } from "./context/CurrencyContext";
import { Shield, Coins, Rocket, Award, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { investmentPackages } = useFutureFund();
  const { format } = useCurrency();
  const packageRateSummary =
    investmentPackages.length > 0
      ? investmentPackages
          .map((pkg) => `${pkg.name}: ${pkg.rate}% ${pkg.cycle} for ${pkg.duration} ${pkg.cycle === "daily" ? "days" : pkg.cycle === "weekly" ? "weeks" : "months"}`)
          .join("; ")
      : "Package rates, cycles, and durations are shown on the active package cards and may be updated by the platform.";

  const stats = [
    { label: "Active Investors", value: "24,800+" },
    { label: "Total Assets Invested", value: `${format(42_600_000, { compact: true })}+` },
    { label: "Paid Out Yields", value: `${format(18_200_000, { compact: true })}+` },
  ];

  const features = [
    {
      icon: <Shield className="h-6 w-6 text-primary" />,
      title: "Secure Smart Execution",
      desc: "All investment packages are securely ring-fenced and locked with automated compounding ledger audits.",
    },
    {
      icon: <Coins className="h-6 w-6 text-primary" />,
      title: "Customized Cycle Payouts",
      desc: "Choose from active packages with admin-configured payout rates, cycle timing, capital limits, and maturity durations.",
    },
    {
      icon: <Rocket className="h-6 w-6 text-primary" />,
      title: "No Hidden Costs",
      desc: "Deposit and withdraw with complete transparency. Standard payouts credit directly to your dashboard wallet.",
    },
  ];

  const faqs = [
    {
      q: "How does the FutureFund ROI platform work?",
      a: "FutureFund aggregates liquidity and puts it to work in high-yield staking pools and trade networks. Users purchase structured packages that return steady daily, weekly, or monthly yield rates until maturity, at which point the principal is returned.",
    },
    {
      q: "What is the difference between Daily, Weekly, and Monthly plans?",
      a: `Each plan differs by payout cycle, rate, duration, and capital limits. Current active terms: ${packageRateSummary}.`,
    },
    {
      q: "When can I withdraw my earnings?",
      a: "Yield payouts accumulate in your wallet balance according to the plan's cycle frequency (e.g. daily, weekly, or monthly). You can request withdrawals at any time once they are credited.",
    },
  ];

  return (
    <div className="relative isolate overflow-hidden min-h-screen bg-background">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute top-[400px] right-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl" />

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="text-center space-y-6 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-accent">
            <Award className="h-3.5 w-3.5" /> High-Performance Yield Portfolios
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Secure Compound Yields <br />
            With <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent pl-1.5">FutureFund</span>
          </h1>

          <p className="text-base sm:text-lg text-foreground/75 leading-relaxed">
            Maximize your wealth with our ring-fenced, high-yield investment cycles. Select flexible daily, weekly, or monthly packages tailored to your financial goals.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/packages"
              className="rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-bold text-background shadow-md shadow-primary/10 hover:opacity-95 transition-opacity"
            >
              Explore Packages
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-card-border bg-card/60 hover:bg-card px-6 py-3 text-sm font-bold text-white transition-colors"
            >
              Investor Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto rounded-3xl border border-card-border bg-card/25 p-6 sm:p-8 backdrop-blur-sm mb-24">
          {stats.map((stat, i) => (
            <div key={i} className="text-center space-y-1 py-4 md:py-0 md:border-r last:border-0 border-card-border">
              <span className="block text-2xl sm:text-3xl font-extrabold text-white">{stat.value}</span>
              <span className="block text-xs text-foreground/50 font-medium uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Calculator Showcase */}
        <div className="mb-24">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl font-bold text-white">Compound ROI Estimator</h2>
            <p className="text-sm text-foreground/60">Configure capital limits and calculate your net payout maturity</p>
          </div>
          <Calculator />
        </div>

        {/* Features List */}
        <div className="mb-24">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-2xl font-bold text-white">Why Invest With FutureFund?</h2>
            <p className="text-sm text-foreground/60">Built from the ground up for maximum capital efficiency and safety</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="rounded-2xl border border-card-border bg-card/35 p-6 hover:border-primary/20 hover:bg-card/50 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-xs text-foreground/60 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Package Tiers Preview */}
        <div className="mb-24">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-2xl font-bold text-white">Our Structuring Packages</h2>
            <p className="text-sm text-foreground/60">Select the investment horizon that fits your liquid capital</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {investmentPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="relative rounded-2xl border border-card-border bg-card/40 p-6 flex flex-col justify-between hover:border-primary/30 transition-colors"
              >
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{pkg.name}</h3>
                  <p className="text-xs text-foreground/50 mb-4 capitalize">Paid {pkg.cycle}</p>
                  
                  <div className="mb-4">
                    <span className="text-4xl font-black text-primary">{pkg.rate}%</span>
                    <span className="text-xs text-foreground/60 ml-1">/{pkg.cycle.slice(0, 3)}</span>
                  </div>

                  <p className="text-xs text-foreground/70 mb-6 leading-normal">{pkg.description}</p>
                </div>

                <div className="border-t border-card-border pt-4 mt-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground/50">Min Limit:</span>
                    <span className="font-bold text-white">{format(pkg.minInvestment)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground/50">Max Limit:</span>
                    <span className="font-bold text-white">{format(pkg.maxInvestment)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground/50">Duration:</span>
                    <span className="font-bold text-white">{pkg.duration} {pkg.cycle === "daily" ? "Days" : pkg.cycle === "weekly" ? "Weeks" : "Months"}</span>
                  </div>

                  <Link
                    href={`/packages`}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-card-border bg-card py-2 text-xs font-bold text-white hover:bg-primary hover:text-background hover:border-primary transition-all duration-200 mt-2"
                  >
                    Invest Now
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <HelpCircle className="h-5.5 w-5.5 text-primary" /> Frequently Asked Questions
            </h2>
            <p className="text-sm text-foreground/60">Quick answers about payouts, terms, and limits</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-card-border bg-card/25 p-5">
                <h4 className="text-sm font-bold text-white mb-2">{faq.q}</h4>
                <p className="text-xs text-foreground/60 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
