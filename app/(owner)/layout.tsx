import Sidebar from "@/components/shared/Sidebar";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar role="owner" />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
