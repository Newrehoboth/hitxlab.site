import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Clock,
  CreditCard,
  Wallet,
  PieChart,
  AlertCircle,
  BadgeCheck,
  ChevronDown
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CartDrawer } from "@/components/CartDrawer";

export const Route = createFileRoute("/payouts")({
  head: () => ({
    meta: [
      { title: "How Payouts Work · HITXLAB" },
      { 
        name: "description", 
        content: "Transparent, fast payouts. Keep 90% of every sale. Automatic splits through Paystack." 
      },
    ],
  }),
  component: PayoutsPage,
});

function PayoutsPage() {
  return (
    <>
      <Navbar />
      <CartDrawer />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="border-b border-white/8 bg-gradient-to-b from-red-500/5 to-background px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-red-500">
              <DollarSign className="h-4 w-4" />
              Producer Payouts
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
              You keep <span className="text-red-500">90%</span> of every sale
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground">
              Fast, transparent, and automatic. We use Paystack to split payments instantly — 
              so you get paid the moment someone buys your beat.
            </p>
          </div>
        </section>

        {/* Revenue Split Breakdown */}
        <section className="border-b border-white/8 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                How Revenue Splits Work
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Simple, transparent pricing with no hidden fees
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Producer Gets */}
              <div className="rounded-3xl border-2 border-red-500/40 bg-gradient-to-br from-red-500/10 to-red-600/5 p-8">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
                  <TrendingUp className="h-7 w-7 text-red-500" />
                </div>
                <div className="mb-2 text-5xl font-bold text-red-500">90%</div>
                <h3 className="mb-3 text-xl font-bold">You Keep</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You receive 90% of every sale, paid directly to your connected bank account or mobile money wallet via Paystack.
                </p>
                <div className="mt-6 rounded-xl bg-black/20 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Example
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm">Beat sells for</span>
                    <span className="font-semibold">₦10,000</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-2">
                    <span className="text-sm font-semibold">You receive</span>
                    <span className="text-xl font-bold text-red-500">₦9,000</span>
                  </div>
                </div>
              </div>

              {/* Platform Fee */}
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-8">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                  <PieChart className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="mb-2 text-5xl font-bold">10%</div>
                <h3 className="mb-3 text-xl font-bold">Platform Fee</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Our 10% covers hosting, payment processing, file delivery, customer support, and platform development.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Unlimited bandwidth",
                    "Secure file storage",
                    "Automatic contract generation",
                    "Payment processing",
                    "24/7 platform uptime",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Paystack Fees */}
              <div className="rounded-3xl border border-white/10 bg-surface/50 p-8">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                  <CreditCard className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="mb-2 text-3xl font-bold">1.5% + ₦100</div>
                <h3 className="mb-3 text-xl font-bold">Payment Processing</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Paystack charges standard payment processing fees (deducted from your 90% automatically by Paystack).
                </p>
                <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-red-500">
                      Important
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    The Paystack fee is standard across Nigeria and is automatically deducted when they process payments to your account. This is not set by us.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Timeline */}
        <section className="border-b border-white/8 bg-surface/30 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                How Payment Splits Work
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Automatic revenue distribution through Paystack subaccounts
              </p>
            </div>

            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xl font-bold text-red-500">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-bold">Customer Purchases Your Beat</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    When someone buys your beat for ₦10,000, they pay through Paystack's secure checkout.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xl font-bold text-red-500">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-bold">Automatic Split Happens Instantly</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    Paystack automatically splits the payment using your connected subaccount:
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                      <div className="mb-1 text-sm font-semibold text-red-500">Your Account</div>
                      <div className="text-2xl font-bold">₦9,000</div>
                      <div className="mt-1 text-xs text-muted-foreground">90% of sale</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-1 text-sm font-semibold">Platform Account</div>
                      <div className="text-2xl font-bold">₦1,000</div>
                      <div className="mt-1 text-xs text-muted-foreground">10% platform fee</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xl font-bold text-red-500">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-bold">You Get Paid by Paystack</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    Paystack settles your earnings to your bank account or mobile money wallet on their standard settlement schedule (typically next business day for Nigerian banks).
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xl font-bold text-teal">
                  ✓
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-bold">Track Everything in Your Dashboard</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    View all your sales, earnings, and payout history in your producer dashboard. See exactly how much you've earned and when payments are coming.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Benefits */}
        <section className="border-b border-white/8 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Why Our Payout System Rocks
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <BenefitCard
                icon={Zap}
                title="Instant Splits"
                description="Money is split automatically the moment of purchase. No waiting, no manual processing, no delays."
              />
              <BenefitCard
                icon={Shield}
                title="Secure & Trusted"
                description="Powered by Paystack, one of Africa's most trusted payment platforms. Your money is always safe."
              />
              <BenefitCard
                icon={Clock}
                title="Fast Settlements"
                description="Paystack typically settles funds to your account within 1 business day for Nigerian banks."
              />
              <BenefitCard
                icon={Wallet}
                title="Direct to Your Account"
                description="No middleman holding your money. Funds go straight from Paystack to your connected bank or mobile money."
              />
              <BenefitCard
                icon={BadgeCheck}
                title="Transparent"
                description="See exactly how much you earn from each sale. No hidden fees, no surprises, just honest revenue sharing."
              />
              <BenefitCard
                icon={DollarSign}
                title="Keep More Money"
                description="At 90%, you keep one of the highest revenue shares in the industry. Most platforms take 30-50%."
              />
            </div>
          </div>
        </section>

        {/* Getting Started */}
        <section className="border-b border-white/8 bg-gradient-to-b from-red-500/5 to-background px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Ready to Start Earning?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Connect your Paystack account and start selling beats today. It takes less than 5 minutes to get set up.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="inline-flex h-14 items-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-8 text-lg font-bold text-black shadow-xl transition hover:brightness-110"
                >
                  Create Producer Account
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Setup Steps */}
            <div className="mt-16 rounded-3xl border border-white/10 bg-surface/50 p-8">
              <h3 className="mb-6 text-center text-2xl font-bold">Getting Set Up Is Easy</h3>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-xl font-bold text-red-500">
                    1
                  </div>
                  <h4 className="mb-2 font-semibold">Sign Up</h4>
                  <p className="text-sm text-muted-foreground">
                    Create your free producer account in seconds
                  </p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-xl font-bold text-red-500">
                    2
                  </div>
                  <h4 className="mb-2 font-semibold">Connect Paystack</h4>
                  <p className="text-sm text-muted-foreground">
                    Link your bank account via Paystack subaccount
                  </p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal/10 text-xl font-bold text-teal">
                    3
                  </div>
                  <h4 className="mb-2 font-semibold">Start Selling</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload beats and get paid automatically
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Common Questions
              </h2>
            </div>

            <div className="space-y-6">
              <FAQItem
                question="When do I get paid?"
                answer="Paystack automatically settles funds to your account based on their standard schedule. For Nigerian banks, this is typically T+1 (next business day). The exact timing depends on your bank and Paystack's settlement schedule."
              />
              <FAQItem
                question="Is there a minimum payout amount?"
                answer="No! You get paid for every single sale, no matter how small. There's no minimum threshold to reach before you can withdraw earnings."
              />
              <FAQItem
                question="What payment methods do you support?"
                answer="We use Paystack, which supports Nigerian bank accounts and mobile money wallets (MTN, Airtel, etc.). You can also receive payments via OPay and other digital wallets supported by Paystack."
              />
              <FAQItem
                question="Can I see my earnings in real-time?"
                answer="Yes! Your producer dashboard shows all sales, earnings, and payout history in real-time. You'll see exactly how much you've earned and when payments are scheduled."
              />
              <FAQItem
                question="What happens if a customer refunds?"
                answer="In the rare case of a refund, the full amount (including your 90% and our 10%) is refunded to the customer. We handle disputes fairly and transparently."
              />
              <FAQItem
                question="Are there any hidden fees?"
                answer="No hidden fees! You pay 10% platform fee + standard Paystack processing fees (1.5% + ₦100). That's it. Everything is transparent and shown upfront."
              />
              <FAQItem
                question="Do I need a Nigerian bank account?"
                answer="Yes, currently Paystack requires a Nigerian bank account or mobile money wallet. We're working on supporting international payments in the future."
              />
              <FAQItem
                question="Can I change my payout account?"
                answer="Yes, you can update your connected Paystack subaccount anytime from your producer settings. Changes take effect immediately for future sales."
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function BenefitCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-surface/50 p-6">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <Icon className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-surface/50 transition-colors hover:border-white/15">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 p-6 text-left transition-colors hover:bg-white/5"
      >
        <h3 className="text-lg font-bold">{question}</h3>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-red-500 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/8 px-6 pb-6 pt-4">
            <p className="leading-relaxed text-muted-foreground">{answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
