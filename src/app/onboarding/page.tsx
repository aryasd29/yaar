"use client";
import { LIVE, emailAuth, loadAccount, phoneSendCode, phoneVerify, sendPasswordReset } from "@/lib/remote";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { Camera, Check, EyeOff, Heart, Shield, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Waves } from "@/components/Sea";
import { Frame } from "@/components/Shell";
import { Badge, Button, Card, Chip, Input, PrototypeTag, TopBar, Toggle } from "@/components/ui";
import { Coco } from "@/components/Coco";
import { Moment } from "@/components/Moment";
import { MomentSlots } from "@/components/MomentSlots";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useYaar } from "@/lib/store";
import { HOT_TAKE_PROMPTS, INTEREST_TAGS, STARTER_SUGGESTIONS, THIS_OR_THAT } from "@/lib/seed";
import { BATTERY, INTENT_LABEL, type Battery, type Gender, type Intent, type Interest, type Moment as M, type Profile } from "@/lib/types";
import { splitHotTake } from "@/lib/logic";

const STEPS = ["Sign in", "Code", "Verify", "Basics", "Intent", "Privacy", "Moments", "Starter pack", "Voice", "This or That", "Battery", "Done"] as const;
const AREAS = ["Koramangala", "Indiranagar", "HSR Layout", "Jayanagar", "Whitefield", "Malleshwaram", "BTM Layout", "Bellandur", "Frazer Town", "JP Nagar", "Hebbal", "Electronic City"];

/** Phone sign-in needs an SMS provider (and DLT registration in India). Set NEXT_PUBLIC_PHONE_AUTH=1 once it is connected. */
const PHONE_ON = process.env.NEXT_PUBLIC_PHONE_AUTH === "1";

/** The first thing new people see: a warm sunset over the isle, and Coco saying hello. */
function WelcomeScene({ returning }: { returning: boolean }) {
  return (
    <div className="relative h-[230px] overflow-hidden border-b-2 border-charcoal bg-[linear-gradient(180deg,#FFD3A8_0%,#FFA27F_60%,#FF8F6B_100%)] md:mx-5 md:rounded-[30px] md:border-2 lg:sticky lg:top-20 lg:mx-0 lg:h-[min(640px,calc(100dvh-120px))] lg:shadow-[0_6px_0_0_#1b2d45]">
      <span className="absolute right-[14%] top-[34%] h-20 w-20 rounded-full bg-[#FFC94D] shadow-[0_0_50px_16px_rgba(255,201,77,0.45)] lg:right-[16%] lg:top-[12%] lg:h-32 lg:w-32" aria-hidden />
      <svg viewBox="0 0 40 20" className="absolute left-[12%] top-[16%] w-8 opacity-70" aria-hidden><path d="M2 12 Q10 4 20 12 Q30 4 38 12" stroke="#1b2d45" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>
      <svg viewBox="0 0 40 20" className="absolute left-[22%] top-[9%] w-5 opacity-60" aria-hidden><path d="M2 12 Q10 4 20 12 Q30 4 38 12" stroke="#1b2d45" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>
      <Waves height={64} className="lg:!h-[96px]" />
      {/* little sandbank with Coco */}
      <svg viewBox="0 0 200 40" className="absolute bottom-[30px] left-[4%] w-[46%] max-w-[230px] lg:bottom-[44px] lg:max-w-[340px]" aria-hidden><ellipse cx="100" cy="22" rx="94" ry="14" fill="#F3DDB8" stroke="#1b2d45" strokeWidth="2.5" /></svg>
      <motion.div className="absolute bottom-[40px] left-[13%] origin-bottom lg:bottom-[58px] lg:scale-[1.7]" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 12, delay: 0.1 }}>
        <Coco mood={returning ? "cheering" : "excited"} size={104} />
      </motion.div>
      {/* a message in a bottle drifting by (laptops) */}
      <svg viewBox="0 0 120 60" className="bob absolute bottom-[54px] right-[10%] hidden w-[120px] lg:block" aria-hidden>
        <path d="M30 12 H70 Q84 12 89 24 H101 Q104 24 104 27 V35 Q104 38 101 38 H89 Q84 50 70 50 H30 Q12 50 12 31 Q12 12 30 12 Z" fill="#BDEBE2" stroke="#1b2d45" strokeWidth="3" />
        <rect x="102" y="23" width="9" height="16" rx="3" fill="#C98D5B" stroke="#1b2d45" strokeWidth="2.5" />
        <rect x="26" y="22" width="50" height="18" rx="9" fill="#FFF9F0" stroke="#1b2d45" strokeWidth="2" /><path d="M51 22 V40" stroke="#FF7A5C" strokeWidth="3" />
      </svg>
      {/* speech bubble */}
      <motion.div className="absolute left-[44%] top-[16%] max-w-[52%] rounded-[20px] lg:left-[42%] lg:top-auto lg:bottom-[300px] lg:max-w-[52%] lg:px-5 lg:py-4 rounded-bl-[6px] border-2 border-charcoal bg-paper px-3.5 py-2.5 shadow-[0_3px_0_0_#1b2d45]"
        initial={{ scale: 0.6, opacity: 0, originX: 0, originY: 1 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 14, delay: 0.45 }}>
        <p className="font-hand text-[21px] leading-[1.05] lg:text-[30px]">{returning ? "you're back! I missed you" : "hi, I'm Coco!"}</p>
        <p className="mt-0.5 text-[12.5px] font-medium leading-snug text-charcoal/80 lg:text-[15px]">{returning ? "Let's see what the tide brought." : "I'll keep you company while you settle in."}</p>
      </motion.div>
    </div>
  );
}

export default function OnboardingPage() {
  return <Suspense><Onboarding /></Suspense>;
}

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, completeOnboarding, me, hydrated } = useYaar();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  // form state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [method, setMethod] = useState<"phone" | "google" | "email">(LIVE ? "email" : "phone");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "signin">(params.get("mode") === "login" ? "signin" : "signup");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dob, setDob] = useState("");
  const [verified, setVerified] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [pronouns, setPronouns] = useState("");
  const [interestedIn, setInterestedIn] = useState<Interest>("everyone");
  const [ageRange, setAgeRange] = useState<[number, number]>([21, 32]);
  const [area, setArea] = useState("");
  const [intent, setIntent] = useState<Intent | "">("");
  const [work, setWork] = useState("");
  const [college, setCollege] = useState("");
  const [hideWork, setHideWork] = useState(true);
  const [hideCollege, setHideCollege] = useState(true);
  const [moments, setMoments] = useState<M[]>([]);
  const [starter, setStarter] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [hotPrompt, setHotPrompt] = useState(HOT_TAKE_PROMPTS[0]);
  const [hotTake, setHotTake] = useState("");
  const [voice, setVoice] = useState<{ prompt: string; seconds: number; transcript: string; audioUrl?: string } | null>(null);
  const [tot, setTot] = useState<Record<string, "a" | "b">>({});
  const [battery, setBattery] = useState<Battery>("full");
  const [err, setErr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const authed = useYaar((s) => s.authed);
  useEffect(() => { if (hydrated && me && authed) router.replace("/today"); }, [hydrated, me, authed, router]);

  const age = useMemo(() => {
    if (!dob) return 0;
    const d = new Date(dob), n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
    return a;
  }, [dob]);

  const go = (n: number) => { setErr(null); setDir(n > step ? 1 : -1); setStep(n); window.scrollTo({ top: 0 }); };

  /** Live mode: real sign-in with Supabase. Existing accounts go straight to Today. */
  const afterAuth = async (userId: string, how: "email" | "phone") => {
    signIn(how, how === "phone" ? phone : undefined);
    const res = await loadAccount(userId);
    if (res === "loaded") { router.replace("/today"); return; }
    setUserId(userId);
    go(2);
  };
  const liveNext = async () => {
    const v = validate();
    if (v) return setErr(v);
    setBusy(true); setErr(null); setNotice(null);
    try {
      if (step === 0 && method === "email") {
        const r = await emailAuth(authMode, email.trim(), password);
        if (!r.ok) { if (r.needsConfirm) { setNotice(r.error); setAuthMode("signin"); } else setErr(r.error); return; }
        await afterAuth(r.userId, "email");
      } else if (step === 0) {
        const r = await phoneSendCode(`+91${phone.replace(/\s/g, "")}`);
        if (!r.ok) return setErr(r.error);
        go(1);
      } else if (step === 1) {
        const r = await phoneVerify(`+91${phone.replace(/\s/g, "")}`, otp);
        if (!r.ok) return setErr(r.error);
        await afterAuth(r.userId, "phone");
      }
    } finally { setBusy(false); }
  };

  const next = () => {
    if (LIVE && step < 2) return void liveNext();
    const v = validate();
    if (v) return setErr(v);
    if (step === 0 && method === "google") { signIn("google"); return go(2); }
    if (step === 1) signIn("phone", phone);
    go(step + 1);
  };

  function validate(): string | null {
    switch (step) {
      case 0:
        if (method === "email") { if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Enter a valid email address."; return password.length < 6 ? "Use a password with at least 6 characters." : null; }
        return method === "phone" && !/^[6-9]\d{9}$/.test(phone.replace(/\s/g, "")) ? "Enter a valid 10-digit Indian mobile number." : null;
      case 1: return LIVE ? (otp.length !== 6 ? "Enter the 6-digit code from the text message." : null) : otp !== "123456" ? "That code doesn't match. In this prototype the code is 123456." : null;
      case 2: if (!dob) return "Add your date of birth."; if (age < 18) return "Isle is for people aged 18 and over."; if (age > 100) return "Check your date of birth."; return !verified ? "Complete the selfie check to continue." : null;
      case 3: if (name.trim().length < 2) return "Add your first name."; if (!gender) return "Choose how you identify."; return !area ? "Pick your area so we can suggest people nearby." : null;
      case 4: return !intent ? "Choose what you're looking for. You can change it anytime." : null;
      case 6: return moments.length < 3 ? "Add at least 3 moments." : moments.some((m) => !m.caption.trim()) ? "Give every moment a short caption." : null;
      case 7: if (starter.length < 3) return "Pick at least 3 things for your starter pack."; if (interests.length < 3) return "Pick at least 3 interests."; return hotTake.trim().length < 8 ? "Write a hot take, even a small one." : null;
      case 9: return Object.keys(tot).length < 5 ? "Answer at least 5 quick picks." : null;
      default: return null;
    }
  }

  const finish = () => {
    const profile: Profile = {
      id: userId ?? "me", name: name.trim(), age, gender: gender as Gender, pronouns: pronouns || undefined, area, verified: true, intent: intent as Intent,
      moments, starterPack: starter, hotTake: splitHotTake({ hotTake, hotTakePrompt: hotPrompt }).answer, hotTakePrompt: hotPrompt, voice: voice ?? undefined, thisOrThat: tot, interests,
      work: work || undefined, college: college || undefined, battery,
    };
    useYaar.getState().setSettings({ hideFromWork: hideWork, hideFromCollege: hideCollege });
    completeOnboarding(profile, { interestedIn, ageMin: ageRange[0], ageMax: ageRange[1], distanceKm: 15, intents: ["serious", "open", "casual", "companionship", "figuring"] });
    router.push("/today");
  };

  const pct = Math.round((step / (STEPS.length - 1)) * 100);
  const returning = LIVE ? authMode === "signin" : params.get("mode") === "login";

  return (
    <Frame bare width={step === 0 ? "wide" : undefined}>
      <TopBar back={step > 0 && step < STEPS.length - 1 ? () => go(step === 2 && (method === "google" || LIVE) ? 0 : step - 1) : step === 0 ? "/" : undefined}
        title={step === 0 ? <Logo size={24} /> : <span className="text-[15px] font-semibold text-muted">{params.get("mode") === "login" && step < 2 ? "Welcome back" : STEPS[step]}</span>}
        right={step === 0 ? undefined : <span className="pr-2 text-[12.5px] font-semibold text-muted">{step + 1}/{STEPS.length}</span>} />
      {step > 0 && (
        <div className="mx-5 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Onboarding progress">
          <motion.div className="h-full rounded-full bg-coral" animate={{ width: `${Math.max(pct, 4)}%` }} transition={{ duration: 0.25 }} />
        </div>
      )}

      <AnimatePresence mode="wait" custom={dir}>
        <motion.main key={step} custom={dir} initial={{ x: dir * 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir * -24, opacity: 0 }} transition={{ duration: 0.2 }} className="px-5 pb-6 pt-6">
          {step === 0 && (
            <section className="-mx-5 -mt-6 lg:mx-0 lg:mt-2 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
              <WelcomeScene returning={returning} />
              <div className="px-5 pt-6 lg:px-0 lg:pt-4">
              <h1 className="text-[31px] leading-[1.1] lg:text-[44px]">{returning ? "Welcome back to the isle" : "Welcome to the isle"}</h1>
              <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{returning
                ? "Coco kept your spot warm. Sign in and the tide will catch you up."
                : "Make an account, then we'll build your scrapbook together. Nobody sees a thing until you're ready."}</p>
              {!returning && (
                <ul className="mt-4 grid grid-cols-3 gap-2" aria-label="Our promises">
                  {([[<Heart key="h" size={18} />, "First names only", "bg-coral-soft text-coral-ink"], [<EyeOff key="e" size={18} />, "Hidden from colleagues", "bg-peri-soft text-peri-ink"], [<Sparkles key="s" size={18} />, "Leave anytime, no strings", "bg-sage-soft text-sage-ink"]] as const).map(([icon, text, tone]) => (
                    <li key={text} className={`flex flex-col items-center gap-1.5 rounded-[18px] px-2 py-3 text-center text-[12.5px] font-semibold leading-tight ${tone}`}>{icon}{text}</li>
                  ))}
                </ul>
              )}
              <div className="mt-5 rounded-[26px] border-2 border-charcoal bg-paper p-4 shadow-[0_4px_0_0_#1b2d45]">
              {LIVE && (
                <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 rounded-full bg-vanilla p-1">
                  {(["email", "phone"] as const).map((m) => {
                    const soon = m === "phone" && !PHONE_ON;
                    return (
                      <button key={m} role="tab" aria-selected={method === m} aria-disabled={soon} onClick={() => { if (soon) { setNotice("Phone sign-in is coming soon. Texting codes in India needs an SMS provider and DLT registration, so for now please use email."); return; } setMethod(m); setErr(null); }}
                        className={`min-h-11 rounded-full text-[14px] font-bold capitalize transition ${method === m ? "bg-charcoal text-paper" : soon ? "text-muted/60" : "text-muted"}`}>
                        {m}{soon && <span className="ml-1.5 rounded-full bg-butter-soft px-1.5 py-0.5 text-[10.5px] font-bold normal-case text-butter-ink">soon</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 space-y-3">
                {LIVE && method === "email" ? (
                  <>
                    <Input label="Your email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} placeholder="you@example.com" />
                    <Input label={authMode === "signup" ? "Choose a password" : "Your password"} type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => { setPassword(e.target.value); setErr(null); }} hint={authMode === "signup" ? "At least 6 characters." : undefined} />
                    <p className="text-[14px] text-muted">
                      {authMode === "signup" ? "Already have an account? " : "New to Isle? "}
                      <button className="min-h-11 font-semibold text-charcoal underline underline-offset-2" onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setErr(null); setNotice(null); }}>{authMode === "signup" ? "Sign in" : "Create an account"}</button>
                    </p>
                    {authMode === "signin" && (
                      <button className="-mt-1 min-h-11 text-left text-[14px] font-semibold text-charcoal underline underline-offset-2" onClick={async () => {
                        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Type your email above first, then tap Forgot password.");
                        setErr(null); setBusy(true);
                        const r = await sendPasswordReset(email.trim());
                        setBusy(false);
                        if (r.ok) setNotice("Check your inbox for a link to set a new password. It can take a minute or two."); else setErr(r.error);
                      }}>Forgot password?</button>
                    )}
                    {notice && <p role="status" className="rounded-xl bg-sage-soft px-3 py-2 text-[13.5px] text-sage-ink">{notice}</p>}
                  </>
                ) : (
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-semibold">Mobile number</span>
                    <div className="flex gap-2">
                      <span className="grid min-h-12 place-items-center rounded-[14px] border-2 border-line bg-paper px-3 font-semibold">+91</span>
                      <input inputMode="numeric" autoComplete="tel-national" maxLength={11} value={phone} onChange={(e) => { setMethod("phone"); setPhone(e.target.value.replace(/[^\d ]/g, "")); setErr(null); }}
                        placeholder="98450 31221" className="min-h-12 w-full rounded-[14px] border-2 border-line bg-paper px-4 text-[16px] outline-none focus:border-coral" aria-label="Mobile number" />
                    </div>
                  </label>
                )}
                {!LIVE && (
                  <>
                    <div className="flex items-center gap-3 py-1 text-[13px] text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
                    <Button variant="secondary" full onClick={() => { setMethod("google"); signIn("google"); go(2); }}>
                      <span className="font-display text-[17px] text-[#4285F4]">G</span> Continue with Google
                    </Button>
                  </>
                )}
              </div>
              {err && <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-[13.5px] font-medium text-coral-ink">{err}</p>}
              <Button full className="mt-4" onClick={next} disabled={busy}>{busy ? "One moment…" : LIVE && method === "email" ? (returning ? "Sign in" : "Create my account") : "Send code"}</Button>
              {!returning && <p className="mt-2 text-center text-[12.5px] font-medium text-muted">Takes about three minutes. You can finish your scrapbook later.</p>}
              </div>
              <p className="mt-4 text-center text-[12.5px] leading-relaxed text-muted">By continuing you agree to our <a href="/terms" className="underline">Terms</a>, <a href="/privacy" className="underline">Privacy policy</a> and <a href="/guidelines" className="underline">Community guidelines</a>. Isle is for people 18 and over.</p>
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <h1 className="text-[28px] leading-tight">Enter the 6-digit code</h1>
              <p className="mt-1.5 text-muted">Sent to +91 {phone}</p>
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setErr(null); }}
                className="mt-6 min-h-16 w-full rounded-[16px] border-2 border-line bg-paper text-center font-display text-[30px] tracking-[0.5em] outline-none focus:border-coral" aria-label="One-time code" placeholder="······" />
              {!LIVE && <div className="mt-4"><PrototypeTag>Prototype: the code is 123456</PrototypeTag></div>}
              {LIVE && <button className="mt-4 min-h-11 text-[14px] font-semibold underline underline-offset-2" onClick={() => void phoneSendCode(`+91${phone.replace(/\s/g, "")}`).then((r) => setNotice(r.ok ? "New code sent." : r.error))}>Send a new code</button>}
              {LIVE && notice && <p role="status" className="mt-2 text-[13.5px] text-muted">{notice}</p>}
            </section>
          )}

          {step === 2 && (
            <section>
              <h1 className="text-[28px] leading-tight">Quick check that you&apos;re you</h1>
              <p className="mt-1.5 text-muted">Everyone on Isle passes the same check. Your selfie is never shown on your profile.</p>
              <div className="mt-5"><Input label="Date of birth" type="date" value={dob} onChange={(e) => { setDob(e.target.value); setErr(null); }} max={new Date().toISOString().slice(0, 10)} hint={age ? `You're ${age}.` : "You must be 18 or over."} /></div>
              <SelfieCheck done={verified} onDone={() => setVerified(true)} />
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted"><Shield size={13} className="mr-1 inline" />A Verified badge means someone passed this check. It isn&apos;t a promise about their character, so always use the safety tools.</p>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-5">
              <h1 className="text-[28px] leading-tight">A little about you</h1>
              <Input label="First name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ananya" autoComplete="given-name" maxLength={24} />
              <ChoiceRow label="I am a" value={gender} onChange={(v) => setGender(v as Gender)} options={[["woman", "Woman"], ["man", "Man"], ["nonbinary", "Non-binary"]]} />
              <Input label="Pronouns (optional)" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="she/her" maxLength={20} />
              <ChoiceRow label="Show me" value={interestedIn} onChange={(v) => setInterestedIn(v as Interest)} options={[["women", "Women"], ["men", "Men"], ["everyone", "Everyone"]]} />
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold">Age range: {ageRange[0]}–{ageRange[1]}</span>
                <div className="flex items-center gap-3">
                  <input type="range" min={18} max={45} value={ageRange[0]} onChange={(e) => setAgeRange([Math.min(+e.target.value, ageRange[1] - 1), ageRange[1]])} className="w-full accent-[#FF7A5C]" aria-label="Minimum age" />
                  <input type="range" min={19} max={50} value={ageRange[1]} onChange={(e) => setAgeRange([ageRange[0], Math.max(+e.target.value, ageRange[0] + 1)])} className="w-full accent-[#FF7A5C]" aria-label="Maximum age" />
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold">Your area in Bengaluru</span>
                <div className="flex flex-wrap gap-2">{AREAS.map((a) => <Chip key={a} active={area === a} onClick={() => setArea(a)}>{a}</Chip>)}</div>
                <p className="mt-2 text-[12.5px] text-muted">Others only see your neighbourhood, never your exact location.</p>
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h1 className="text-[28px] leading-tight">What are you looking for?</h1>
              <p className="mt-1.5 text-muted">Shared Intent helps avoid mismatched expectations. It shows on your profile.</p>
              <div className="mt-5 space-y-2.5">
                {(Object.keys(INTENT_LABEL) as Intent[]).map((k) => (
                  <button key={k} onClick={() => { setIntent(k); setErr(null); }} aria-pressed={intent === k}
                    className={clsx("flex min-h-14 w-full items-center justify-between rounded-[18px] border-2 px-4 text-left text-[15.5px] font-medium transition", intent === k ? "border-coral bg-coral-soft" : "border-line bg-paper")}>
                    {INTENT_LABEL[k]} {intent === k && <Check size={20} className="text-coral-ink" />}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="space-y-4">
              <h1 className="text-[28px] leading-tight">Keep work and college private</h1>
              <p className="text-muted">Optional. We use these only to hide you from people at the same places. They&apos;re never shown before a match.</p>
              <Input label="Workplace (optional)" value={work} onChange={(e) => setWork(e.target.value)} placeholder="Company name" />
              <Input label="College (optional)" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="College name" />
              <Card className="space-y-1">
                <Toggle checked={hideWork} onChange={setHideWork} label="Hide me from colleagues" description={work ? `People who list ${work}` : "Add a workplace to use this"} />
                <Toggle checked={hideCollege} onChange={setHideCollege} label="Hide me from classmates" description={college ? `People who list ${college}` : "Add a college to use this"} />
              </Card>
              <p className="text-[12.5px] leading-relaxed text-muted">Honest note: this lowers the chance colleagues see you, but someone could still recognise your photos.</p>
            </section>
          )}

          {step === 6 && <MomentsStep moments={moments} setMoments={setMoments} />}

          {step === 7 && (
            <section className="space-y-6">
              <div>
                <h1 className="text-[28px] leading-tight">Your starter pack</h1>
                <p className="mt-1.5 text-muted">3 to 5 things that sum you up. Tap or add your own.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[...new Set([...STARTER_SUGGESTIONS, ...starter])].map((s) => (
                    <Chip key={s} active={starter.includes(s)} onClick={() => setStarter(starter.includes(s) ? starter.filter((x) => x !== s) : starter.length < 5 ? [...starter, s] : starter)}>{s}</Chip>
                  ))}
                </div>
                <AddCustom onAdd={(v) => starter.length < 5 && setStarter([...starter, v])} placeholder="Add your own (e.g. midnight chai runs)" />
              </div>
              <div>
                <h2 className="text-[20px]">Things you&apos;re into</h2>
                <p className="mt-1 text-[14px] text-muted">We use these for date ideas. Pick at least 3.</p>
                <div className="mt-3 flex flex-wrap gap-2">{INTEREST_TAGS.map((t) => <Chip key={t} active={interests.includes(t)} onClick={() => setInterests(interests.includes(t) ? interests.filter((x) => x !== t) : [...interests, t])}>{t}</Chip>)}</div>
              </div>
              <div>
                <h2 className="text-[20px]">Your hot take</h2>
                <div className="mt-2 flex flex-wrap gap-2">{HOT_TAKE_PROMPTS.map((p) => <Chip key={p} tone="butter" active={hotPrompt === p} onClick={() => setHotPrompt(p)}>{p}</Chip>)}</div>
                <textarea value={hotTake} onChange={(e) => setHotTake(e.target.value)} maxLength={120} rows={2} placeholder="Finish the sentence. e.g. completely fine, fight me."
                  className="mt-3 w-full rounded-[14px] border-2 border-line bg-paper px-4 py-3 text-[16px] outline-none focus:border-coral" aria-label="Hot take" />
                <div className="text-right text-[12px] text-muted">{hotTake.length}/120</div>
              </div>
            </section>
          )}

          {step === 8 && <VoiceStep voice={voice} setVoice={setVoice} />}

          {step === 9 && (
            <section>
              <h1 className="text-[28px] leading-tight">This or That</h1>
              <p className="mt-1.5 text-muted">Quick picks. Matches see where you agree. Answer at least 5.</p>
              <div className="mt-5 space-y-2.5">
                {THIS_OR_THAT.map((q) => (
                  <div key={q.id} className="grid grid-cols-2 gap-2">
                    {(["a", "b"] as const).map((side) => (
                      <button key={side} onClick={() => { setTot({ ...tot, [q.id]: side }); setErr(null); }} aria-pressed={tot[q.id] === side}
                        className={clsx("flex min-h-12 items-center justify-center gap-1.5 rounded-[14px] border-2 px-3 text-[15px] font-semibold transition active:scale-95", tot[q.id] === side ? "border-charcoal bg-butter text-charcoal" : tot[q.id] ? "border-line bg-paper text-muted" : "border-line bg-paper")}>
                        {tot[q.id] === side && <Check size={16} strokeWidth={3} />}{side === "a" ? q.a : q.b}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[13px] text-muted">{Object.keys(tot).length}/10 answered</p>
            </section>
          )}

          {step === 10 && (
            <section>
              <h1 className="text-[28px] leading-tight">How&apos;s your social battery?</h1>
              <p className="mt-1.5 text-muted">This controls new introductions and reminders. Change it anytime. Only you see it.</p>
              <div className="mt-5 space-y-2.5">
                {(Object.keys(BATTERY) as Battery[]).map((b) => (
                  <button key={b} onClick={() => setBattery(b)} aria-pressed={battery === b}
                    className={clsx("flex min-h-16 w-full items-center gap-3 rounded-[18px] border-2 px-4 text-left transition", battery === b ? "border-sage-ink bg-sage-soft" : "border-line bg-paper")}>
                    <span className="text-[26px]" aria-hidden>{BATTERY[b].emoji}</span>
                    <span><span className="block font-semibold">{BATTERY[b].label}</span><span className="block text-[13.5px] text-muted">{BATTERY[b].desc}</span></span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 11 && (
            <section className="flex flex-col items-center pt-6 text-center">
              <Coco mood="celebrating" size={150} />
              <h1 className="mt-4 text-[30px]">Your scrapbook is ready, {name || "friend"}!</h1>
              <p className="mt-2 text-muted">Your first tide is coming in. Open each message in a bottle one at a time, and react to whatever makes you smile.</p>
              <div className="mt-6 w-full max-w-[260px]">{moments[0] && <Moment m={moments[0]} i={1} />}</div>
            </section>
          )}
        </motion.main>
      </AnimatePresence>

      {step > 0 && <div className="sticky bottom-0 z-20 bg-gradient-to-t from-vanilla via-vanilla to-vanilla/0 px-5 pb-6 pt-8">
        {err && <p role="alert" className="mb-2 rounded-xl bg-coral-soft px-3 py-2 text-[13.5px] font-medium text-coral-ink">{err}</p>}
        {step === 11 ? <Button full onClick={finish}>Go to the shore</Button>
          : step === 8 && !voice ? (<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => go(9)}>Skip for now</Button><Button className="flex-1" onClick={next}>Continue</Button></div>)
          : <Button full onClick={next} disabled={busy}>{busy ? "One moment…" : "Continue"}</Button>}
      </div>}
    </Frame>
  );
}

function ChoiceRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {options.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)} aria-pressed={value === v} className={clsx("min-h-12 rounded-[14px] border-2 text-[15px] font-semibold transition", value === v ? "border-coral bg-coral-soft" : "border-line bg-paper")}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function AddCustom({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim().toLowerCase()); setV(""); } }}>
      <input value={v} onChange={(e) => setV(e.target.value)} maxLength={28} placeholder={placeholder} className="min-h-12 flex-1 rounded-[14px] border-2 border-line bg-paper px-4 text-[15px] outline-none focus:border-coral" aria-label="Add your own" />
      <Button type="submit" variant="secondary">Add</Button>
    </form>
  );
}

function SelfieCheck({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState(-1);
  const cues = ["Look straight at the camera", "Turn your head slowly left", "Now slowly right", "Give us a smile"];
  useEffect(() => {
    if (phase < 0 || done) return;
    if (phase >= cues.length) { onDone(); return; }
    const t = setTimeout(() => setPhase(phase + 1), 900);
    return () => clearTimeout(t);
  }, [phase, done, onDone, cues.length]);
  const progress = done ? 1 : phase < 0 ? 0 : phase / cues.length;
  return (
    <Card className="mt-5 flex flex-col items-center gap-3 text-center">
      <div className="relative grid h-44 w-44 place-items-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="#E6D6BE" strokeWidth="5" />
          <motion.circle cx="50" cy="50" r="46" fill="none" stroke={done ? "#0F5E55" : "#FF7A5C"} strokeWidth="5" strokeLinecap="round" strokeDasharray="289" animate={{ strokeDashoffset: 289 * (1 - progress) }} transition={{ duration: 0.4 }} />
        </svg>
        <div className="grid h-36 w-36 place-items-center rounded-full bg-vanilla">
          {done ? <Check size={56} className="text-sage-ink" /> : <Coco mood={phase < 0 ? "calm" : "curious"} size={86} bob={false} />}
        </div>
      </div>
      <div aria-live="polite" className="min-h-6 text-[15px] font-semibold">{done ? "Check complete (simulated in this version)" : phase < 0 ? "Liveness and age check" : cues[Math.min(phase, cues.length - 1)]}</div>
      {done ? <Badge>✓ Selfie-checked</Badge> : <Button variant="secondary" onClick={() => setPhase(0)} disabled={phase >= 0}><Camera size={18} /> {phase >= 0 ? "Checking…" : "Start selfie check"}</Button>}
      <PrototypeTag>Simulated here; production uses a verification provider</PrototypeTag>
    </Card>
  );
}

function MomentsStep({ moments, setMoments }: { moments: M[]; setMoments: (m: M[]) => void }) {
  return (
    <section>
      <h1 className="text-[28px] leading-tight">Add your moments</h1>
      <p className="mt-1.5 mb-5 text-muted">3 to 6 photos with a short, honest caption. Little stories beat perfect selfies. The first one is your cover.</p>
      <MomentSlots moments={moments} onChange={setMoments} />
    </section>
  );
}

function VoiceStep({ voice, setVoice }: { voice: { prompt: string; seconds: number; transcript: string; audioUrl?: string } | null; setVoice: (v: { prompt: string; seconds: number; transcript: string; audioUrl?: string } | null) => void }) {
  return (
    <section>
      <h1 className="text-[28px] leading-tight">A 15-second voice note</h1>
      <p className="mt-1.5 mb-4 text-muted">Hearing someone laugh says more than a job title. Optional, but people love these. Listen back and re-record as often as you like.</p>
      <VoiceRecorder value={voice} onChange={setVoice} />
    </section>
  );
}
