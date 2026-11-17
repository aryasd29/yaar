import { Coco } from "@/components/Coco";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-vanilla px-6 text-center">
      <div className="max-w-[380px]">
        <Coco mood="curious" size={120} className="mx-auto" />
        <h1 className="mt-3 text-[26px]">We couldn&apos;t find that page</h1>
        <p className="mt-1 text-[15px] text-muted">The link may be old, or the profile is no longer available.</p>
        <Button className="mt-5" href="/today">Go to Today</Button>
      </div>
    </main>
  );
}
