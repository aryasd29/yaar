import { Frame } from "@/components/Shell";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return <Frame nav>{children}</Frame>;
}
