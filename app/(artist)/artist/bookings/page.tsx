import BookingCard from "@/components/artist/BookingCard";

export default function ArtistBookingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Bookings</h1>
      <div className="flex gap-2">
        {["Upcoming", "Completed", "Cancelled"].map((f) => (
          <button
            key={f}
            className={`text-sm px-3 py-1.5 rounded-full ${
              f === "Upcoming" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <BookingCard />
        <BookingCard />
        <BookingCard />
      </div>
    </div>
  );
}
