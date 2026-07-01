"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─── Supported currencies ────────────────────────────────────────────────────

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar",         symbol: "$",  flag: "🇺🇸" },
  { code: "EUR", name: "Euro",              symbol: "€",  flag: "🇪🇺" },
  { code: "GBP", name: "British Pound",     symbol: "£",  flag: "🇬🇧" },
  { code: "AED", name: "UAE Dirham",        symbol: "د.إ",flag: "🇦🇪" },
  { code: "KES", name: "Kenyan Shilling",   symbol: "KSh",flag: "🇰🇪" },
  { code: "UGX", name: "Ugandan Shilling",  symbol: "USh",flag: "🇺🇬" },
  { code: "NGN", name: "Nigerian Naira",    symbol: "₦",  flag: "🇳🇬" },
  { code: "ZAR", name: "South African Rand",symbol: "R",  flag: "🇿🇦" },
  { code: "GHS", name: "Ghanaian Cedi",     symbol: "₵",  flag: "🇬🇭" },
  { code: "JPY", name: "Japanese Yen",      symbol: "¥",  flag: "🇯🇵" },
  { code: "INR", name: "Indian Rupee",      symbol: "₹",  flag: "🇮🇳" },
  { code: "CAD", name: "Canadian Dollar",   symbol: "C$", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc",       symbol: "Fr", flag: "🇨🇭" },
  { code: "BTC", name: "Bitcoin",           symbol: "₿",  flag: "🪙" },
];

// Fallback static rates (USD base) — used when fetch fails
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  KES: 129.5,
  UGX: 3720,
  NGN: 1580,
  ZAR: 18.6,
  GHS: 15.3,
  JPY: 157,
  INR: 83.5,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.9,
  BTC: 0.0000147,
};

// ─── Context type ─────────────────────────────────────────────────────────────

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (usdAmount: number, opts?: { compact?: boolean }) => string;
  /** Convert a USD amount to the currently selected currency */
  toLocal: (usdAmount: number) => number;
  /** Convert a locally-entered amount back to USD */
  toUSD: (localAmount: number) => number;
  rates: Record<string, number>;
  ratesLoaded: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]); // USD default
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // Persist selection
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ff_currency");
      if (saved) {
        const found = CURRENCIES.find((c) => c.code === saved);
        if (found) setCurrencyState(found);
      }
    } catch {}
  }, []);

  // Fetch live rates (USD base) from open public API
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates) {
          setRates({ ...FALLBACK_RATES, ...data.rates });
          setRatesLoaded(true);
        }
      })
      .catch(() => {
        // silently use fallback
        setRatesLoaded(true);
      });
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem("ff_currency", c.code);
    } catch {}
  }, []);

  const format = useCallback(
    (usdAmount: number, opts: { compact?: boolean } = {}) => {
      const rate = rates[currency.code] ?? 1;
      const converted = usdAmount * rate;

      // Bitcoin: show 6 decimal places
      if (currency.code === "BTC") {
        return `${currency.symbol}${converted.toFixed(6)}`;
      }

      // Compact large numbers (e.g. 1.2M)
      if (opts.compact && Math.abs(converted) >= 1_000_000) {
        return `${currency.symbol}${(converted / 1_000_000).toFixed(2)}M`;
      }
      if (opts.compact && Math.abs(converted) >= 1_000) {
        return `${currency.symbol}${(converted / 1_000).toFixed(1)}K`;
      }

      // Currencies with no decimal places
      const noDecimal = ["JPY", "KES", "UGX", "NGN", "ZAR", "GHS"].includes(currency.code);
      const decimals = noDecimal ? 0 : 2;

      return `${currency.symbol}${converted.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    },
    [currency, rates]
  );

  const toLocal = useCallback(
    (usdAmount: number) => {
      const rate = rates[currency.code] ?? 1;
      return usdAmount * rate;
    },
    [currency, rates]
  );

  const toUSD = useCallback(
    (localAmount: number) => {
      const rate = rates[currency.code] ?? 1;
      return rate === 0 ? localAmount : localAmount / rate;
    },
    [currency, rates]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, toLocal, toUSD, rates, ratesLoaded }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
