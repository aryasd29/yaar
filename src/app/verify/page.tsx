"use client";
import { useRouter } from "next/navigation";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Button, EmptyState, TopBar } from "@/components/ui";
import { FaceCheck } from "@/components/FaceCheck";
import { LIVE, track } from "@/lib/remote";

export default function VerifyPage() {
  return <Frame width="medium"><Verify /></Frame>;
}

function Verify() {
  const me = useRequireMe();
  const router = useRouter();
  if (!me) return <Loading />;
  return (
    <>
      <TopBar back={() => router.back()} title="Selfie check" />
      <main className="px-5 pb-12 pt-2 md:px-8">
        {!LIVE ? (
          <EmptyState title="The selfie check runs in the live app" body="In the offline demo every profile is shown as checked." />
        ) : me.verified ? (
          <EmptyState mood="cheering" title="You're already selfie-checked" body="The badge is on your scrapbook. Thanks for helping keep Isle real." action={<Button href="/profile">Back to profile</Button>} />
        ) : (
          <FaceCheck me={me} onVerified={() => track("verified")} />
        )}
      </main>
    </>
  );
}
