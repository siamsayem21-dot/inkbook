import { redirect } from "next/navigation";

interface Props {
  params: { studio: string };
}

export default function ClientPortalIndex({ params }: Props) {
  redirect(`/client-portal/${params.studio}/home`);
}
