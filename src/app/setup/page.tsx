import { auth } from "@/auth";
import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/signout-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SetupPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%)] p-6">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        <NeolyticsBrand />
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Finalize a configuração da organização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Sua conta está ativa, mas ainda não está vinculada a uma organização com área de trabalho ativa.
              Crie a primeira organização agora e a Neolytics levará você direto para o produto.
            </p>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <CreateOrganizationForm compact />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/">Voltar para o início</Link>
              </Button>
              <SignOutButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
