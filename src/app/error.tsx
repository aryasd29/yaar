"use client";
import { useEffect } from "react";
import { Coco } from "@/components/Coco";
import { Button } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center bg-vanilla px-6 text-center">
      <div className="max-w-[380px]">
        <Coco mood="thinking" size={120} className="mx-auto" />
        <h1 className="mt-3 text-[26px]">This page tripped over something</h1>
        <p className="mt-1 text-[15px] text-muted">Your matches and messages are safe. Try loading it again, or head back to Today.</p>
        <div className="mt-5 grid gap-2"><Button onClick={reset}>Try again</Button><Button variant="ghost" href="/today">Go to Today</Button></div>
      </div>
    </main>
  );
}
