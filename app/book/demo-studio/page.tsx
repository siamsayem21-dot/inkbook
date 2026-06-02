"use client";

import { useState } from "react";
import Link from "next/link";
import AvailabilityCalendar from "@/components/booking/AvailabilityCalendar";

// ─── Static demo data ─────────────────────────────────────────────────────────

const ARTISTS = [
  {
    id: "marcus",
    initial: "M",
    name: "Marcus T.",
    rate: 180,
    deposit: 100,
    styles: ["Traditional", "Neo-Traditional", "American Classic"],
    bio: "Traditional and neo-traditional specialist with 8 years of experience. Bold lines, vibrant color work, and zero tolerance for wishy-washy reference images.",
  },
  {
    id: "leila",
    initial: "L",
    name: "Leila S.",
    rate: 150,
    deposit: 75,
    styles: ["Fine Line", "Minimalist", "Geometric"],
    bio: "Fine line and minimalist work — botanical patterns, geometric forms, and delicate portraiture. If you want something that looks like a photograph, call someone else.",
  },
  {
    id: "jonah",
    initial: "J",
    name: "Jonah K.",
    rate: 200,
    deposit: 100,
    styles: ["Japanese", "Blackwork", "Irezumi"],
    bio: "Japanese and blackwork with a modern sensibility. Known for full back pieces and sleeves. Minimum 3-hour sessions. No walk-ins.",
  },
] as const;

const TIME_SLOTS = [
  { time: "10:00 AM", available: true },
  { time: "11:00 AM", available: false },
  { time: "12:00 PM", available: true },
  { time: "1:00 PM",  available: false },
  { time: "2:00 PM",  available: true },
  { time: "3:00 PM",  available: true },
  { time: "4:00 PM",  available: false },
  { time: "5:00 PM",  available: true },
];

type Artist = (typeof ARTISTS)[number];

// ─── Demo modal ───────────────────────────────────────────────────────────────

function DemoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors text-lg leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-5">
          <span className="text-gold text-xl">🔒</span>
        </div>

        <h2 className="text-xl font-bold mb-2">This is a demo</h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          Sign up to create your real booking page — with live deposits,
          SMS reminders, digital consent forms, and your own branded URL.
        </p>

        <Link
          href="/register"
          className="block w-full bg-gold text-black font-bold text-sm text-center py-3.5 rounded-full hover:bg-gold-light transition-colors"
        >
          Create your free studio →
        </Link>

        <button
          onClick={onClose}
          className="block w-full text-center text-zinc-500 hover:text-zinc-300 text-sm mt-3 transition-colors"
        >
          Keep exploring the demo
        </button>
      </div>
    </div>
  );
}

// ─── Artist card (studio landing view) ───────────────────────────────────────

function ArtistCard({
  artist,
  onSelect,
}: {
  artist: Artist;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="group text-left bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-gold/50 transition-all duration-200 hover:bg-zinc-900/80 w-full"
    >
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full bg-zinc-800 mb-5 overflow-hidden ring-2 ring-white/5 group-hover:ring-gold/20 transition-all flex items-center justify-center">
        <span className="text-white/30 text-xl font-bold">{artist.initial}</span>
      </div>

      {/* Name + rate */}
      <h3 className="font-bold text-base mb-0.5">{artist.name}</h3>
      <p className="text-gold text-sm mb-3">From ${artist.rate}/hr</p>

      {/* Bio */}
      <p className="text-white/40 text-xs leading-relaxed mb-3 line-clamp-2">{artist.bio}</p>

      {/* Style tags */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {artist.styles.slice(0, 3).map((s) => (
          <span
            key={s}
            className="text-xs bg-white/5 text-white/50 px-2.5 py-0.5 rounded-full border border-white/8"
          >
            {s}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-white/8">
        <span className="text-xs text-white/30">View profile</span>
        <span className="text-sm text-gold font-semibold group-hover:translate-x-0.5 transition-transform inline-block">
          Book now →
        </span>
      </div>
    </button>
  );
}

// ─── Studio landing view ──────────────────────────────────────────────────────

function StudioLanding({ onSelectArtist }: { onSelectArtist: (a: Artist) => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-14">
      {/* Hero */}
      <div className="mb-14">
        <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-xs text-gold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Deposit required to book
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
          Book your appointment
        </h1>
        <p className="text-white/50 text-lg">
          Austin, TX · Choose an artist to get started.
        </p>
      </div>

      {/* Artist grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {ARTISTS.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            onSelect={() => onSelectArtist(artist)}
          />
        ))}
      </div>

      {/* Deposit notice */}
      <p className="text-center text-white/25 text-xs mt-12">
        A deposit is collected at booking and applied toward your session.
        It is non-refundable for no-shows or cancellations within 48 hours.
      </p>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-white/10 text-center text-xs text-white/25">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
          <span aria-hidden>|</span>
          <Link href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</Link>
          <span aria-hidden>|</span>
          <span>© 2026 InkBook</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Artist detail view ───────────────────────────────────────────────────────

function ArtistView({
  artist,
  selectedTime,
  onSelectTime,
  onBack,
  onBook,
}: {
  artist: Artist;
  selectedTime: string | null;
  onSelectTime: (t: string) => void;
  onBack: () => void;
  onBook: () => void;
}) {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-10"
      >
        ← All artists
      </button>

      {/* Artist header */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-12">
        <div className="w-24 h-24 rounded-full bg-zinc-800 shrink-0 ring-2 ring-gold/25 flex items-center justify-center">
          <span className="text-white/30 text-3xl font-bold">{artist.initial}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-2">{artist.name}</h1>
          <p className="text-gold text-sm font-medium mb-3">From ${artist.rate}/hr</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {artist.styles.map((s) => (
              <span
                key={s}
                className="text-xs bg-gold/10 text-gold border border-gold/20 px-3 py-1 rounded-full"
              >
                {s}
              </span>
            ))}
          </div>

          <p className="text-white/50 text-sm leading-relaxed max-w-lg">{artist.bio}</p>
        </div>

        <button
          onClick={onBook}
          className="shrink-0 bg-gold text-black font-bold px-6 py-3 rounded-full hover:bg-gold-light transition-colors text-sm"
        >
          Book now →
        </button>
      </div>

      {/* Availability calendar */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-1">Availability</h2>
        <p className="text-white/40 text-sm mb-6">Select a date, then choose a time slot.</p>
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
          <AvailabilityCalendar />
        </div>
      </section>

      {/* Time slots */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-1">Available times</h2>
        <p className="text-white/40 text-sm mb-5">Greyed out slots are already booked.</p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {TIME_SLOTS.map(({ time, available }) => (
            <button
              key={time}
              disabled={!available}
              onClick={() => available && onSelectTime(time)}
              className={[
                "py-3 rounded-xl text-sm font-medium text-center transition-all",
                !available
                  ? "bg-zinc-900 border border-white/5 text-white/20 cursor-not-allowed"
                  : selectedTime === time
                  ? "bg-gold text-black border border-gold font-bold scale-[1.02]"
                  : "bg-zinc-900 border border-white/10 text-white hover:border-gold/40 hover:text-gold",
              ].join(" ")}
            >
              {time}
              {!available && (
                <span className="block text-[10px] text-white/20 mt-0.5">Booked</span>
              )}
            </button>
          ))}
        </div>

        {selectedTime && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gold bg-gold/10 border border-gold/20 rounded-lg px-4 py-2.5">
            <span>✓</span>
            <span>{selectedTime} selected — click Book now to continue</span>
          </div>
        )}
      </section>

      {/* Book CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900 border border-gold/20 rounded-2xl px-6 py-5">
        <div>
          <p className="font-semibold mb-0.5">Ready to book with {artist.name}?</p>
          <p className="text-white/40 text-sm">
            ${artist.deposit} deposit secures your slot — applied toward your session.
          </p>
        </div>
        <button
          onClick={onBook}
          className="shrink-0 bg-gold text-black font-bold px-8 py-3.5 rounded-full hover:bg-gold-light transition-colors text-sm"
        >
          Book now →
        </button>
      </div>
    </main>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function DemoBookingPage() {
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedTime, setSelectedTime]     = useState<string | null>(null);
  const [showModal, setShowModal]           = useState(false);

  function handleSelectArtist(artist: Artist) {
    setSelectedArtist(artist);
    setSelectedTime(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setSelectedArtist(null);
    setSelectedTime(null);
  }

  return (
    <div className="min-h-screen bg-ink text-white">

      {/* ── Demo banner ── */}
      <div className="bg-gold/10 border-b border-gold/20 px-4 py-2.5 text-center">
        <p className="text-xs text-gold leading-snug">
          This is a demo —{" "}
          <Link
            href="/register"
            className="font-semibold underline underline-offset-2 hover:text-gold-light transition-colors"
          >
            create your free studio at inkbook.tech/register
          </Link>
        </p>
      </div>

      {/* ── Studio header ── */}
      <header className="sticky top-0 z-40 bg-ink/95 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 ring-2 ring-gold/30">
            <span className="text-white text-xs font-black">BA</span>
          </div>
          <span className="font-bold">Black Anchor Tattoo</span>
          <span className="text-white/30 text-sm hidden sm:block">· Austin, TX</span>
          <span className="ml-auto text-[11px] text-white/20 tracking-widest uppercase hidden sm:block">
            Powered by InkBook
          </span>
        </div>
      </header>

      {/* ── Views ── */}
      {selectedArtist ? (
        <ArtistView
          artist={selectedArtist}
          selectedTime={selectedTime}
          onSelectTime={setSelectedTime}
          onBack={handleBack}
          onBook={() => setShowModal(true)}
        />
      ) : (
        <StudioLanding onSelectArtist={handleSelectArtist} />
      )}

      {/* ── Modal ── */}
      {showModal && <DemoModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
