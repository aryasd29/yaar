"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/notifications";

/** Consistent page title for the main tabs, with the notification bell on phones and tablets. */
export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pb-4 pt-5 md:px-8 lg:px-10 lg:pt-8">
      <div className="min-w-0">
        <h1 className="text-[30px] leading-tight lg:text-[38px]">{title}</h1>
        {sub && <p className="mt-0.5 max-w-[560px] text-[14.5px] text-muted">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">{right}<NotificationBell className="lg:hidden" /></div>
    </header>
  );
}

export function NotificationBell({ className }: { className?: string }) {
  const { unread } = useNotifications();
  return (
    <Link href="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-charcoal bg-paper shadow-[0_3px_0_0_#1b2d45] transition active:translate-y-[2px] active:shadow-none ${className ?? ""}`}>
      <Bell size={19} />
      {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-paper bg-coral px-1 text-[11px] font-bold text-charcoal">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}
