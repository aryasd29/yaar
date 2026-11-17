import Link from "next/link";
import { Logo } from "./Logo";

export const CONTACT_URL = "https://github.com/aryasd29/yaar/issues";
export const UPDATED = "17 November 2026";

/** Shared layout for Terms, Privacy and Guidelines: readable line length, clear headings. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-vanilla">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-vanilla/85 px-5 py-3 backdrop-blur md:px-8">
        <Link href="/" aria-label="Isle home"><Logo size={28} /></Link>
        <nav className="flex gap-1 text-[14px] font-semibold">
          <Link href="/terms" className="rounded-full px-3 py-2 hover:bg-charcoal/5">Terms</Link>
          <Link href="/privacy" className="rounded-full px-3 py-2 hover:bg-charcoal/5">Privacy</Link>
          <Link href="/guidelines" className="rounded-full px-3 py-2 hover:bg-charcoal/5">Guidelines</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-[720px] px-5 pb-16 pt-6 md:px-8">
        <h1 className="text-[34px] leading-tight lg:text-[44px]">{title}</h1>
        <p className="mt-2 text-[13px] text-muted">Last updated {UPDATED}</p>
        <p className="mt-4 text-[16.5px] leading-relaxed">{intro}</p>
        <div className="legal mt-6 space-y-6 text-[15.5px] leading-relaxed [&_h2]:mt-8 [&_h2]:text-[22px] [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1.5">
          {children}
        </div>
        <p className="mt-10 rounded-[18px] bg-paper p-4 text-[14px] text-muted">
          Isle is a student project built for a recruitment assignment and is not yet a registered business. Questions, data requests or complaints: <a href={CONTACT_URL} className="font-semibold text-charcoal underline">contact the project owner</a>.
        </p>
      </main>
    </div>
  );
}
