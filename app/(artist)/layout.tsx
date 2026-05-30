import Sidebar from "@/components/shared/Sidebar";

export default function ArtistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] flex">
      <Sidebar role="artist" />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
