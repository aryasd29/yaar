import type { Metadata } from "next";
import { CONTACT_URL, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy · Isle" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" intro="Dating involves personal information, so we collect as little as we can, use it only to run Isle, and give you control over it. This policy follows India's Digital Personal Data Protection Act, 2023.">
      <section><h2>What we collect</h2>
        <ul><li><b>Account:</b> your email address or phone number, and a password if you set one.</li>
          <li><b>Your scrapbook:</b> first name, age, gender, pronouns (optional), neighbourhood, what you&apos;re looking for, photos, captions, hot take, voice note, starter pack, interests and This or That answers.</li>
          <li><b>Private details:</b> workplace and college (optional), used only to keep you hidden from colleagues and classmates. They&apos;re never shown to anyone.</li>
          <li><b>Activity:</b> reactions, matches, messages, date plans, reports and blocks.</li>
          <li><b>Basic usage events:</b> for example &quot;a match was made&quot; or &quot;a date was confirmed&quot;, so we can tell whether Isle is actually helping people meet. We don&apos;t sell this or use it for advertising.</li></ul></section>
      <section><h2>What we don&apos;t do</h2>
        <ul><li>We don&apos;t sell your data or show you ads.</li>
          <li>We don&apos;t share your exact location. Others see your neighbourhood, your city, or nothing, as you choose.</li>
          <li>We don&apos;t show your workplace, college, phone number or email to other members.</li></ul></section>
      <section><h2>Who can see what</h2>
        <ul><li>Your scrapbook is shown only to people Isle introduces you to, and to people you&apos;ve reacted to or matched with.</li>
          <li>Your messages are visible only to you and the person you&apos;re talking to.</li>
          <li>Reports are seen by Isle&apos;s moderators so they can keep people safe.</li>
          <li>&quot;Help me reply&quot; may send the last message of a conversation to an AI service to suggest replies. You can turn it off in Privacy settings.</li></ul></section>
      <section><h2>Where it&apos;s stored</h2>
        <p>Isle uses Supabase (database, sign-in and file storage) and Vercel (hosting). Data is protected by access rules so that members can only read what this policy allows.</p></section>
      <section><h2>Your rights</h2>
        <ul><li><b>Access:</b> download your data from Profile → Privacy → Download my data.</li>
          <li><b>Correction:</b> edit your scrapbook and settings at any time.</li>
          <li><b>Erasure:</b> delete your account from Profile → Delete account. Your profile, photos, matches, messages and plans are removed straight away. Anonymous usage counts may remain.</li>
          <li><b>Withdraw consent:</b> deleting your account withdraws consent for all processing.</li>
          <li><b>Grievances:</b> <a href={CONTACT_URL} className="underline">contact the project owner</a>. We aim to respond within 7 days. You may also approach the Data Protection Board of India.</li></ul></section>
      <section><h2>How long we keep it</h2>
        <p>For as long as your account exists. Matches that close after 15 quiet days stay in your chat list until you delete your account. Reports are kept as long as needed to keep the community safe.</p></section>
      <section><h2>Children</h2>
        <p>Isle is only for people aged 18 and over. If we learn an account belongs to someone younger, we delete it.</p></section>
    </LegalPage>
  );
}
