import Link from "next/link";

import { SignOutButton } from "@/components/auth/signout-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%)] p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>No workspace access yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This installation does not allow public account creation. Your account is valid,
            but it is not attached to an organization with an active workspace yet.
          </p>
          <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4">
            <div>
              <p className="font-medium text-foreground">What to do next</p>
              <p className="mt-1">Ask an administrator to add your account to an organization, then sign in again.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">For local demo access</p>
              <p className="mt-1">Use the seeded admin account or create the organization membership in the current environment.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login">Back to sign in</Link>
            </Button>
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
