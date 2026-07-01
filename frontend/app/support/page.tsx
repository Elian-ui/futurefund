"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, LifeBuoy, MessageSquarePlus, Send } from "lucide-react";
import { useFutureFund } from "../context/useFutureFund";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type TicketStatus = "open" | "pending" | "resolved" | "closed";
type TicketPriority = "low" | "normal" | "high" | "urgent";
type TicketCategory = "account" | "deposit" | "withdrawal" | "investment" | "technical" | "other";

interface SupportMessage {
  authorRole: "investor" | "support" | "admin";
  body: string;
  createdAt: string;
}

interface SupportTicket {
  _id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  messages: SupportMessage[];
  lastActivityAt: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("ff_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function SupportPage() {
  const router = useRouter();
  const { user, isLoaded } = useFutureFund();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("account");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket._id === selectedId) ?? tickets[0],
    [tickets, selectedId],
  );

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/support/tickets`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Unable to load tickets");
      const data = await res.json();
      setTickets(data);
      if (!selectedId && data[0]?._id) setSelectedId(data[0]._id);
    } catch {
      setFeedback({ success: false, message: "Could not load support tickets." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!user.email) {
      router.push("/auth");
      return;
    }
    loadTickets();
  }, [isLoaded, user.email]);

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/support/tickets`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ subject, category, priority, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not create ticket");

      setSubject("");
      setMessage("");
      setPriority("normal");
      setCategory("account");
      setSelectedId(data._id);
      setFeedback({ success: true, message: "Support ticket opened." });
      await loadTickets();
    } catch (error: any) {
      setFeedback({ success: false, message: error.message || "Could not create ticket." });
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/support/tickets/${selectedTicket._id}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not send reply");
      setReply("");
      setFeedback({ success: true, message: "Reply sent." });
      await loadTickets();
      setSelectedId(selectedTicket._id);
    } catch (error: any) {
      setFeedback({ success: false, message: error.message || "Could not send reply." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded || !user.email) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 flex-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <LifeBuoy className="h-3.5 w-3.5" />
            Investor Support
          </div>
          <h2 className="mt-3 text-3xl font-extrabold text-white">Support Center</h2>
          <p className="mt-1 text-sm text-foreground/55">
            Open a case for deposits, withdrawals, investments, account access, or technical issues.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border p-4 text-sm font-semibold ${
            feedback.success
              ? "border-primary/20 bg-primary/10 text-accent"
              : "border-rose-500/20 bg-rose-500/10 text-rose-400"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form onSubmit={createTicket} className="glass-card rounded-3xl p-6 lg:col-span-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
              <MessageSquarePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Open New Ticket</h3>
              <p className="text-xs text-foreground/50">Include clear account and transaction details.</p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground/65">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-2xl border border-card-border bg-card/60 px-4 py-3 text-base font-semibold text-white outline-none focus:border-primary/50 sm:text-sm"
              placeholder="Example: Withdrawal has not arrived"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground/65">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full rounded-2xl border border-card-border bg-card/60 px-4 py-3 text-base font-semibold text-white outline-none focus:border-primary/50 sm:text-sm"
              >
                <option value="account">Account</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="investment">Investment</option>
                <option value="technical">Technical</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground/65">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full rounded-2xl border border-card-border bg-card/60 px-4 py-3 text-base font-semibold text-white outline-none focus:border-primary/50 sm:text-sm"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground/65">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-36 w-full rounded-2xl border border-card-border bg-card/60 px-4 py-3 text-base font-medium text-white outline-none focus:border-primary/50 sm:text-sm"
              placeholder="Describe the issue and include dates, amounts, wallet address, or transaction reference if relevant."
              required
            />
          </div>

          <button
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-background disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Open Ticket"}
            <ArrowRight className="h-4 w-4 text-background" />
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-base font-bold text-white">Your Tickets</h3>
            <p className="mt-1 text-xs text-foreground/50">
              Support replies appear inside the selected ticket thread.
            </p>

            {loading ? (
              <div className="mt-6 flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-card-border bg-card/35 p-6 text-center text-sm text-foreground/55">
                No tickets yet. Open your first case from the form.
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {tickets.map((ticket) => (
                  <button
                    key={ticket._id}
                    onClick={() => setSelectedId(ticket._id)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      selectedTicket?._id === ticket._id
                        ? "border-primary/45 bg-primary/10"
                        : "border-card-border bg-card/35 hover:bg-card/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{ticket.subject}</p>
                        <p className="mt-1 text-xs capitalize text-foreground/50">
                          {ticket.category} · {ticket.priority} priority
                        </p>
                      </div>
                      <span className="rounded-full border border-card-border bg-background px-2.5 py-1 text-[10px] font-bold uppercase text-primary">
                        {ticket.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTicket && (
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedTicket.subject}</h3>
                  <p className="mt-1 text-xs capitalize text-foreground/50">
                    {selectedTicket.status} · {selectedTicket.category} · {selectedTicket.priority}
                  </p>
                </div>
                <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
              </div>

              <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                {selectedTicket.messages.map((item, index) => (
                  <div
                    key={`${item.createdAt}-${index}`}
                    className={`rounded-2xl border p-4 ${
                      item.authorRole === "investor"
                        ? "border-card-border bg-card/45"
                        : "border-primary/20 bg-primary/10"
                    }`}
                  >
                    <div className="mb-2 flex justify-between gap-3 text-[10px] font-bold uppercase tracking-wider text-foreground/45">
                      <span>{item.authorRole === "investor" ? "You" : "Support"}</span>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/75">{item.body}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} className="space-y-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  disabled={selectedTicket.status === "closed"}
                  className="min-h-24 w-full rounded-2xl border border-card-border bg-card/60 px-4 py-3 text-base font-medium text-white outline-none focus:border-primary/50 disabled:opacity-50 sm:text-sm"
                  placeholder={
                    selectedTicket.status === "closed"
                      ? "Closed tickets cannot receive replies."
                      : "Reply to support..."
                  }
                  required
                />
                <button
                  disabled={submitting || selectedTicket.status === "closed"}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-background disabled:opacity-50"
                >
                  Send Reply
                  <Send className="h-4 w-4 text-background" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
