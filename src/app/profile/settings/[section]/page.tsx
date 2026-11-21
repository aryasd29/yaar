"use client";
import { PlusLock, PlusTag } from "@/components/PlusBits";
import { DIET, HABIT, LANGUAGES, filterCount, isPlus } from "@/lib/plus";
import { DeleteAccount } from "@/components/DeleteAccount";
import { use, useEffect, useState } from "react";
import clsx from "clsx";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Badge, Button, Card, Chip, EmptyState, Input, SectionLabel, Toggle, TopBar } from "@/components/ui";
import { useYaar } from "@/lib/store";
import { LIVE } from "@/lib/remote";
import { yaarHourLabel } from "@/lib/config";
import { BATTERY, INTENT_SHORT, LOCATION_LABEL, type Battery, type Intent, type Interest, type LocationVisibility } from "@/lib/types";

const TITLES: Record<string, string> = { preferences: "Dating preferences", privacy: "Verification and privacy", battery: "Social battery", notifications: "Notifications", safety: "Safety" };

export default function SettingsPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  return <Frame><Settings section={section} /></Frame>;
}

function Settings({ section }: { section: string }) {
  const me = useRequireMe();
  const { prefs, setPrefs, settings, setSettings, setBattery, updateMe, toast, blocks, people, plus, now } = useYaar();
  const plusOn = isPlus(plus, now());
  const [contact, setContact] = useState(settings.trustedContact ?? { name: "", phone: "" });
  const [contactErr, setContactErr] = useState("");
  if (!me) return <Loading />;
  if (!TITLES[section]) return <><TopBar back="/profile" /><EmptyState title="Setting not found" /></>;

  return (
    <>
      <TopBar back="/profile" title={TITLES[section]} />
      <main className="space-y-4 px-5 pb-12">
        {section === "preferences" && (
          <>
            <Card>
              <SectionLabel>Show me</SectionLabel>
              <div className="grid grid-cols-3 gap-2">{(["women", "men", "everyone"] as Interest[]).map((v) => (
                <button key={v} onClick={() => setPrefs({ interestedIn: v })} aria-pressed={prefs.interestedIn === v} className={clsx("min-h-12 rounded-[14px] border-2 font-semibold capitalize", prefs.interestedIn === v ? "border-coral bg-coral-soft" : "border-line")}>{v}</button>
              ))}</div>
            </Card>
            <Card>
              <SectionLabel>Age range: {prefs.ageMin}–{prefs.ageMax}</SectionLabel>
              <input type="range" min={18} max={45} value={prefs.ageMin} onChange={(e) => setPrefs({ ageMin: Math.min(+e.target.value, prefs.ageMax - 1) })} className="w-full accent-[#FF7A5C]" aria-label="Minimum age" />
              <input type="range" min={19} max={50} value={prefs.ageMax} onChange={(e) => setPrefs({ ageMax: Math.max(+e.target.value, prefs.ageMin + 1) })} className="w-full accent-[#FF7A5C]" aria-label="Maximum age" />
            </Card>
            <Card>
              <SectionLabel>Distance: within {prefs.distanceKm} km</SectionLabel>
              <input type="range" min={2} max={40} value={prefs.distanceKm} onChange={(e) => setPrefs({ distanceKm: +e.target.value })} className="w-full accent-[#FF7A5C]" aria-label="Distance" />
              <p className="text-[12.5px] text-muted">Approximate only. Nobody sees your exact location.</p>
            </Card>
            <Card>
              <SectionLabel>Show people who are looking for</SectionLabel>
              <div className="flex flex-wrap gap-2">{(Object.keys(INTENT_SHORT) as Intent[]).map((k) => (
                <Chip key={k} active={prefs.intents.includes(k)} onClick={() => setPrefs({ intents: prefs.intents.includes(k) ? prefs.intents.filter((x) => x !== k) : [...prefs.intents, k] })}>{INTENT_SHORT[k]}</Chip>
              ))}</div>
            </Card>
            {plusOn ? (
              <Card>
                <SectionLabel>Lifestyle filters</SectionLabel>
                <p className="-mt-1 mb-3 flex items-center gap-2 text-[12.5px] text-muted"><PlusTag /> Only changes who you see. People who left an answer blank still show up.</p>
                {([["Food", "diet", DIET], ["Drinking", "drinks", HABIT], ["Smoking", "smokes", HABIT]] as const).map(([label, key, opts]) => (
                  <div key={key} className="mb-3">
                    <p className="mb-1.5 text-[13px] font-semibold">{label}</p>
                    <div className="flex flex-wrap gap-2">{Object.entries(opts).map(([k, l]) => { const cur = (prefs.lifestyle?.[key] ?? []) as string[]; const on = cur.includes(k); return (
                      <Chip key={k} active={on} onClick={() => setPrefs({ lifestyle: { ...prefs.lifestyle, [key]: on ? cur.filter((x) => x !== k) : [...cur, k] } })}>{l}</Chip>); })}</div>
                  </div>
                ))}
                <p className="mb-1.5 text-[13px] font-semibold">Speaks at least one of</p>
                <div className="flex flex-wrap gap-2">{LANGUAGES.map((l) => { const cur = prefs.lifestyle?.languages ?? []; const on = cur.includes(l); return (
                  <Chip key={l} active={on} onClick={() => setPrefs({ lifestyle: { ...prefs.lifestyle, languages: on ? cur.filter((x) => x !== l) : [...cur, l] } })}>{l}</Chip>); })}</div>
                {filterCount(prefs) > 0 && <button className="mt-3 min-h-10 text-[13.5px] font-semibold underline underline-offset-2" onClick={() => setPrefs({ lifestyle: {} })}>Clear lifestyle filters</button>}
              </Card>
            ) : (
              <PlusLock title="Lifestyle filters" body="Filter your introductions by food habits, drinking, smoking and languages." />
            )}
            <p className="text-center text-[12.5px] text-muted">Changes apply to your next drop.</p>
          </>
        )}

        {section === "privacy" && (
          <>
            <Card tone="sage" className="flex items-center gap-3"><ShieldCheck className="text-sage-ink" /><div><p className="font-semibold text-sage-ink">Selfie and age verified</p><p className="text-[13px] text-sage-ink/80">Verified means you passed our checks. It isn&apos;t a guarantee of anyone&apos;s character.</p></div></Card>
            <Card id="location">
              <SectionLabel>Location others see</SectionLabel>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Location others see">
                {(Object.keys(LOCATION_LABEL) as LocationVisibility[]).map((v) => {
                  const on = (settings.locationVisibility ?? "area") === v;
                  return <button key={v} role="radio" aria-checked={on} onClick={() => setSettings({ locationVisibility: v })} className={clsx("min-h-12 rounded-[14px] border-2 px-2 text-[14px] font-semibold", on ? "border-charcoal bg-sage" : "border-line bg-paper")}>{LOCATION_LABEL[v]}</button>;
                })}
              </div>
              <p className="mt-2 text-[12.5px] text-muted">{(settings.locationVisibility ?? "area") === "area" ? `Others see "${me.area}, Bengaluru".` : (settings.locationVisibility === "city" ? "Others see \"Bengaluru\" only." : "Your location isn't shown.")} Your exact location is never shared, and distance matching stays approximate.</p>
            </Card>
            <Card className="space-y-3">
              <Input label="Workplace (private)" value={me.work ?? ""} onChange={(e) => updateMe({ work: e.target.value || undefined })} placeholder="Company" />
              <Input label="College (private)" value={me.college ?? ""} onChange={(e) => updateMe({ college: e.target.value || undefined })} placeholder="College" />
              <Toggle checked={settings.hideFromWork} onChange={(v) => setSettings({ hideFromWork: v })} label="Hide me from colleagues" />
              <Toggle checked={settings.hideFromCollege} onChange={(v) => setSettings({ hideFromCollege: v })} label="Hide me from classmates" />
              {plusOn
                ? <Toggle checked={!!me?.incognito} onChange={(v) => updateMe({ incognito: v })} label="Incognito (Plus)" description="Only people you've reacted to can see your scrapbook. You can still see everyone in your Tide." />
                : <PlusLock compact title="Incognito mode" body="" />}
              <Toggle checked={settings.showWorkAfterMatch} onChange={(v) => setSettings({ showWorkAfterMatch: v })} label="Show work and college to matches" description="Never shown before a match" />
              <p className="text-[12.5px] text-muted">This lowers the chance colleagues see you, but someone could still recognise your photos.</p>
            </Card>
            <Card className="space-y-1">
              <SectionLabel>AI and your chats</SectionLabel>
              <Toggle checked={settings.aiHelp} onChange={(v) => setSettings({ aiHelp: v })} label="Help me reply" description="Reads your last few messages only when you tap it. Nothing is stored or used for ads." />
              <Toggle checked={settings.redFlagRadar} onChange={(v) => setSettings({ redFlagRadar: v })} label="Red Flag Radar" description="Checks incoming messages for scam and pressure patterns, on your device." />
              <Toggle checked={settings.conversationPulse} onChange={(v) => setSettings({ conversationPulse: v })} label="Conversation Pulse" description="Gentle tips when a chat stalls. Never guesses anyone's feelings." />
            </Card>
            <Card className="space-y-2">
              <SectionLabel>Your data</SectionLabel>
              <Button variant="secondary" full className="!justify-start" onClick={() => {
                const blob = new Blob([JSON.stringify(useYaar.getState(), null, 2)], { type: "application/json" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "my-yaar-data.json"; a.click();
              }}><Download size={18} /> Download my data</Button>
              <DeleteAccount trigger={(open) => <Button variant="danger" full className="!justify-start" onClick={open}><Trash2 size={18} /> Delete account</Button>} />
              <p className="text-[12px] text-muted">You can withdraw consent any time. Deleting removes your profile from drops and closes your matches with a neutral note.</p>
            </Card>
          </>
        )}

        {section === "battery" && (
          <div className="space-y-2.5">
            <p className="text-[14px] text-muted">Only you see this. It controls new introductions and reminders, never how others see you.</p>
            {(Object.keys(BATTERY) as Battery[]).map((b) => (
              <button key={b} onClick={() => setBattery(b)} aria-pressed={me.battery === b} className={clsx("flex min-h-16 w-full items-center gap-3 rounded-[18px] border-2 px-4 text-left", me.battery === b ? "border-sage-ink bg-sage-soft" : "border-line bg-paper")}>
                <span className="text-[26px]" aria-hidden>{BATTERY[b].emoji}</span>
                <span><span className="block font-semibold">{BATTERY[b].label}</span><span className="block text-[13.5px] text-muted">{BATTERY[b].desc}</span></span>
              </button>
            ))}
            <Card tone="peri" className="text-[13.5px] text-peri-ink"><b>Full:</b> up to 6 introductions a day. <b>Some energy:</b> 4 a day, fewer nudges. <b>Low:</b> no new drops or reminders; chats stay open.</Card>
          </div>
        )}

        {section === "notifications" && <DevicePush />}
        {section === "notifications" && (
          <Card className="space-y-1">
            {([["yaarHour", "Tide", `Your daily bottles at ${yaarHourLabel()}`], ["reactions", "Reactions", "When someone reacts to your scrapbook"], ["messages", "Messages", "New chat messages"], ["dateReminders", "Date reminders", "The day before and an hour before"]] as const).map(([k, l, d]) => (
              <Toggle key={k} checked={settings.notifications[k]} onChange={(v) => setSettings({ notifications: { ...settings.notifications, [k]: v } })} label={l} description={d} />
            ))}
            <p className="pt-2 text-[12.5px] text-muted">No streaks, no &quot;you&apos;re missing out&quot; pings. Ever.</p>
          </Card>
        )}

        {section === "safety" && (
          <>
            <Card>
              <SectionLabel>Trusted contact</SectionLabel>
              <p className="mb-3 text-[13.5px] text-muted">They get your date&apos;s place and time when you choose to share it.</p>
              <div className="space-y-3">
                <Input label="Name" value={contact.name} onChange={(e) => { setContact({ ...contact, name: e.target.value }); setContactErr(""); }} placeholder="Priya" />
                <Input label="Phone" inputMode="numeric" value={contact.phone} onChange={(e) => { setContact({ ...contact, phone: e.target.value.replace(/[^\d ]/g, "") }); setContactErr(""); }} placeholder="98450 00000" error={contactErr} />
                <Button full onClick={() => {
                  if (!contact.name.trim()) return setContactErr("Add their name too.");
                  if (!/^[6-9]\d{9}$/.test(contact.phone.replace(/\s/g, ""))) return setContactErr("Enter a valid 10-digit mobile number.");
                  setSettings({ trustedContact: contact }); toast("Trusted contact saved", "good");
                }}>Save contact</Button>
              </div>
            </Card>
            <Card>
              <SectionLabel>Blocked ({blocks.length})</SectionLabel>
              {blocks.length ? <div className="flex flex-wrap gap-2">{blocks.map((b) => <Badge key={b} tone="coral">{people.find((p) => p.id === b)?.name ?? "Someone"}</Badge>)}</div> : <p className="text-[14px] text-muted">Nobody blocked.</p>}
            </Card>
            <Card tone="butter" className="space-y-1.5 text-[14px] text-butter-ink">
              <SectionLabel>Dating safely</SectionLabel>
              <p>Meet in public places, tell a friend, and get yourself there and back.</p>
              <p>Never send money or share OTPs, ID numbers or your home address.</p>
              <p>Leave whenever you want. You never owe anyone a date.</p>
              <a href="tel:112" className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-danger px-4 font-semibold text-white">Emergency: 112</a>
            </Card>
          </>
        )}
      </main>
    </>
  );
}

/** Push notifications on this phone or computer (live app, needs the server's VAPID keys). */
function DevicePush() {
  const toast = useYaar((s) => s.toast);
  const [on, setOn] = useState<boolean | null>(null);
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    if (!LIVE) { setSupported(false); return; }
    void import("@/lib/live").then(async (l) => { setSupported(l.pushSupported()); setOn(await l.pushEnabled()); });
  }, []);
  if (!LIVE) return null;
  return (
    <Card className="mb-3">
      {supported ? (
        <Toggle checked={!!on} onChange={async (v) => {
          const l = await import("@/lib/live");
          if (v) { const err = await l.enablePush(); if (err) return toast(err, "warn"); setOn(true); toast("Notifications are on for this device.", "good"); }
          else { await l.disablePush(); setOn(false); toast("Notifications are off for this device.", "info"); }
        }} label="Notifications on this device" description="Matches, messages and date updates, even when Isle is closed. Message text is never shown in a notification." />
      ) : (
        <p className="text-[13.5px] text-muted">Push notifications aren&apos;t available in this browser. On iPhone, add Isle to your Home Screen (Share, then Add to Home Screen) and open it from there.</p>
      )}
    </Card>
  );
}
