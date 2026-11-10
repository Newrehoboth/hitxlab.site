import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Music,
  GraduationCap,
  Users,
  Calendar,
  MapPin,
  Check,
  Award,
  Mic,
  Headphones,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  Clock,
  BookOpen,
  DollarSign,
  MessageSquare,
  Mail,
  Loader2,
  CheckCircle2,
  Phone,
  User as UserIcon,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CartDrawer } from "@/components/CartDrawer";
import { useAuth } from "@/lib/store";
import { submitAcademyApplicationFn } from "@/lib/email.functions";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: "Hitxlab Academy · Music Production Training" },
      { 
        name: "description", 
        content: "8-week music production program. Learn inside a real working studio. Turn your ideas into records." 
      },
    ],
  }),
  component: AcademyPage,
});

function AcademyPage() {
  const { user } = useAuth();
  const submitApp = useServerFn(submitAcademyApplicationFn);

  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    whatsappNumber: "",
    address: "",
  });

  const handleApplyClick = () => {
    if (user?.email && !form.email) {
      setForm((prev) => ({ ...prev, email: user.email }));
    }
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.whatsappNumber.trim() || !form.address.trim()) {
      alert("Please fill out all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await submitApp({
        data: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          whatsappNumber: form.whatsappNumber.trim(),
          address: form.address.trim(),
          amount: 850000,
          paymentStatus: "Pending",
        },
      });
      setShowModal(false);
      setSubmitted(true);
    } catch (err: any) {
      console.warn("Waitlist submit error:", err);
      // Still show success - email may have gone through
      setShowModal(false);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <Navbar />
      <CartDrawer />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-white/8 bg-gradient-to-b from-red-500/5 to-background px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-red-500">
                <GraduationCap className="h-4 w-4" />
                Hitxlab Academy
              </div>
              <h1 className="font-display text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
                Music Production.<br />
                Creativity. Industry.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground sm:text-2xl">
                Turn Your Ideas Into Records.
              </p>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Hitxlab Academy is a hands-on music production program created for aspiring 
                and developing producers who want to take their production seriously.
              </p>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
                Learn inside a real working studio, create music from scratch, develop your 
                own sound and gain practical knowledge from an experienced producer.
              </p>
              
              {/* Key Stats */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-500" />
                  <span>8 Weeks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-red-500" />
                  <span>6 Students Maximum</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-500" />
                  <span>Studio-Based Learning</span>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={handleApplyClick}
                  disabled={submitting}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-8 py-4 text-lg font-bold text-black shadow-xl transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                  Join the Waitlist
                </button>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-white/10 hover:border-white/30 active:scale-95"
                >
                  <MessageSquare className="h-5 w-5 text-red-500" />
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Why Hitxlab Section */}
        <section className="border-b border-white/8 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Why Hitxlab Academy?
              </h2>
            </div>

            <div className="mx-auto max-w-4xl space-y-6 text-lg leading-relaxed text-muted-foreground">
              <p>You can learn software anywhere.</p>
              <p>You can watch production tutorials online.</p>
              <p className="text-xl font-semibold text-foreground">
                But becoming a producer requires more than knowing where the buttons are.
              </p>
              <p>
                Hitxlab Academy is designed to give students practical experience creating 
                real music in a professional studio environment.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-4xl">
              <h3 className="mb-6 text-2xl font-bold">You will learn how to:</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Build beats from scratch",
                  "Develop melodies and chord progressions",
                  "Create arrangements",
                  "Work with samples",
                  "Produce Afrobeats, Afropiano and other contemporary sounds",
                  "Record and edit vocals",
                  "Develop your own production style",
                  "Understand mixing and sound selection",
                  "Work with artists",
                  "Finish complete records",
                  "Understand producer splits, publishing and royalties",
                  "Build a professional producer brand",
                  "Monetize your production skills",
                ].map((skill, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-red-500" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-xl font-semibold text-red-500">
                Most importantly, you will leave with music you actually created.
              </p>
            </div>
          </div>
        </section>

        {/* Program Curriculum */}
        <section className="border-b border-white/8 bg-surface/30 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-500">
                <BookOpen className="h-4 w-4" />
                The Program
              </div>
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                8-Week Music Production Program
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
                The program combines classroom teaching, practical studio sessions, 
                production exercises and real-world music-making.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Week Cards */}
              {weeks.map((week, i) => (
                <WeekCard key={i} week={week} />
              ))}
            </div>
          </div>
        </section>

        {/* What You Will Learn */}
        <section className="border-b border-white/8 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                What You Will Learn
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {learningAreas.map((area, i) => (
                <LearningCard key={i} area={area} />
              ))}
            </div>
          </div>
        </section>

        {/* Studio Section */}
        <section className="border-b border-white/8 bg-gradient-to-b from-red-500/5 to-background px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-red-500">
              <Sparkles className="h-4 w-4" />
              Real Studio Experience
            </div>
            <h2 className="font-display text-4xl font-bold sm:text-5xl">
              Learn Inside A Real Studio
            </h2>
            <div className="mt-8 space-y-4 text-lg leading-relaxed text-muted-foreground">
              <p>
                Hitxlab Academy takes place inside a working music production studio.
              </p>
              <p>
                This means you aren't learning production only through slides and demonstrations.
              </p>
              <p className="text-xl font-semibold text-foreground">
                You will be making music.
              </p>
            </div>
            <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
              {[
                "Work on real sessions",
                "Hear professional production decisions",
                "Receive practical feedback",
                "Create in a professional environment",
              ].map((benefit, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-white/8 bg-surface/50 p-4">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <span className="font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Instructor */}
        <section className="border-b border-white/8 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-500">
                <Award className="h-4 w-4" />
                Your Instructor
              </div>
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Rexxie
              </h2>
            </div>

            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
              <p>
                Rexxie is a Nigerian music producer and DJ known for his work within 
                the Afrobeats and contemporary African music space.
              </p>
              <p>
                Through Hitxlab Academy, he brings his practical experience in music 
                production, recording, collaborations, studio sessions and the music 
                business directly into the classroom.
              </p>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
                <p className="text-xl font-bold text-red-500">The goal is simple:</p>
                <p className="mt-4 text-foreground">
                  Give the next generation of producers the knowledge, discipline and 
                  practical experience to create better music and build sustainable careers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Who Is This For */}
        <section className="border-b border-white/8 bg-surface/30 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Who Is This For?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Hitxlab Academy is designed for:
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-surface/50 p-8">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                  <Target className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="mb-3 text-2xl font-bold">Beginners</h3>
                <p className="text-muted-foreground">
                  People who are completely new to music production and want to learn 
                  from the ground up.
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-surface/50 p-8">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                  <TrendingUp className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="mb-3 text-2xl font-bold">Developing Producers</h3>
                <p className="text-muted-foreground">
                  Producers who already make beats but want to improve their creativity, 
                  sound, arrangement and workflow.
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-surface/50 p-8">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                  <Award className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="mb-3 text-2xl font-bold">Aspiring Professionals</h3>
                <p className="text-muted-foreground">
                  Producers who want to understand how to work with artists and move 
                  from making beats to creating professional records.
                </p>
              </div>
            </div>

            {/* Who This Is NOT For */}
            <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-white/8 bg-surface/50 p-8">
              <h3 className="mb-4 text-2xl font-bold">Who This Is NOT For</h3>
              <p className="mb-6 text-muted-foreground">
                This program is not designed for people looking for a quick shortcut.
              </p>
              <p className="mb-4 font-semibold">You should be prepared to:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Practice outside class",
                  "Create music regularly",
                  "Accept feedback",
                  "Complete assignments",
                  "Collaborate",
                  "Experiment",
                  "Improve continuously",
                ].map((requirement, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <span>{requirement}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-red-500">
                Your progress depends on what you do with what you learn.
              </p>
            </div>
          </div>
        </section>

        {/* Cohort Structure */}
        <section className="border-b border-white/8 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Cohort Structure
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Calendar, label: "Duration", value: "8 Weeks" },
                { icon: Clock, label: "Classes", value: "2 Sessions Per Week" },
                { icon: Clock, label: "Class Duration", value: "2–2.5 Hours" },
                { icon: MapPin, label: "Location", value: "Hitxlab Studio" },
                { icon: Users, label: "Class Size", value: "Maximum 6 Students" },
                { icon: Target, label: "Level", value: "Beginner to Intermediate" },
              ].map((item, i) => (
                <div key={i} className="rounded-xl border border-white/8 bg-surface/50 p-6 text-center">
                  <item.icon className="mx-auto mb-3 h-8 w-8 text-red-500" />
                  <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-2 text-lg font-bold">{item.value}</div>
                </div>
              ))}
            </div>

            {/* What You Receive */}
            <div className="mt-12 rounded-2xl border border-white/8 bg-surface/50 p-8">
              <h3 className="mb-6 text-center text-2xl font-bold">What You Receive</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "8 weeks of practical training",
                  "16 studio-based classes",
                  "Direct instruction from Rexxie",
                  "Production exercises",
                  "Practical assignments",
                  "Feedback on your work",
                  "Studio production experience",
                  "Music business education",
                  "Final production project",
                  "Certificate of completion",
                  "Access to selected academy resources",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Investment */}
        <section id="apply" className="border-b border-white/8 bg-gradient-to-b from-red-500/5 to-background px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-500">
                <DollarSign className="h-4 w-4" />
                Investment
              </div>
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Founding Cohort
              </h2>
            </div>

            <div className="mt-12 rounded-3xl border-2 border-red-500/20 bg-surface/80 p-10 text-center">
              <div className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Program Fee
              </div>
              <div className="font-display text-6xl font-bold text-red-500">₦850,000</div>
              <p className="mt-6 text-muted-foreground">
                Payment plans may be available for selected students.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                The standard program fee will be reviewed after the founding cohort.
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500">
                <Users className="h-4 w-4" />
                Only 6 Seats Available
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={handleApplyClick}
                  disabled={submitting}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-8 py-4 text-lg font-bold text-black shadow-xl transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                  Join the Waitlist
                </button>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-white/10 hover:border-white/30 active:scale-95"
                >
                  <MessageSquare className="h-5 w-5 text-red-500" />
                  Contact Us
                </button>
              </div>
            </div>

            {/* Why Limited Seats */}
            <div className="mt-12 rounded-2xl border border-white/8 bg-surface/50 p-8">
              <h3 className="mb-4 text-center text-2xl font-bold">
                Only 6 Students Per Cohort
              </h3>
              <p className="mb-6 text-center text-muted-foreground">
                We intentionally keep the academy small.
              </p>
              <p className="mb-4 text-center font-semibold">A smaller class allows for:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "More individual attention",
                  "More practical studio time",
                  "Better feedback",
                  "More interaction",
                  "More opportunities to work directly with the instructor",
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center text-sm text-red-500">
                Once the six seats are filled, applications close.
              </p>
            </div>
          </div>
        </section>

        {/* Application Process */}
        <section id="application" className="border-b border-white/8 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Application Process
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              {applicationSteps.map((step, i) => (
                <div key={i} className="relative">
                  <div className="rounded-xl border border-white/8 bg-surface/50 p-6 text-center">
                    <div className="mb-4 text-2xl font-bold text-red-500">
                      Step {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed">{step}</p>
                  </div>
                  {i < applicationSteps.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-red-500/30 lg:block" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-2xl border border-white/8 bg-surface/50 p-8 text-center">
              <p className="text-muted-foreground">
                Applications are not automatically accepted simply because the form is submitted.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-white/8 bg-surface/30 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-6">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-xl border border-white/8 bg-surface/50 p-6">
                  <h3 className="mb-3 text-lg font-bold">{faq.question}</h3>
                  <p className="leading-relaxed text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-b from-red-500/5 to-background px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-red-500">
              <GraduationCap className="h-4 w-4" />
              Hitxlab Academy
            </div>
            <h2 className="font-display text-4xl font-bold sm:text-5xl">
              Don't Just Make Beats.<br />
              Learn How To Make Records.
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-lg font-semibold">
              <span>6 Students.</span>
              <span className="text-red-500">•</span>
              <span>8 Weeks.</span>
              <span className="text-red-500">•</span>
              <span>Real Studio Experience.</span>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleApplyClick}
                disabled={applying}
                className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-8 py-4 text-lg font-bold text-black shadow-xl transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                Apply for the Next Cohort
              </button>
              <button
                onClick={() => setShowContactModal(true)}
                className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-white/10 hover:border-white/30 active:scale-95"
              >
                <MessageSquare className="h-5 w-5 text-red-500" />
                Contact Us
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Waitlist Modal */}
                    placeholder="e.g. +234 801 234 5678"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-muted-foreground focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Residential Address <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    required
                    rows={2}
                    value={appForm.address}
                    onChange={(e) => setAppForm({ ...appForm, address: e.target.value })}
                    placeholder="Enter your home or residential address"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-muted-foreground focus:border-red-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={applying}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] py-3.5 text-base font-bold text-black shadow-xl transition hover:brightness-110 disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                Submit & Proceed to Pay ₦850,000
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Waitlist Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-500">
              <GraduationCap className="h-3.5 w-3.5" /> Academy Waitlist
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold text-white">Join the Waitlist</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit your details and we'll reach out when a spot opens up.
            </p>
            <form onSubmit={handleFormSubmit} className="mt-5 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input required type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your full name" className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-muted-foreground focus:border-red-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-muted-foreground focus:border-red-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input required type="tel" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="e.g. +234 801 234 5678" className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-muted-foreground focus:border-red-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Residential Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea required rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Your home or residential address" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-muted-foreground focus:border-red-500 focus:outline-none resize-none" />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] py-3.5 text-base font-bold text-black shadow-xl transition hover:brightness-110 disabled:opacity-50">
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                Submit & Join Waitlist
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-surface p-6 shadow-2xl text-center">
            <button onClick={() => setShowContactModal(false)} className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-500">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white">Contact Academy</h3>
            <p className="mt-2 text-sm text-muted-foreground">Have questions? Reach out directly:</p>
            <div className="mt-6">
              <a href="mailto:Hitxlabng@gmail.com?subject=Hitxlab%20Academy%20Inquiry" className="flex items-center justify-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-base font-bold text-white transition hover:bg-red-500/20">
                <Mail className="h-5 w-5 text-red-500" />
                Hitxlabng@gmail.com
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Waitlist submitted confirmation */}
      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-teal/30 bg-surface p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-teal/20 text-teal">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white">You're on the waitlist!</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              We've received your details. We'll reach out to you directly when a spot becomes available.
            </p>
            <button onClick={() => setSubmitted(false)} className="mt-6 w-full rounded-xl bg-teal py-3 text-sm font-bold text-black transition hover:brightness-110">
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Week Card Component
function WeekCard({ week }: { week: typeof weeks[0] }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-surface/50 p-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
          <week.icon className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Week {week.number}
          </div>
          <h3 className="text-xl font-bold">{week.title}</h3>
        </div>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {week.topics.map((topic, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-500" />
            <span>{topic}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Learning Card Component
function LearningCard({ area }: { area: typeof learningAreas[0] }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-surface/50 p-8 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
        <area.icon className="h-7 w-7 text-red-500" />
      </div>
      <h3 className="mb-3 text-xl font-bold">{area.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{area.description}</p>
    </div>
  );
}

// Data
const weeks = [
  {
    number: 1,
    title: "The Producer Foundation",
    icon: Music,
    topics: [
      "Understanding your DAW",
      "Setting up a professional production session",
      "MIDI and audio",
      "BPM and rhythm",
      "Drum programming",
      "Basic music theory",
      "Creating your first production",
    ],
  },
  {
    number: 2,
    title: "Melody, Chords & Music",
    icon: Headphones,
    topics: [
      "Scales",
      "Chord progressions",
      "Melodies",
      "Basslines",
      "Sound selection",
      "Sampling",
      "Building strong musical ideas",
    ],
  },
  {
    number: 3,
    title: "Beatmaking",
    icon: Target,
    topics: [
      "Afrobeats production",
      "Afropiano",
      "Percussion",
      "Groove",
      "Drum patterns",
      "Bass movement",
      "Creating a complete beat",
    ],
  },
  {
    number: 4,
    title: "From Beat to Song",
    icon: TrendingUp,
    topics: [
      "Song structure",
      "Intro, verse, chorus and bridge",
      "Arrangement",
      "Transitions",
      "Dynamics",
      "Working with artists",
      "Turning an idea into a complete record",
    ],
  },
  {
    number: 5,
    title: "Recording & Vocal Production",
    icon: Mic,
    topics: [
      "Studio setup",
      "Microphone techniques",
      "Recording vocals",
      "Vocal arrangement",
      "Editing",
      "Comping",
      "Vocal production",
    ],
  },
  {
    number: 6,
    title: "Mixing & Finishing Records",
    icon: Headphones,
    topics: [
      "EQ",
      "Compression",
      "Reverb",
      "Delay",
      "Automation",
      "Stereo image",
      "Vocal processing",
      "Creating space",
      "Preparing a professional mix",
    ],
  },
  {
    number: 7,
    title: "The Producer Business",
    icon: DollarSign,
    topics: [
      "Producer agreements",
      "Splits",
      "Publishing",
      "Royalties",
      "Master rights",
      "Beat licensing",
      "Credits and metadata",
      "Working with artists",
      "Pricing your production",
      "Building relationships",
      "Branding and social media",
    ],
  },
  {
    number: 8,
    title: "The Final Record",
    icon: Award,
    topics: [
      "Students apply everything they have learned to create and complete an original record.",
      "Production → Arrangement → Recording → Editing → Mixing → Final Export",
      "Students present their completed work during the final studio session.",
    ],
  },
];

const learningAreas = [
  {
    icon: Music,
    title: "Production",
    description: "Learn the creative and technical foundations of modern music production.",
  },
  {
    icon: Target,
    title: "Songmaking",
    description: "Learn how to turn loops and ideas into complete records.",
  },
  {
    icon: Headphones,
    title: "Sound",
    description: "Understand sound selection, drums, melodies, basslines, samples and textures.",
  },
  {
    icon: Mic,
    title: "Recording",
    description: "Learn how to record and produce vocals in a professional studio environment.",
  },
  {
    icon: Sparkles,
    title: "Mixing",
    description: "Understand the fundamentals of making your production sound clean, balanced and professional.",
  },
  {
    icon: DollarSign,
    title: "Industry",
    description: "Understand the business side of being a producer, including splits, publishing, royalties, credits and collaborations.",
  },
];

const applicationSteps = [
  "Complete the application form.",
  "Tell us about your current experience and what you want to achieve.",
  "Your application is reviewed.",
  "Selected applicants receive admission and payment instructions.",
  "Secure your place and prepare for the cohort.",
];

const faqs = [
  {
    question: "Do I need previous production experience?",
    answer: "No. The foundation program is designed to accommodate beginners.",
  },
  {
    question: "Which DAW do I need?",
    answer: "You should have access to a DAW such as FL Studio, Logic Pro, Ableton Live or another supported music-production platform.",
  },
  {
    question: "Do I need my own laptop?",
    answer: "Having your own laptop is strongly recommended because production practice outside class is an important part of the program.",
  },
  {
    question: "Will I receive one-on-one training?",
    answer: "The program is cohort-based, but students receive individual feedback and practical guidance throughout the program.",
  },
  {
    question: "How many students are in each class?",
    answer: "A maximum of six students.",
  },
  {
    question: "Where does the program take place?",
    answer: "All physical classes take place at Hitxlab Studio.",
  },
  {
    question: "Is accommodation provided?",
    answer: "No. Hitxlab Academy is a studio-based program and does not include accommodation or residential services.",
  },
  {
    question: "Are meals included?",
    answer: "No.",
  },
  {
    question: "Can I join if I already know how to make beats?",
    answer: "Yes. The program includes intermediate production development, arrangement, recording, mixing, industry knowledge and professional workflow.",
  },
  {
    question: "Will I get a certificate?",
    answer: "Yes. Students who complete the program and final project receive a Hitxlab Academy certificate of completion.",
  },
  {
    question: "Can I pay in installments?",
    answer: "Payment-plan availability will be stated for each cohort.",
  },
];
