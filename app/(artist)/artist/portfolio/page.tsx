import PortfolioGrid from "@/components/artist/PortfolioGrid";
import StyleSelector from "@/components/artist/StyleSelector";

export default function PortfolioPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <button className="bg-white text-black text-sm px-4 py-2 rounded-full font-semibold hover:bg-zinc-200">
          + Upload photo
        </button>
      </div>
      <StyleSelector />
      <PortfolioGrid />
    </div>
  );
}
