import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_30%)] p-6">
      <div className="flex w-full max-w-xl flex-col items-center gap-6">
        <NeolyticsBrand />
        <SignupForm />
      </div>
    </main>
  );
}
