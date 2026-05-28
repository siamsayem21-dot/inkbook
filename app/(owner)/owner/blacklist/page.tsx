import BlacklistManager from "@/components/owner/BlacklistManager";

export default function BlacklistPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Blacklist</h1>
          <p className="text-zinc-400 text-sm mt-1">Blocked clients cannot book any artist in this studio.</p>
        </div>
      </div>
      <BlacklistManager />
    </div>
  );
}
