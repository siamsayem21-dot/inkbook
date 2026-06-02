import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — InkBook",
  description: "How InkBook collects, stores, and protects your personal information.",
};

const sections = [
  {
    title: "What data we collect",
    content: [
      "**Personal identifiers:** Full legal name, email address, and phone number provided during booking.",
      "**Identity verification:** Government-issued ID photo uploaded to complete a client profile.",
      "**Consent signatures:** Electronic signature and IP address captured when signing a consent form.",
      "**Payment data:** Stripe processes all card information. InkBook stores only the last four digits, card brand, and a tokenized reference — never raw card numbers.",
      "**Usage data:** IP address, browser type, device identifiers, and pages visited, collected automatically when you use the platform.",
    ],
  },
  {
    title: "Why we collect it",
    content: [
      "**Booking management:** Name, email, and phone are used to create and communicate about your appointment.",
      "**Consent verification:** Signature and ID photo provide legally defensible proof that a client consented to a tattoo procedure and confirmed their age.",
      "**Chargeback protection:** IP address, timestamp, and signed form are retained so studios can dispute fraudulent chargebacks with payment processors.",
      "**Platform communications:** Email and phone are used to send booking confirmations and SMS reminders via Twilio.",
      "**Fraud prevention:** Usage data helps us detect and block abusive booking patterns.",
    ],
  },
  {
    title: "How we store it",
    content: [
      "All data is stored in Supabase-managed PostgreSQL databases hosted on servers located in the United States.",
      "Data in transit is encrypted with TLS 1.2 or higher. Data at rest is encrypted using AES-256.",
      "Access to the database is restricted by row-level security policies. Studio owners can only access data belonging to their own studio.",
      "ID photos are stored in a private Supabase Storage bucket. Signed URLs expire after a short window and are never publicly indexed.",
      "InkBook employees do not access individual client records except when required to resolve a reported support issue.",
    ],
  },
  {
    title: "Third-party services",
    content: [
      "**Stripe** — processes all payment transactions. Card data never passes through InkBook servers. Stripe is PCI DSS Level 1 certified. See stripe.com/privacy.",
      "**Twilio** — delivers SMS appointment reminders. Your phone number is transmitted to Twilio solely to send messages you opted into at booking. See twilio.com/legal/privacy.",
      "**Resend** — delivers transactional email (booking confirmations, receipts). Your email address is transmitted to Resend for this purpose only. See resend.com/legal/privacy-policy.",
      "No data is sold, rented, or shared with advertisers. These integrations exist solely to operate the service.",
    ],
  },
  {
    title: "Data retention",
    content: [
      "Booking records and consent forms are retained for a minimum of three years to satisfy studio liability and chargeback requirements.",
      "Upon a verified deletion request, all personal identifiers (name, email, phone, ID photo) are permanently removed from our systems within 30 days.",
      "Anonymized, non-identifiable booking statistics (date, duration, service type) may be retained indefinitely for aggregate analytics.",
      "Stripe retains payment records independently per their own retention policies.",
    ],
  },
  {
    title: "Your rights",
    content: [
      "You may request a copy of all personal data we hold about you.",
      "You may request correction of inaccurate data.",
      "You may request deletion of your personal data at any time, subject to legal retention obligations.",
      "You may opt out of SMS reminders by replying STOP to any message. Note: opting out of SMS does not cancel your booking.",
      "To exercise any of these rights, email support@inkbook.tech with the subject line \"Data Request\" and the email address or phone number associated with your booking.",
    ],
  },
  {
    title: "Contact",
    content: [
      "For privacy-related questions or requests: support@inkbook.tech",
      "We aim to respond to all privacy requests within 5 business days.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-zinc-950 text-white min-h-screen">

      {/* Nav */}
      <nav className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black text-xs font-black">IB</span>
            </div>
            <span className="font-bold text-lg tracking-tight">InkBook</span>
          </Link>
          <Link href="/terms" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Terms of Service
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-12">
          <p className="text-zinc-500 text-sm mb-3">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-zinc-400 leading-relaxed max-w-2xl">
            This policy describes what personal information InkBook collects, why we collect it,
            how we protect it, and what choices you have.
          </p>
          <p className="text-zinc-600 text-sm mt-4">Last updated: June 2026</p>
        </div>

        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold mb-5 pb-3 border-b border-zinc-800">
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.content.map((item, i) => (
                  <li key={i} className="text-zinc-400 text-sm leading-relaxed pl-4 border-l border-zinc-800">
                    {item.split("**").map((part, j) =>
                      j % 2 === 1 ? (
                        <strong key={j} className="text-zinc-200 font-medium">
                          {part}
                        </strong>
                      ) : (
                        part
                      )
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <span>© 2026 InkBook. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
