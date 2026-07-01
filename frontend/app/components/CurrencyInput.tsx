"use client";

import React, { useState, useEffect, useRef } from "react";
import { useCurrency } from "../context/CurrencyContext";

interface CurrencyInputProps {
  /** Raw numeric value in the selected local currency */
  value: number;
  onChange: (localValue: number) => void;
  min?: number;
  max?: number;
  /** Extra hint shown to the right of the input (e.g. "Min USh37K · Max USh372M") */
  hint?: string;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * A text input that:
 * – Displays the value with comma separators while not focused
 * – Strips formatting while the user types
 * – Clamps to [min, max] on blur
 * – Shows the selected currency symbol as a prefix
 */
export default function CurrencyInput({
  value,
  onChange,
  min,
  max,
  hint,
  className = "",
  disabled = false,
  children,
}: CurrencyInputProps) {
  const { currency } = useCurrency();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(String(Math.round(value)));

  // Keep raw in sync when value changes externally (e.g. currency switch)
  useEffect(() => {
    if (!focused) {
      setRaw(String(Math.round(value)));
    }
  }, [value, focused]);

  /** Strip anything that isn't a digit or decimal point */
  const strip = (s: string) => s.replace(/[^0-9.]/g, "");

  /** Format a number with locale-aware commas, no decimals for large currencies */
  const commaFormat = (n: number) => {
    const noDecimal = ["JPY", "KES", "UGX", "NGN", "ZAR", "GHS"].includes(currency.code);
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: noDecimal ? 0 : 2,
    });
  };

  const displayValue = focused ? raw : commaFormat(value);

  const handleFocus = () => {
    setFocused(true);
    setRaw(strip(String(Math.round(value))));
    // Select all on focus for easy overwrite
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = strip(e.target.value);
    setRaw(stripped);
    const parsed = parseFloat(stripped);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    let num = parseFloat(strip(raw));
    if (isNaN(num)) num = min ?? 0;
    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;
    setRaw(String(Math.round(num)));
    onChange(num);
  };

  return (
    <div className={`relative rounded-2xl border border-card-border bg-card/60 p-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="text-sm font-bold text-foreground/45 shrink-0 select-none">
          {currency.symbol}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9,]*"
          disabled={disabled}
          value={displayValue}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
          className="bg-transparent border-0 text-white font-bold focus:outline-none focus:ring-0 w-full min-w-0 text-base sm:text-sm"
        />
        {hint && (
          <span className="hidden text-[10px] text-foreground/35 shrink-0 whitespace-nowrap select-none sm:inline">
            {hint}
          </span>
        )}
        {children && <div className="hidden shrink-0 sm:block">{children}</div>}
      </div>
      {children && <div className="mt-3 sm:hidden">{children}</div>}
      {hint && (
        <span className="mt-2 block text-[10px] text-foreground/35 select-none sm:hidden">
          {hint}
        </span>
      )}
    </div>
  );
}
