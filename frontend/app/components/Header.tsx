"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFutureFund } from "../context/useFutureFund";
import { useCurrency, CURRENCIES, Currency } from "../context/CurrencyContext";
import { Wallet, Menu, X, ChevronDown, Check } from "lucide-react";
import { BrandMark } from "./BrandMark";

// ─── Self-contained Currency Dropdown ────────────────────────────────────────

function CurrencySelector({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const toggleOpen = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  };

  const chooseCurrency = (e: React.PointerEvent<HTMLButtonElement>, c: Currency) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrency(c);
    setOpen(false);
  };

  // Close on outside click — ref covers both button AND dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        onPointerDown={toggleOpen}
        className={`relative z-[70] flex touch-manipulation items-center justify-center gap-1.5 rounded-xl border border-card-border bg-card/80 hover:bg-card transition-all duration-200 cursor-pointer font-semibold text-foreground/80 hover:text-white ${
          compact ? "h-10 min-w-10 px-2 text-xs gap-0.5" : "px-3 py-1.5 text-xs"
        }`}
        aria-expanded={open}
        aria-label="Select currency"
      >
        <span className={compact ? "text-sm" : "text-sm leading-none"}>{currency.flag}</span>
        {!compact && <span className="tracking-wide">{currency.code}</span>}
        <ChevronDown
          className={`text-foreground/50 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          } ${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-[80] mt-2 w-56 rounded-2xl border border-card-border bg-background/98 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="px-3 py-2 border-b border-card-border/60">
            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
              Select Currency
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {CURRENCIES.map((c: Currency) => (
              <button
                type="button"
                key={c.code}
                onPointerDown={(e) => chooseCurrency(e, c)}
                className={`w-full touch-manipulation flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer hover:bg-card/70 ${
                  c.code === currency.code
                    ? "text-primary bg-primary/5"
                    : "text-foreground/75 hover:text-white"
                }`}
              >
                <span className="text-base w-6 text-center leading-none">{c.flag}</span>
                <span className="font-bold text-xs w-8 shrink-0">{c.code}</span>
                <span className="text-xs text-foreground/50 truncate flex-1">{c.name}</span>
                {c.code === currency.code && (
                  <Check className="h-3 w-3 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useFutureFund();
  const { format } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileMenuOpen((open) => !open);
  };

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Invest Plans", href: "/packages" },
    { name: "Wallet", href: "/wallet" },
    { name: "Support", href: "/support" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-[60] w-full border-b border-card-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex min-w-0 items-center gap-2 group shrink">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 p-1.5 group-hover:scale-105 transition-transform duration-200">
              <BrandMark className="h-full w-full drop-shadow-[0_0_10px_rgba(22,199,132,0.28)]" />
            </div>
            <span className="truncate text-lg font-bold tracking-tight text-white group-hover:text-primary transition-colors duration-200 sm:text-xl">
              Future<span className="text-primary">Fund</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? "text-primary border-b-2 border-primary pb-1"
                    : "text-foreground/75 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Currency Selector */}
            <CurrencySelector />

            {user.email ? (
              <>
                {/* Wallet Balance */}
                <div className="flex items-center gap-2 rounded-xl bg-card border border-card-border px-3 py-1.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-xs text-foreground/60 font-medium">Wallet:</span>
                  <span className="text-sm font-bold text-white">{format(user.balance)}</span>
                </div>

                {/* User chip + logout */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-card-border bg-card/50 px-3 py-1.5">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-[10px] font-bold text-background uppercase">
                      {user.name.slice(0, 2)}
                    </div>
                    <span className="text-xs font-medium text-foreground/80">{user.name}</span>
                  </div>
                  <button
                    onClick={() => { if (confirm("Sign out of your account?")) logout(); }}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 cursor-pointer transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/auth"
                className="rounded-xl bg-primary hover:bg-primary-hover px-4 py-2.5 text-xs font-bold text-background transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile right — balance + currency + hamburger */}
          <div className="relative z-[70] flex shrink-0 md:hidden items-center gap-2">
            {user.email && (
              <div className="hidden min-[380px]:flex items-center gap-1 rounded-lg bg-card border border-card-border px-2 py-1 text-xs font-bold text-white">
                <Wallet className="h-3 w-3 text-primary" />
                <span>{format(user.balance, { compact: true })}</span>
              </div>
            )}

            {/* Currency selector — compact mode on mobile */}
            <CurrencySelector compact />

            <button
              type="button"
              onPointerDown={toggleMobileMenu}
              className="relative z-[70] inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg p-2 text-foreground hover:bg-card border border-card-border bg-card/80 transition-colors cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto absolute left-0 right-0 top-full z-[65] md:hidden border-t border-card-border bg-background/98 px-4 py-3 space-y-3 shadow-2xl shadow-black/40">
          <nav className="flex flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary border-l-2 border-primary pl-2"
                    : "text-foreground/75 hover:bg-card hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="pt-2 border-t border-card-border flex flex-col gap-2.5">
            {user.email ? (
              <>
                <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2 border border-card-border">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-[9px] font-bold text-background uppercase">
                      {user.name.slice(0, 2)}
                    </div>
                    <span className="text-xs text-foreground/70">{user.name}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{format(user.balance)}</span>
                </div>

                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-card-border bg-card py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/5 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center rounded-lg bg-primary py-2 text-xs font-bold text-background hover:bg-primary-hover transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
