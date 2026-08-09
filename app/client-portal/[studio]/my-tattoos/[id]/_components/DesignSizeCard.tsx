import { Ruler } from "lucide-react";
import SectionCard from "./SectionCard";
import type { ProjectDetailData } from "../types";

interface Props {
  design: ProjectDetailData["design"];
}

export default function DesignSizeCard({ design }: Props) {
  return (
    <SectionCard
      id="design"
      icon={Ruler}
      title="Design & Size"
      badge={
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
          design.confirmed ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
        }`}>
          {design.confirmed ? "Confirmed" : "Pending Confirmation"}
        </span>
      }
    >
      <div className="flex flex-col sm:flex-row gap-5">
        {design.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={design.imageUrl} alt="Design reference" className="w-full sm:w-32 h-40 sm:h-32 object-cover rounded-xl border border-zinc-200 shrink-0" />
        )}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 flex-1">
          <div>
            <p className="text-xs text-zinc-400">Style</p>
            <p className="text-sm font-medium text-zinc-800 mt-0.5">{design.style}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Placement</p>
            <p className="text-sm font-medium text-zinc-800 mt-0.5">{design.placement}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Size / Dimensions</p>
            <p className="text-sm font-medium text-zinc-800 mt-0.5">{design.size}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Color Preference</p>
            <p className="text-sm font-medium text-zinc-800 mt-0.5">{design.colorPreference}</p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
