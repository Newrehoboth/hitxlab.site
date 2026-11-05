import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert, Download } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { fmtNaira } from "@/lib/currency";
import { adminOverviewFn, adminSettleWithdrawalFn } from "@/lib/payouts.functions";

export const Route = createFileRoute("/admin/payouts")({
  head: () => ({
    meta: [
      { title: "Marketplace Admin — Revenue & Payouts" },
      {
        name: "description",
        content:
          "Marketplace revenue, commission earned, producer payouts and withdrawal approvals.",
      },
      { property: "og:title", content: "Marketplace Admin — Revenue & Payouts" },
      {
        property: "og:description",
        content: "Commission reports, top producers and withdrawal management.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPayouts,
});

const ACTIONS: Record<string, Array<"processing" | "paid" | "failed" | "reversed">> = {
  pending: ["processing", "paid", "failed"],
  processing: ["paid", "failed"],
  failed: ["processing", "reversed"],
  paid: ["reversed"],
  reversed: [],
};

function AdminPayouts() {
  const load = useServerFn(adminOverviewFn);
  const settle = useServerFn(adminSettleWithdrawalFn);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setData(await load(undefined as never));
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Not authorised");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (id: string, status: "processing" | "paid" | "failed" | "reversed") => {
    setBusy(id);
    try {
      await settle({ data: { withdrawalId: id, status, note: null } });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["invoice", "beat", "gross", "commission", "producer_earnings", "status", "date"],
      ...data.recentTransactions.map((t: any) => [
        t.id,
        t.beat_title,
        t.gross_amount,
        t.platform_commission,
        t.producer_earnings,
        t.payment_status,
        t.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((c: any) => `"${String(c ?? "")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Marketplace admin</h1>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : err ? (
          <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-crimson/25 bg-crimson/5 p-10 text-center">
            <ShieldAlert className="h-7 w-7 text-crimson" />
            <p className="text-sm text-muted-foreground">
              You need an admin account to view marketplace finances.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Gross volume", fmtNaira(data.totals.grossVolume)],
                ["Commission earned", fmtNaira(data.totals.commissionEarned)],
                ["Producer payouts", fmtNaira(data.totals.producerPayouts)],
                ["Total sales", String(data.totals.totalSales)],
                ["Pending withdrawals", String(data.totals.pendingWithdrawals)],
                ["Pending amount", fmtNaira(data.totals.pendingWithdrawalAmount)],
                ["Failed withdrawals", String(data.totals.failedWithdrawals)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-surface/50 p-4">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 font-display text-xl font-bold">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-white/8 bg-surface/40 p-5">
                <h2 className="font-display text-base font-bold">Top producers</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {data.topProducers.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{p.name}</span>
                      <span className="font-semibold text-red-500">{fmtNaira(p.earnings)}</span>
                    </div>
                  ))}
                  {!data.topProducers.length && (
                    <p className="text-xs text-muted-foreground">No sales yet.</p>
                  )}
                </div>
              </section>
              <section className="rounded-2xl border border-white/8 bg-surface/40 p-5">
                <h2 className="font-display text-base font-bold">Top selling beats</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {data.topBeats.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{b.title}</span>
                      <span className="font-semibold">{fmtNaira(b.gross)}</span>
                    </div>
                  ))}
                  {!data.topBeats.length && (
                    <p className="text-xs text-muted-foreground">No sales yet.</p>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-4 rounded-2xl border border-white/8 bg-surface/40 p-5">
              <h2 className="font-display text-base font-bold">Withdrawal requests</h2>
              <div className="mt-3 flex flex-col gap-2">
                {data.withdrawals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No withdrawal requests.</p>
                ) : (
                  data.withdrawals.map((w: any) => (
                    <div
                      key={w.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-background/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{fmtNaira(Number(w.amount))}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {w.reference} · {w.bank_name} · {w.account_number} · {w.status}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(ACTIONS[w.status] ?? []).map((s) => (
                          <button
                            key={s}
                            disabled={busy === w.id}
                            onClick={() => act(w.id, s)}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold capitalize hover:bg-white/10 disabled:opacity-50"
                          >
                            {s === "processing" ? "Approve" : s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-white/8 bg-surface/40 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold">Payment log</h2>
                <button
                  onClick={exportCsv}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Beat</th>
                      <th className="pb-2 font-medium">Gross</th>
                      <th className="pb-2 font-medium">Commission</th>
                      <th className="pb-2 font-medium">Producer</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((t: any) => (
                      <tr key={t.id} className="border-t border-white/5">
                        <td className="py-2.5 pr-3">{t.beat_title}</td>
                        <td className="py-2.5 pr-3">{fmtNaira(Number(t.gross_amount))}</td>
                        <td className="py-2.5 pr-3 text-teal">
                          {fmtNaira(Number(t.platform_commission))}
                        </td>
                        <td className="py-2.5 pr-3">{fmtNaira(Number(t.producer_earnings))}</td>
                        <td className="py-2.5 text-xs uppercase">{t.payment_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
