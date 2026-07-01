"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useCurrency } from "./CurrencyContext";

export interface InvestmentPackage {
  id: string;
  name: string;
  cycle: "daily" | "weekly" | "monthly";
  rate: number;
  duration: number;
  minInvestment: number;
  maxInvestment: number;
  description: string;
  isActive?: boolean;
}

export interface PlatformSettings {
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  paymentMethods: PaymentMethod[];
  referralBonusPercent: number;
}

export interface PaymentMethod {
  id: string;
  label: string;
  method: string;
  network?: string;
  address?: string;
  channel?: "crypto" | "mobile_money";
  provider?: string;
  currency?: string;
  requiresPhoneNumber?: boolean;
  depositEnabled: boolean;
  withdrawalEnabled: boolean;
}

export interface ActiveInvestment {
  id: string;
  packageId: string;
  packageName: string;
  cycle: "daily" | "weekly" | "monthly";
  rate: number;
  duration: number;
  durationSpent: number;
  amount: number;
  accumulatedYield: number;
  status: "active" | "completed";
  createdAt: string;
  daysSinceLastPayout: number;
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "investment" | "payout" | "maturity_refund" | "referral_bonus";
  status?: "pending" | "approved" | "rejected" | "completed";
  amount: number;
  description: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  rawMessage?: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phoneNumber?: string;
  balance: number;
  totalInvested: number;
  totalEarned: number;
  referralCode?: string;
  referralCount?: number;
  referralEarnings?: number;
}

export const INVESTMENT_PACKAGES: InvestmentPackage[] = [
  {
    id: "daily-starter",
    name: "Starter Daily",
    cycle: "daily",
    rate: 1.5,
    duration: 30,
    minInvestment: 100,
    maxInvestment: 2500,
    description: "Ideal for quick gains and testing the waters. Paid out every 24 hours.",
  },
  {
    id: "weekly-growth",
    name: "Pro Weekly Growth",
    cycle: "weekly",
    rate: 12.0,
    duration: 12,
    minInvestment: 1000,
    maxInvestment: 25000,
    description: "Our most balanced package for steady compounding. Paid out weekly.",
  },
  {
    id: "monthly-elite",
    name: "Elite Monthly Wealth",
    cycle: "monthly",
    rate: 65.0,
    duration: 6,
    minInvestment: 5000,
    maxInvestment: 150000,
    description: "Premium investment package for high-net-worth growth. Paid out monthly.",
  },
];

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  minDeposit: 10,
  maxDeposit: 100_000,
  minWithdrawal: 1,
  maxWithdrawal: 150_000,
  depositsEnabled: true,
  withdrawalsEnabled: true,
  paymentMethods: [
    {
      id: "MTN_MOBILE_MONEY_UG",
      label: "MTN Mobile Money",
      method: "MTN Mobile Money",
      channel: "mobile_money",
      provider: "mtn",
      currency: "UGX",
      requiresPhoneNumber: true,
      depositEnabled: true,
      withdrawalEnabled: true,
    },
    {
      id: "AIRTEL_MONEY_UG",
      label: "Airtel Money",
      method: "Airtel Money",
      channel: "mobile_money",
      provider: "airtel",
      currency: "UGX",
      requiresPhoneNumber: true,
      depositEnabled: true,
      withdrawalEnabled: true,
    },
    {
      id: "USDT_TRC20",
      label: "USDT",
      method: "USDT TRC20",
      network: "TRC20",
      address: "TXu91K8hQ9cM1Xy9b5Zp2F1R8GvW3eFq9A",
      channel: "crypto",
      requiresPhoneNumber: false,
      depositEnabled: true,
      withdrawalEnabled: true,
    },
  ],
  referralBonusPercent: 10,
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getToken(): string | null {
  try {
    return localStorage.getItem("ff_token");
  } catch {
    return null;
  }
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Context Type ────────────────────────────────────────────────────────────

interface FutureFundContextType {
  user: UserProfile;
  activeInvestments: ActiveInvestment[];
  transactions: Transaction[];
  notifications: NotificationItem[];
  investmentPackages: InvestmentPackage[];
  platformSettings: PlatformSettings;
  isPlatformLoaded: boolean;
  isLoaded: boolean;
  deposit: (
    amount: number,
    method: string,
    details?: { phoneNumber?: string },
  ) => Promise<{ success: boolean; error?: string }>;
  withdraw: (amount: number, address: string, method: string) => Promise<{ success: boolean; error?: string }>;
  buyPackage: (packageId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  loginWithToken: (token: string, profile: UserProfile) => Promise<void>;
  logout: () => void;
}

const FutureFundContext = createContext<FutureFundContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function FutureFundProvider({ children }: { children: React.ReactNode }) {
  const { format } = useCurrency();
  const [user, setUser] = useState<UserProfile>({
    name: "",
    email: "",
    balance: 0,
    totalInvested: 0,
    totalEarned: 0,
  });

  const [activeInvestments, setActiveInvestments] = useState<ActiveInvestment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [investmentPackages, setInvestmentPackages] =
    useState<InvestmentPackage[]>(INVESTMENT_PACKAGES);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(
    DEFAULT_PLATFORM_SETTINGS,
  );
  const [isPlatformLoaded, setIsPlatformLoaded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const formatNotificationMessage = useCallback(
    (message: string) => {
      let next = message;

      next = next.replace(
        /(Your\s+)(?:\$)?(\d+(?:\.\d+)?)(\s+(?:deposit|withdrawal)\s+request\b)/g,
        (_match, prefix, amount, suffix) => `${prefix}${format(Number(amount))}${suffix}`,
      );
      next = next.replace(
        /(with\s+)(?:\$)?(\d+(?:\.\d+)?)(\s+capital\b)/g,
        (_match, prefix, amount, suffix) => `${prefix}${format(Number(amount))}${suffix}`,
      );
      next = next.replace(
        /(?:\$)?(\d+(?:\.\d+)?)(\s+(?:has been credited|was credited)\b)/g,
        (_match, amount, suffix) => `${format(Number(amount))}${suffix}`,
      );

      return next;
    },
    [format],
  );

  useEffect(() => {
    setNotifications((current) =>
      current.map((notice) =>
        notice.rawMessage
          ? { ...notice, message: formatNotificationMessage(notice.rawMessage) }
          : notice,
      ),
    );
  }, [formatNotificationMessage]);

  const syncPlatform = useCallback(async () => {
    try {
      const [packagesRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/platform/packages`),
        fetch(`${API_BASE}/platform/settings`),
      ]);

      if (packagesRes.ok) {
        const packages = await packagesRes.json();
        if (Array.isArray(packages)) {
          setInvestmentPackages(packages);
        }
      }

      if (settingsRes.ok) {
        setPlatformSettings(await settingsRes.json());
      }
    } catch (e) {
      console.error("Failed to sync platform settings:", e);
    } finally {
      setIsPlatformLoaded(true);
    }
  }, []);

  // ── Sync all data using stored JWT ─────────────────────────────────────────
  const syncData = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const [profileRes, invRes, txRes, notificationRes] = await Promise.all([
        fetch(`${API_BASE}/investor/profile`, { headers: authHeaders() }),
        fetch(`${API_BASE}/investor/investments`, { headers: authHeaders() }),
        fetch(`${API_BASE}/investor/transactions`, { headers: authHeaders() }),
        fetch(`${API_BASE}/investor/notifications`, { headers: authHeaders() }),
      ]);

      if (!profileRes.ok || !invRes.ok || !txRes.ok || !notificationRes.ok) {
        // Token may be expired — clear session
        if (profileRes.status === 401) {
          localStorage.removeItem("ff_token");
        }
        return;
      }

      const profile = await profileRes.json();
      const investments = await invRes.json();
      const txs = await txRes.json();
      const notices = await notificationRes.json();

      setUser({
        name: profile.name,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
        balance: profile.balance,
        totalInvested: profile.totalInvested,
        totalEarned: profile.totalEarned,
        referralCode: profile.referralCode,
        referralCount: profile.referralCount ?? 0,
        referralEarnings: profile.referralEarnings ?? 0,
      });

      setActiveInvestments(
        investments.map((inv: any) => ({
          id: inv._id,
          packageId: inv.packageId,
          packageName: inv.packageName,
          cycle: inv.cycle,
          rate: inv.rate,
          duration: inv.duration,
          durationSpent: inv.durationSpent,
          amount: inv.amount,
          accumulatedYield: inv.accumulatedYield,
          status: inv.status,
          daysSinceLastPayout: inv.daysSinceLastPayout,
          createdAt: new Date(inv.createdAt).toLocaleDateString(),
        }))
      );

      setTransactions(
        txs.map((tx: any) => ({
          id: tx._id,
          type: tx.type,
          status: tx.status ?? "completed",
          amount: tx.amount,
          description: tx.description,
          timestamp: new Date(tx.timestamp).toLocaleDateString(),
        }))
      );

      setNotifications(
        notices.map((notice: any) => ({
          id: notice._id,
          title: notice.title,
          rawMessage: notice.message,
          message: formatNotificationMessage(notice.message),
          type: notice.type,
          read: notice.read,
          createdAt: new Date(notice.createdAt).toLocaleDateString(),
        }))
      );
    } catch (e) {
      console.error("Failed to sync user data:", e);
    }
  }, [formatNotificationMessage]);

  // ── Restore session on mount from stored JWT ────────────────────────────────
  useEffect(() => {
    syncPlatform();
  }, [syncPlatform]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoaded(true);
      return;
    }

    // Validate token by hitting /auth/me
    fetch(`${API_BASE}/auth/me`, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("Token invalid");
        return res.json();
      })
      .then(async (profile) => {
        setUser({
          name: profile.name,
          email: profile.email,
          phoneNumber: profile.phoneNumber,
          balance: profile.balance,
          totalInvested: profile.totalInvested,
          totalEarned: profile.totalEarned,
          referralCode: profile.referralCode,
          referralCount: profile.referralCount ?? 0,
          referralEarnings: profile.referralEarnings ?? 0,
        });
        await syncData();
      })
      .catch(() => {
        localStorage.removeItem("ff_token");
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, [syncData]);

  // ── Called by auth page after successful login / register ──────────────────
  const loginWithToken = async (token: string, profile: UserProfile) => {
    localStorage.setItem("ff_token", token);
    setUser(profile);
    await syncData();
  };

  const logout = () => {
    localStorage.removeItem("ff_token");
    setUser({ name: "", email: "", balance: 0, totalInvested: 0, totalEarned: 0 });
    setActiveInvestments([]);
    setTransactions([]);
    setNotifications([]);
  };

  const refreshData = async () => {
    await syncData();
  };

  // ── Investor actions ───────────────────────────────────────────────────────

  const deposit = async (
    amount: number,
    method: string,
    details?: { phoneNumber?: string },
  ): Promise<{ success: boolean; error?: string }> => {
    if (amount <= 0) return { success: false, error: "Amount must be positive." };
    try {
      const res = await fetch(`${API_BASE}/investor/deposit`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount, method, ...details }),
      });
      if (res.ok) {
        await syncData();
        return { success: true };
      }
      const errData = await res.json();
      return { success: false, error: errData.message || "Failed to process deposit." };
    } catch (e) {
      console.error(e);
      return { success: false, error: "Server connection failed." };
    }
  };

  const withdraw = async (
    amount: number,
    address: string,
    method: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (amount <= 0) return { success: false, error: "Amount must be positive." };
    if (user.balance < amount) return { success: false, error: "Insufficient balance." };
    if (!address.trim()) return { success: false, error: "Address details are required." };

    try {
      const res = await fetch(`${API_BASE}/investor/withdraw`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount, address, method }),
      });
      if (res.ok) {
        await syncData();
        return { success: true };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.message || "Failed to process withdrawal." };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: "Server connection failed." };
    }
  };

  const buyPackage = async (
    packageId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/investor/investments/buy`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ packageId, amount }),
      });
      if (res.ok) {
        await syncData();
        return { success: true };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.message || "Failed to buy package." };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: "Connection error." };
    }
  };

  return (
    <FutureFundContext.Provider
      value={{
        user,
        activeInvestments,
        transactions,
        notifications,
        investmentPackages,
        platformSettings,
        isPlatformLoaded,
        isLoaded,
        deposit,
        withdraw,
        buyPackage,
        refreshData,
        loginWithToken,
        logout,
      }}
    >
      {children}
    </FutureFundContext.Provider>
  );
}

export function useFutureFund() {
  const context = useContext(FutureFundContext);
  if (!context) {
    throw new Error("useFutureFund must be used within a FutureFundProvider");
  }
  return context;
}
