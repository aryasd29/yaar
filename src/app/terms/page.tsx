import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_URL, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of use · Isle" };

export default function Terms() {
  return (
    <LegalPage title="Terms of use" intro="These terms are the agreement between you and Isle when you use the app. We've written them in plain language. By creating an account, you agree to them.">
      <section><h2>Who can use Isle</h2>
        <ul><li>You must be 18 or older. We may ask you to confirm your age, and we close accounts that belong to anyone younger.</li>
          <li>One account per person, in your own name, with real photos of yourself.</li>
          <li>You can&apos;t use Isle if you&apos;ve been removed from Isle before, or if you&apos;re legally barred from using dating services.</li></ul></section>
      <section><h2>Your account</h2>
        <ul><li>Keep your password private. You&apos;re responsible for what happens on your account.</li>
          <li>You can delete your account at any time from Profile → Delete account. This removes your profile, photos, matches, chats and date plans.</li></ul></section>
      <section><h2>How you treat others</h2>
        <p>Follow our <Link href="/guidelines" className="underline">Community guidelines</Link>. In short: be honest, be kind, respect a no, and never ask for money. We may suspend or remove accounts that break them, and we may share information with the police where the law requires it.</p></section>
      <section><h2>Meeting in person</h2>
        <ul><li>Isle suggests public venues and offers safety tools (trusted-contact check-ins, reporting, blocking). We can&apos;t guarantee anyone&apos;s behaviour, so always use your own judgement.</li>
          <li>The selfie check at sign-up is simulated in this version of Isle. Don&apos;t treat it as proof of identity.</li></ul></section>
      <section><h2>The ₹99 show-up promise</h2>
        <ul><li>It&apos;s optional, and both people must choose it.</li>
          <li>Both show up: both get a full refund. One person doesn&apos;t show: the person who came receives both deposits. Neither shows: both are refunded minus a small fee.</li>
          <li>Cancel 24 hours or more before: full refund. Cancel within 24 hours: half of your deposit goes to the other person. Cancelling for a safety reason is never penalised.</li>
          <li>In this version, deposits run in test mode only and no real money moves.</li></ul></section>
      <section><h2>Your content</h2>
        <p>You own the photos, voice notes and words you share. You give Isle permission to store and show them to the people you&apos;re introduced to, only so the app can work. Don&apos;t upload anything you don&apos;t have the right to share.</p></section>
      <section><h2>Sample content</h2>
        <p>Some profiles, events and venues in the app are samples so new members can see how Isle works. They&apos;re marked &quot;Sample&quot; and aren&apos;t real people or bookings.</p></section>
      <section><h2>Changes and contact</h2>
        <p>If we change these terms in a way that matters, we&apos;ll tell you in the app first. For questions, <a href={CONTACT_URL} className="underline">contact the project owner</a>. These terms are governed by the laws of India.</p></section>
    </LegalPage>
  );
}
