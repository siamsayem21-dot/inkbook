import { MapPin } from "lucide-react";

export interface LocationSummary {
  id: string;
  name: string;
  addressLabel: string | null;
  revenueLabel: string;
  leads: number;
  bookings: number;
  bookingRateLabel: string;
}

// Studio/location performance — a table so a future `locations` table (see the
// note below) can add more rows without changing this component's shape.
// Today InkBook has no location concept below the studio itself, so this always
// renders exactly one row: the current studio, standing in as "location 1 of 1".
export default function LocationsOverview({ locations }: { locations: LocationSummary[] }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-900">Studio / location performance</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          {locations.length} location{locations.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="text-left font-medium py-2.5 pr-4">Location</th>
              <th className="text-right font-medium py-2.5 px-4">Revenue</th>
              <th className="text-right font-medium py-2.5 px-4">Leads</th>
              <th className="text-right font-medium py-2.5 px-4">Bookings</th>
              <th className="text-right font-medium py-2.5 pl-4">Booking Rate</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <tr key={loc.id} className="border-b border-zinc-50 last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <MapPin size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{loc.name}</p>
                      {loc.addressLabel && <p className="text-xs text-zinc-400 truncate">{loc.addressLabel}</p>}
                    </div>
                  </div>
                </td>
                <td className="text-right px-4 text-zinc-900 font-medium tabular-nums">{loc.revenueLabel}</td>
                <td className="text-right px-4 text-zinc-700 tabular-nums">{loc.leads}</td>
                <td className="text-right px-4 text-zinc-700 tabular-nums">{loc.bookings}</td>
                <td className="text-right pl-4 text-zinc-700 tabular-nums">{loc.bookingRateLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
