import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — InkBook",
  description: "The terms that govern your use of the InkBook platform.",
};

const sections = [
  {
    title: "Service description",
    content: [
      "InkBook is a white-label tattoo studio management platform offered as a Software-as-a-Service (SaaS). It enables tattoo studio owners to manage bookings, collect deposits, deliver digital consent forms, and communicate with clients — all under the studio's own brand.",
      "InkBook provides the underlying technology. Individual studios operate independently and are solely responsible for the services they render to clients.",
      "InkBook does not perform tattoo services, employ tattoo artists, or supervise any studio operations.",
    ],
  },
  {
    title: "Who can use InkBook",
    content: [
      "**Studio owners:** Any individual or legal entity that operates a licensed tattoo studio in the United States or Canada may subscribe to InkBook and create a studio account.",
      "**Artists:** Tattoo artists may use InkBook as invited by a studio owner. Artist access is provisioned by and subordinate to the studio owner's account.",
      "**Clients:** Individuals may use a studio's InkBook-powered booking page to schedule appointments. Clients must be 18 years of age or older to book independently. Clients aged 16–17 require documented parental or guardian consent as required by applicable state or provincial law.",
      "By using InkBook, you represent that you have the legal capacity to enter into these Terms.",
    ],
  },
  {
    title: "Payment terms",
    content: [
      "**Subscriptions:** Studio owner subscriptions are billed monthly in advance via Stripe. Available plans are Solo ($49/mo), Studio ($79/mo), and Pro ($129/mo). Pricing is subject to change with 30 days' notice.",
      "**Transaction fee:** InkBook charges a 1% fee on all deposits and payments processed through the platform. This fee is deducted automatically at the time of transaction.",
      "**Deposits:** A deposit is required from clients at the time of booking. Deposit amounts are set by the studio. All deposits are processed through Stripe and held according to Stripe's standard policies.",
      "**Refunds:** Subscription fees are non-refundable except as required by applicable law. Deposit refund policies are set by individual studios; InkBook is not a party to refund disputes between studios and clients.",
      "**Failed payments:** If a subscription payment fails, InkBook will attempt to retry the charge. Access to paid features may be suspended if payment cannot be collected after reasonable retry attempts.",
    ],
  },
  {
    title: "No-show and cancellation policy",
    content: [
      "Studio owners configure their own cancellation and no-show policies through the InkBook platform. InkBook enforces these policies technically (e.g., auto-cancelling undeposited bookings after 24 hours) but does not determine their content.",
      "When a client does not appear for a confirmed appointment, the deposit is retained by the studio by default. InkBook is not responsible for disputes arising from no-shows, late cancellations, or deposit forfeitures.",
      "A booking is automatically cancelled if the required deposit is not paid within 24 hours of creation.",
    ],
  },
  {
    title: "Prohibited use",
    content: [
      "You may not use InkBook to commit fraud, including submitting false booking information, using stolen payment credentials, or impersonating another person.",
      "You may not create fake bookings, flood the system with test data in a production environment, or otherwise interfere with platform operations.",
      "You may not use InkBook to book services for illegal purposes or in jurisdictions where tattooing is prohibited.",
      "Studio owners may not use InkBook to discriminate against clients on the basis of race, color, religion, sex, national origin, disability, or any other characteristic protected by applicable law.",
      "Violations may result in immediate account termination and referral to law enforcement where appropriate.",
    ],
  },
  {
    title: "Limitation of liability",
    content: [
      "InkBook provides the platform \"as is\" and makes no warranties, express or implied, regarding uptime, fitness for a particular purpose, or freedom from errors.",
      "InkBook is not liable for disputes between studios and their clients, including disagreements over tattoo quality, consent form interpretation, or deposit refunds.",
      "InkBook is not liable for any indirect, incidental, consequential, or punitive damages arising from use of the platform, even if advised of the possibility of such damages.",
      "To the maximum extent permitted by law, InkBook's total liability to any party for claims arising from use of the platform is limited to the amount paid by that party to InkBook in the three months preceding the claim.",
    ],
  },
  {
    title: "Governing law",
    content: [
      "These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict-of-law principles.",
      "Any dispute arising from these Terms or use of the platform shall be resolved exclusively in the state or federal courts located in Delaware.",
      "If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.",
    ],
  },
  {
    title: "Changes to these terms",
    content: [
      "InkBook may update these Terms at any time. Studio owners will be notified via email at least 14 days before material changes take effect.",
      "Continued use of the platform after the effective date of changes constitutes acceptance of the revised Terms.",
      "Clients should review these Terms periodically. The current version is always available at inkbook.tech/terms.",
    ],
  },
  {
    title: "Contact",
    content: [
      "For questions about these Terms: support@inkbook.tech",
      "For legal notices: support@inkbook.tech with the subject line \"Legal Notice\".",
    ],
  },
];

export default function TermsPage() {
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
          <Link href="/privacy" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-12">
          <p className="text-zinc-500 text-sm mb-3">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-zinc-400 leading-relaxed max-w-2xl">
            By using InkBook — whether as a studio owner, artist, or client — you agree to these Terms.
            Please read them carefully.
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
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
