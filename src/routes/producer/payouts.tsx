import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Wallet,
  Banknote,
  TrendingUp,
  ArrowDownToLine,
  Loader2,
  Landmark,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Search,
  Zap,
  ShieldCheck,
  X,
} from "lucide-react";
import { ProducerLayout } from "@/components/ProducerLayout";
import { fmtNaira } from "@/lib/currency";
import { useAuth } from "@/lib/store";
import {
  getWalletFn,
  requestWithdrawalFn,
  listBanksFn,
  resolveAccountNameFn,
  connectSubaccountFn,
  getSubaccountStatusFn,
} from "@/lib/payouts.functions";

export const Route = createFileRoute("/producer/payouts")({
  head: () => ({
    meta: [
      { title: "Earnings & Payouts — Producer Studio" },
      {
        name: "description",
        content:
          "Connect your bank account to receive automatic 90% split payouts on every beat sale.",
      },
      { property: "og:title", content: "Earnings & Payouts — Producer Studio" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PayoutsPage,
});

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-red-500/10 text-red-500",
  processing: "bg-teal/10 text-teal",
  paid: "bg-teal/15 text-teal",
  failed: "bg-crimson/10 text-crimson",
  reversed: "bg-crimson/10 text-crimson",
};

type Bank = { id: number; name: string; code: string; slug: string };

function BankDropdown({
  banks,
  value,
  onChange,
}: {
  banks: Bank[];
  value: Bank | null;
  onChange: (b: Bank) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = banks.filter((b) =>
    b.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-background px-3 text-sm outline-none focus:border-red-500/40 hover:border-white/20"
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value ? value.name : "Select your bank…"}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-12 z-50 flex max-h-72 flex-col overflow-hidden rounded-xl border border-white/10 bg-[oklch(0.13_0.01_264)] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search banks…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {q && (
                <button onClick={() => setQ("")}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No banks found</p>
              ) : (
                filtered.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { onChange(b); setOpen(false); setQ(""); }}
                    className={`flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-white/5 ${value?.code === b.code ? "text-red-500" : ""}`}
                  >
                    {b.name}
                    {value?.code === b.code && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-red-500" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PayoutsPage() {
  const { user } = useAuth();
  const loadWallet = useServerFn(getWalletFn);
  const withdraw = useServerFn(requestWithdrawalFn);
  const listBanks = useServerFn(listBanksFn);
  const resolveAcct = useServerFn(resolveAccountNameFn);
  const connectSubaccount = useServerFn(connectSubaccountFn);
  const getStatus = useServerFn(getSubaccountStatusFn);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");

  // Subaccount state
  const [subStatus, setSubStatus] = useState<{
    connected: boolean;
    subaccountCode: string | null;
    bankName: string | null;
    accountNumber: string | null;
    accountName: string | null;
  } | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [connectErr, setConnectErr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [res, status, bankList] = await Promise.all([
        loadWallet(undefined as never),
        getStatus(undefined as never),
        listBanks(undefined as never),
      ]);
      setData(res);
      setSubStatus(status);
      setBanks(bankList as Bank[]);
    } catch (e: any) {
      setErr(e?.message ?? "Could not load wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, []);

  // Auto-resolve account name when both bank + 10-digit number are filled
  useEffect(() => {
    if (!selectedBank || accountNumber.length !== 10) {
      setResolvedName(null);
      return;
    }
    setResolving(true);
    setResolvedName(null);
    setConnectErr(null);
    const t = setTimeout(async () => {
      try {
        const res = await resolveAcct({ data: { accountNumber, bankCode: selectedBank.code } });
        setResolvedName(res.accountName);
      } catch {
        setResolvedName(null);
      } finally {
        setResolving(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [selectedBank, accountNumber]);

  const onConnect = async () => {
    setConnectErr(null);
    setConnectMsg(null);
    if (!selectedBank) return setConnectErr("Please select your bank");
    if (accountNumber.length !== 10) return setConnectErr("Account number must be 10 digits");
    if (!resolvedName) return setConnectErr("We couldn't verify your account. Check the details and try again.");
    setConnecting(true);
    try {
      console.log("[onConnect] Calling connectSubaccount with:", {
        bankCode: selectedBank.code,
        accountNumber,
        businessName: resolvedName,
      });
      const result = await connectSubaccount({
        data: {
          bankCode: selectedBank.code,
          accountNumber,
          businessName: resolvedName || (user?.email ?? "Producer"),
        },
      });
      console.log("[onConnect] Success! Result:", result);
      setConnectMsg(`✅ Connected! Your subaccount: ${result.subaccountCode}`);
      await refresh();
    } catch (e: any) {
      console.error("[onConnect] Error occurred:", e);
      console.error("[onConnect] Error message:", e?.message);
      console.error("[onConnect] Full error:", JSON.stringify(e, null, 2));
      setConnectErr(e?.message ?? "Connection failed. Try again.");
    } finally {
      setConnecting(false);
    }
  };

  const onWithdraw = async () => {
    setErr(null);
    setMsg(null);
    const value = Number(amount);
    if (!value || value <= 0) return setErr("Enter a valid amount");
    setBusy(true);
    try {
      const res = await withdraw({ data: { amount: value } });
      setMsg(`Withdrawal requested · ${res.reference}`);
      setAmount("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  };

  const w = data?.wallet;

  return (
    <ProducerLayout active="Earnings">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Earnings & Payouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You keep <span className="font-semibold text-red-500">90%</span> of every sale. The platform commission is 10% of the gross price.
          </p>
        </header>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Wallet stat cards ── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Available balance", value: w?.available_balance, icon: Wallet, accent: "text-red-500" },
                { label: "Pending earnings", value: w?.pending_balance, icon: Loader2, accent: "text-teal" },
                { label: "Lifetime earnings", value: w?.lifetime_earnings, icon: TrendingUp, accent: "text-teal" },
                { label: "Total withdrawn", value: w?.total_withdrawn, icon: ArrowDownToLine, accent: "text-muted-foreground" },
              ].map((c) => (
                <div key={c.label} className="rounded-2xl border border-white/8 bg-surface/50 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <c.icon className={`h-3.5 w-3.5 ${c.accent}`} /> {c.label}
                  </div>
                  <div className="mt-2 font-display text-xl font-bold sm:text-2xl">
                    {fmtNaira(Number(c.value ?? 0))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Sales stats ── */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                { label: "Sales today", value: data?.stats?.salesToday ?? 0 },
                { label: "Sales this month", value: data?.stats?.salesThisMonth ?? 0 },
                { label: "Total sales", value: data?.stats?.totalSales ?? 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/8 bg-surface/30 p-4">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="mt-1 font-display text-lg font-bold">{s.value}</div>
                </div>
              ))}
            </div>

            {/* ── Connect Payout Account (Subaccount) ── */}
            <section className="mt-6 rounded-2xl border border-white/8 bg-surface/40 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-base font-bold">
                    <Zap className="h-4 w-4 text-red-500" /> Auto-Split Payout Account
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Connect your bank account once. Every sale will automatically send{" "}
                    <span className="font-semibold text-red-500">90%</span> directly to your bank — no manual withdrawals needed.
                  </p>
                </div>
                {subStatus?.connected ? (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[11px] font-bold uppercase text-teal">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" /> Not Connected
                  </span>
                )}
              </div>

              {subStatus?.connected ? (
                /* ── Already connected — show info ── */
                <div className="mt-4 rounded-xl border border-teal/20 bg-teal/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold">{subStatus.accountName}</div>
                      <div className="text-xs text-muted-foreground">
                        {subStatus.bankName} · ****{subStatus.accountNumber?.slice(-4)}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-teal">
                        {subStatus.subaccountCode}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg border border-teal/15 bg-teal/5 px-3 py-2 text-teal">
                      <div className="font-bold">90%</div>
                      <div className="text-teal/70">Auto-paid to you</div>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-muted-foreground">
                      <div className="font-bold text-foreground">10%</div>
                      <div>Platform commission</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    To update your bank account, contact support or re-connect below.
                  </p>
                  {/* Allow re-connection */}
                  <button
                    className="mt-2 text-[11px] text-red-500 underline underline-offset-2 hover:no-underline"
                    onClick={() => setSubStatus({ ...subStatus, connected: false })}
                  >
                    Change bank account
                  </button>
                </div>
              ) : (
                /* ── Not connected — onboarding form ── */
                <div className="mt-4 flex flex-col gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      1. Select your bank
                    </label>
                    <BankDropdown
                      banks={banks}
                      value={selectedBank}
                      onChange={(b) => { setSelectedBank(b); setResolvedName(null); }}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      2. Enter your 10-digit account number
                    </label>
                    <div className="relative">
                      <input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="0000000000"
                        inputMode="numeric"
                        maxLength={10}
                        className="h-11 w-full rounded-xl border border-white/10 bg-background px-3 text-sm outline-none focus:border-red-500/40 pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {resolving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {!resolving && resolvedName && <CheckCircle2 className="h-4 w-4 text-teal" />}
                      </div>
                    </div>
                  </div>

                  {/* Account name verification */}
                  {resolvedName && (
                    <div className="flex items-center gap-2 rounded-xl border border-teal/20 bg-teal/5 px-3 py-2.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                      <div>
                        <div className="text-xs text-muted-foreground">Account verified as:</div>
                        <div className="font-semibold text-sm">{resolvedName}</div>
                      </div>
                    </div>
                  )}

                  {connectErr && (
                    <div className="flex items-center gap-2 rounded-xl border border-crimson/30 bg-crimson/10 px-3 py-2.5 text-xs text-crimson">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {connectErr}
                    </div>
                  )}
                  {connectMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/10 px-3 py-2.5 text-xs text-teal">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {connectMsg}
                    </div>
                  )}

                  <button
                    onClick={onConnect}
                    disabled={connecting || !resolvedName}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] font-semibold text-black shadow-[0_10px_30px_-8px_oklch(0.7_0.17_55/0.5)] transition hover:brightness-105 disabled:opacity-50"
                  >
                    {connecting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
                    ) : (
                      <><Zap className="h-4 w-4" /> Connect Bank & Enable Auto-Payouts</>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal" />
                    Powered by Paystack · Bank-verified · Instant splits
                  </div>
                </div>
              )}
            </section>

            {/* ── Wallet withdrawal (Mode 2 fallback) ── */}
            {!subStatus?.connected && (
              <section className="mt-4 rounded-2xl border border-white/8 bg-surface/40 p-5">
                <h2 className="flex items-center gap-2 font-display text-base font-bold">
                  <Banknote className="h-4 w-4 text-red-500" /> Manual Withdrawal
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your wallet balance from sales before auto-split was enabled.
                  Available: {fmtNaira(Number(w?.available_balance ?? 0))}
                </p>

                {(err || msg) && (
                  <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${err ? "border-crimson/30 bg-crimson/10 text-crimson" : "border-teal/30 bg-teal/10 text-teal"}`}>
                    {err ?? msg}
                  </div>
                )}

                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="Amount (₦)"
                  inputMode="decimal"
                  className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-background px-3 text-sm outline-none focus:border-red-500/40"
                />
                <button
                  onClick={onWithdraw}
                  disabled={busy}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Request withdrawal
                </button>
              </section>
            )}

            {/* ── Transactions table ── */}
            <section className="mt-6 rounded-2xl border border-white/8 bg-surface/40 p-5">
              <h2 className="font-display text-base font-bold">Recent transactions</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Beat</th>
                      <th className="pb-2 font-medium">License</th>
                      <th className="pb-2 font-medium">Gross</th>
                      <th className="pb-2 font-medium">Commission</th>
                      <th className="pb-2 font-medium">You earned</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.transactions ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                          No sales yet.
                        </td>
                      </tr>
                    ) : (
                      (data?.transactions ?? []).map((t: any) => (
                        <tr key={t.id} className="border-t border-white/5">
                          <td className="py-2.5 pr-3">{t.beat_title}</td>
                          <td className="py-2.5 pr-3 text-muted-foreground">{t.license_name}</td>
                          <td className="py-2.5 pr-3">{fmtNaira(Number(t.gross_amount))}</td>
                          <td className="py-2.5 pr-3 text-muted-foreground">
                            −{fmtNaira(Number(t.platform_commission))}
                          </td>
                          <td className="py-2.5 pr-3 font-semibold text-red-500">
                            {fmtNaira(Number(t.producer_earnings))}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[t.payment_status] ?? "bg-white/5"}`}
                            >
                              {t.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Withdrawal history ── */}
            {(data?.withdrawals ?? []).length > 0 && (
              <section className="mt-4 rounded-2xl border border-white/8 bg-surface/40 p-5">
                <h2 className="font-display text-base font-bold">Withdrawal history</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {(data.withdrawals as any[]).map((wd) => (
                    <div
                      key={wd.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-background/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{fmtNaira(Number(wd.amount))}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {wd.reference} · {new Date(wd.requested_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[wd.status] ?? "bg-white/5"}`}>
                        {wd.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </ProducerLayout>
  );
}
