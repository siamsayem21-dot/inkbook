import { HeartPulse } from "lucide-react";
import SectionCard from "./SectionCard";
import type { ProjectDetailData } from "../types";

interface Props {
  aftercare: ProjectDetailData["aftercare"];
}

export default function AftercareCard({ aftercare }: Props) {
  if (!aftercare.available) {
    return (
      <SectionCard id="aftercare" icon={HeartPulse} title="Aftercare" muted>
        <p className="text-sm text-zinc-500">Available after your appointment.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard id="aftercare" icon={HeartPulse} title="Aftercare">
      <p className="text-sm text-zinc-600 mb-4">{aftercare.sentLabel}</p>
      <ul className="text-sm text-zinc-600 leading-relaxed list-disc pl-5 space-y-1.5">
        <li>Keep the area clean and moisturized with fragrance-free lotion.</li>
        <li>Avoid direct sun, swimming, and soaking for at least 2 weeks.</li>
        <li>Don&apos;t pick or scratch at any peeling or flaking skin.</li>
        <li>Contact the studio if you notice excessive redness, swelling, or discharge.</li>
      </ul>
    </SectionCard>
  );
}
