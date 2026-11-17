"use client";
import { ChatList } from "@/components/ChatList";
import { EmptyState } from "@/components/ui";

export default function Chats() {
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[380px_1fr]">
      <div className="lg:border-r lg:border-line"><ChatList /></div>
      <div className="hidden place-items-center lg:grid">
        <EmptyState mood="thinking" title="Pick a conversation" body="Your chats open here. Stuck on what to say? Help me reply and the Chemistry Room are inside every chat." />
      </div>
    </div>
  );
}
