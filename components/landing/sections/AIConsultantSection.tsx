import { Bot, ImageIcon, MapPin, Ruler, DollarSign, Sparkles } from "lucide-react";

const features = [
  { Icon: ImageIcon, label: "Reference image upload + style detection" },
  { Icon: MapPin, label: "Placement selection (forearm, back, chest, etc.)" },
  { Icon: Ruler, label: "Size estimation in inches" },
  { Icon: DollarSign, label: "Budget qualification before artist is involved" },
  { Icon: Sparkles, label: "AI summary delivered to the matched artist" },
  { Icon: Bot, label: "Zero artist time spent on unqualified leads" },
];

export default function AIConsultantSection() {
  return (
    <section id="ai-assistant" className="px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div>
            <p className="label-xs text-gold/70 mb-4">AI-Powered Intake</p>
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wide mb-5">
              Your AI books the consultation before you wake up.
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-10 max-w-md">
              InkBook&apos;s AI assistant handles every new inquiry end-to-end. It collects everything your artist needs — style, placement, references, budget — and delivers a structured lead, not a chaotic DM thread.
            </p>
            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-gold/[0.06] border border-gold/20 flex items-center justify-center shrink-0">
                    <f.Icon className="w-3 h-3 text-gold" />
                  </div>
                  <span className="text-zinc-400 text-sm">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: chat UI mockup */}
          <div className="relative">
            <div className="absolute -inset-6 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(201,168,76,0.05),transparent)] pointer-events-none" />
            <div className="relative bg-zinc-900/80 border border-white/[0.09] overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.07] bg-zinc-950/70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gold/10 border border-gold/25 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-gold" />
                  </div>
                  <span className="text-xs text-zinc-300 font-medium">InkBook AI Assistant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-zinc-600">Online</span>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-3">
                {/* Client */}
                <div className="flex justify-end">
                  <div className="bg-zinc-800 border border-white/[0.07] px-3 py-2 max-w-[76%]">
                    <p className="text-xs text-zinc-300">Hey, I want a wolf tattoo on my forearm. Blackwork style.</p>
                  </div>
                </div>

                {/* AI */}
                <div className="flex gap-2 items-start">
                  <div className="w-5 h-5 bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-2.5 h-2.5 text-gold" />
                  </div>
                  <div className="bg-zinc-900 border border-white/[0.06] px-3 py-2 max-w-[78%]">
                    <p className="text-xs text-zinc-400">
                      Great choice! I detected <span className="text-gold font-medium">Blackwork</span> style. Let me collect a few details to match you with the right artist.
                    </p>
                  </div>
                </div>

                {/* AI */}
                <div className="flex gap-2 items-start">
                  <div className="w-5 h-5 bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-2.5 h-2.5 text-gold" />
                  </div>
                  <div className="bg-zinc-900 border border-white/[0.06] px-3 py-2 max-w-[78%]">
                    <p className="text-xs text-zinc-400 mb-2">Do you have reference images? Drop them here.</p>
                    <div className="border border-dashed border-white/15 px-3 py-2 text-center">
                      <ImageIcon className="w-3.5 h-3.5 text-zinc-700 mx-auto mb-0.5" />
                      <p className="text-[10px] text-zinc-700">Drop image or click to upload</p>
                    </div>
                  </div>
                </div>

                {/* Client */}
                <div className="flex justify-end">
                  <div className="bg-zinc-800 border border-white/[0.07] px-3 py-2 max-w-[76%]">
                    <p className="text-xs text-zinc-300">Around 5–6 inches. Budget is $400–600.</p>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="bg-gold/[0.06] border border-gold/20 px-4 py-3">
                  <p className="text-[10px] text-gold uppercase tracking-widest mb-2.5 font-medium">AI Lead Summary — Sending to artist</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Blackwork", "Wolf", "Forearm", '5–6"', "$400–600", "✓ Qualified"].map((tag) => (
                      <span key={tag} className="text-[10px] bg-zinc-800 border border-white/[0.08] text-zinc-400 px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
