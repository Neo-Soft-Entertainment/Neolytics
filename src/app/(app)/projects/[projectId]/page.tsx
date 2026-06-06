import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import { getCurrentOrganization } from "@/lib/auth-helpers";

export default async function ProjectDetailPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const organization = await getCurrentOrganization();

  return <ProjectDetailClient projectId={projectId} subscriptionPlan={organization.subscriptionPlan} />;
}
