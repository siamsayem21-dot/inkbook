import { MessageCircle, Bot, Users, FileText, CreditCard, CheckCircle2 } from "lucide-react";

const steps = [
  {
    n: "01",
    Icon: MessageCircle,
    title: "Instagram Inquiry",
    body: "Client sends a DM or submits a request form. AI captures it immediately — no manual follow-up needed.",
    iconClass: "text-pink-400",
    borderClass: "border-pink-500/20",
    bgClass: "bg-pink-500/[0.07]",
  },
  {
    n: "02",
    Icon: Bot,
    title: "AI Consultation",
    body: "AI collects style, placement, size, budget, and reference images. Delivers a structured lead to your artist.",
    iconClass: "text-gold",
    borderClass: "border-gold/20",
    bgClass: "bg-gold/[0.07]",
  },
  {
    n: "03",
    Icon: Users,
    title: "Artist Match",
    body: "InkBook routes the qualified lead to the best-matched available artist based on style, portfolio, and schedule.",
    iconClass: "text-blue-400",
    borderClass: "border-blue-500/20",
    bgClass: "bg-blue-500/[0.07]",
  },
  {
    n: "04",
    Icon: FileText,
    title: "Quote Sent",
    body: "Artist reviews the AI summary and sends a quote with one click. No DM threads. No guesswork.",
    iconClass: "text-purple-400",
    borderClass: "border-purple-500/20",
    bgClass: "bg-purple-500/[0.07]",
  },
  {
    n: "05",
    Icon: CreditCard,
    title: "Deposit Collected",
    body: "Client pays the mandatory deposit via Stripe. Auto-kept on no-shows. No exceptions, ever.",
    iconClass: "text-green-400",
    borderClass: "border-green-500/20",
    bgClass: "bg-green-500/[0.07]",
  },
  {
    n: "06",
    Icon: CheckCircle2,
    title: "Booking Confirmed",
    body: "Consent form signed digitally. SMS reminders scheduled. You show up and tattoo. Done.",
    iconClass: "text-red-400",
    borderClass: "border-red-500/20",
    bgClass: "bg-red-500/[0.07]",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-16">
          <p className="label-xs text-gold/70 mb-4">The InkBook Workflow</p>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide mb-4">
            From Instagram DM to confirmed booking.
          </h2>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Six steps. Fully automated. You focus on tattooing — InkBook handles everything else.
          </p>
        </div>

        {/* Desktop: horizontal flow with connectors */}
        <div className="hidden lg:flex items-start">
          {steps.map((step, i) => (
            <div key={step.n} className="flex items-start flex-1 min-w-0">
              <div className="flex-1 text-center px-2">
                <div className="font-cinzel text-2xl font-bold text-zinc-800 mb-3">{step.n}</div>
                <div className={`w-11 h-11 ${step.bgClass} border ${step.borderClass} flex items-center justify-center mx-auto mb-4`}>
                  <step.Icon className={`w-5 h-5 ${step.iconClass}`} />
                </div>
                <h3 className="font-cinzel font-bold text-[11px] tracking-wide mb-2 text-white">{step.title}</h3>
                <p className="text-zinc-600 text-xs leading-relaxed">{step.body}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex items-center justify-center pt-8 shrink-0 w-5 mt-1">
                  <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                    <path d="M0 4H12M9 1l3 3-3 3" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="lg:hidden space-y-0">
          {steps.map((step, i) => (
            <div key={step.n} className="relative flex gap-5">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-10 h-10 ${step.bgClass} border ${step.borderClass} flex items-center justify-center z-10`}>
                  <step.Icon className={`w-4 h-4 ${step.iconClass}`} />
                </div>
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 bg-white/[0.06] my-1" />
                )}
              </div>
              <div className="pb-8 flex-1">
                <div className="font-cinzel text-xs text-zinc-700 mb-1">{step.n}</div>
                <h3 className="font-cinzel font-bold text-sm tracking-wide mb-1.5 text-white">{step.title}</h3>
                <p className="text-zinc-600 text-sm leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
