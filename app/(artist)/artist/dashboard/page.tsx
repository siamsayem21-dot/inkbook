import EarningsWidget from "@/components/artist/EarningsWidget";
import BookingCard from "@/components/artist/BookingCard";

export default function ArtistDashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">My Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Upcoming bookings", value: "6" },
          { label: "This month earnings", value: "$2,800" },
          { label: "Pending deposits", value: "2" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-400 text-sm mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <EarningsWidget />
        <div className="space-y-3">
          <h2 className="font-semibold">Next 3 bookings</h2>
          <BookingCard />
          <BookingCard />
          <BookingCard />
        </div>
      </div>
    </div>
  );
}
