import { notFound } from "next/navigation";

import { GameDetailClient } from "@/components/games/game-detail-client";

export default async function GameDetailPage({
  params
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const parsedAppId = Number(appId);

  if (!Number.isInteger(parsedAppId) || parsedAppId <= 0) {
    notFound();
  }

  return <GameDetailClient appId={parsedAppId} />;
}
