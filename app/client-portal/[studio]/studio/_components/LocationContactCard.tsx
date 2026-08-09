import { MapPin, Phone, Mail, Clock } from "lucide-react";
import SectionShell from "./SectionShell";
import EmptyState from "./EmptyState";

interface Props {
  address: string | null;
  state: string | null;
  phone: string | null;
  contactEmail: string | null;
  hours: string | null;
}

interface Row {
  icon: typeof MapPin;
  label: string;
  value: string;
}

// address/state (supabase/migrations/20260527000000_initial_schema.sql) and
// phone/contact_email/hours (20260809010000_studios_contact_fields.sql) are
// all real, nullable studios columns. Each row only renders when that
// specific field is actually set — nothing here is hard-coded or invented.
export default function LocationContactCard({ address, state, phone, contactEmail, hours }: Props) {
  const rows: Row[] = [];
  const location = [address, state].filter(Boolean).join(", ");
  if (location) rows.push({ icon: MapPin, label: "Address", value: location });
  if (phone) rows.push({ icon: Phone, label: "Phone", value: phone });
  if (contactEmail) rows.push({ icon: Mail, label: "Email", value: contactEmail });
  if (hours) rows.push({ icon: Clock, label: "Hours", value: hours });

  return (
    <SectionShell id="location" icon={MapPin} eyebrow="Visit Us" title="Location & Contact">
      {rows.length === 0 ? (
        <EmptyState message="This studio hasn't added location or contact details yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-zinc-50 text-zinc-400 flex items-center justify-center shrink-0">
                <row.icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">{row.label}</p>
                <p className="text-sm font-medium text-zinc-800 mt-0.5 break-words">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
