import type { Metadata } from "next";
import { CONTACT_URL, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Community guidelines · Isle" };

export default function Guidelines() {
  return (
    <LegalPage title="Community guidelines" intro="Isle works when people feel safe being themselves. These are the few rules everyone agrees to.">
      <section><h2>Be real</h2>
        <ul><li>Use your own name, age and recent photos of yourself.</li><li>Don&apos;t pretend to be someone else, and don&apos;t run accounts for anyone else.</li></ul></section>
      <section><h2>Be kind</h2>
        <ul><li>No harassment, hate speech, threats or bullying, including about someone&apos;s caste, religion, gender, sexuality, body or background.</li>
          <li>A &quot;no&quot;, a closed match or silence is an answer. Don&apos;t keep pushing, and don&apos;t try to find someone off the app.</li>
          <li>Don&apos;t send sexual content that hasn&apos;t been clearly invited.</li></ul></section>
      <section><h2>Never about money</h2>
        <ul><li>Don&apos;t ask anyone for money, gifts, OTPs, bank details or ID numbers. This is the most common pattern in dating scams.</li>
          <li>No selling, promotions or recruiting.</li></ul></section>
      <section><h2>Meet safely</h2>
        <ul><li>Meet in public places, tell a friend where you&apos;re going, and use the trusted-contact check-in.</li>
          <li>You can cancel a date for safety reasons at any time without any penalty.</li></ul></section>
      <section><h2>If something goes wrong</h2>
        <ul><li>Use ··· → Report on any profile or chat. Reports are private, and the other person isn&apos;t told who reported them.</li>
          <li>Blocking is instant and silent.</li>
          <li>Moderators review every report. Accounts that break these rules can be paused or removed. Threats of violence or anything involving minors may be reported to the police.</li>
          <li>If you&apos;re ever in danger, call 112.</li></ul></section>
      <section><h2>Appeals</h2>
        <p>If your account was paused and you think it was a mistake, <a href={CONTACT_URL} className="underline">contact the project owner</a> and we&apos;ll take another look.</p></section>
    </LegalPage>
  );
}
