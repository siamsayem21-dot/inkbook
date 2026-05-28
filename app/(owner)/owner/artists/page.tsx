import Link from "next/link";
import ArtistTable from "@/components/owner/ArtistTable";

export default function ArtistsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Artists</h1>
        <Link
          href="/artists/new"
          className="bg-white text-black text-sm px-4 py-2 rounded-full font-semibold hover:bg-zinc-200"
        >
          + Add artist
        </Link>
      </div>
      <ArtistTable />
    </div>
  );
}
