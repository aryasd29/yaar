import type { DateIdea, Profile, TableEvent, Venue } from "./types";

export const THIS_OR_THAT: { id: string; a: string; b: string }[] = [
  { id: "mount", a: "Mountains", b: "Beaches" },
  { id: "text", a: "Text", b: "Call" },
  { id: "dosa", a: "Dosa", b: "Idli" },
  { id: "bird", a: "Early bird", b: "Night owl" },
  { id: "plan", a: "Plan it all", b: "Wing it" },
  { id: "chai", a: "Chai", b: "Filter coffee" },
  { id: "stay", a: "Night in", b: "Night out" },
  { id: "music", a: "Old Bollywood", b: "Indie" },
  { id: "pets", a: "Dogs", b: "Cats" },
  { id: "trip", a: "Road trip", b: "Flight" },
];

const tot = (s: string) => Object.fromEntries(THIS_OR_THAT.map((q, i) => [q.id, s[i] === "a" ? "a" : "b"])) as Record<string, "a" | "b">;

/** Simulated people for the demo world. Photos are illustrations; real users upload their own. */
export const DEMO_PEOPLE: Profile[] = [
  {
    id: "u_ananya", name: "Ananya", age: 24, gender: "woman", pronouns: "she/her", area: "Koramangala", verified: true, intent: "serious", battery: "full", reliable: true,
    moments: [
      { id: "m1", scene: "sunrise", caption: "3am, top of Skandagiri, zero regrets" },
      { id: "m2", scene: "plant", caption: "my plant Kevin, somehow alive" },
      { id: "m3", scene: "dosa", caption: "idli vada supremacy" },
    ],
    starterPack: ["filter coffee", "sunrise treks", "overplans trips", "kishore kumar at 2am"],
    hotTake: "The best filter coffee is a tiny darshini. Fight me.",
    voice: { prompt: "My most Bengaluru story", seconds: 15, transcript: "An auto driver once gave me a full TED talk on the metro's failures. Best ride of my life." },
    thisOrThat: tot("aabaabbaab"), interests: ["coffee", "trekking", "plants", "food", "music"],
    work: "Product designer", college: "NID", demo: { reactsBack: true, replies: ["haha okay that's fair", "wait tell me more", "honestly same", "ok you're funny, i'll give you that 😄"] },
  },
  {
    id: "u_kabir", name: "Kabir", age: 26, gender: "man", pronouns: "he/him", area: "HSR Layout", verified: true, intent: "open", battery: "full",
    moments: [
      { id: "m1", scene: "guitar", caption: "open mic. played 2 songs, forgot 1" },
      { id: "m2", scene: "dog", caption: "this is Bruno. he's the main character" },
      { id: "m3", scene: "concert", caption: "front row or nothing" },
    ],
    starterPack: ["open mics", "dog dad", "terrible puns", "biryani rankings"],
    hotTake: "Pineapple on pizza is fine and I'll die on this hill.",
    voice: { prompt: "A song I can't stop playing", seconds: 14, transcript: "Currently Prateek Kuhad on loop. Judge me, I can take it." },
    thisOrThat: tot("bbabbbaabb"), interests: ["music", "dogs", "food", "concerts"],
    work: "Backend engineer", college: "RVCE", demo: { reactsBack: true, replies: ["hahaha", "okay that's a solid take", "Bruno says hi 🐶", "we should argue about biryani in person"] },
  },
  {
    id: "u_meera", name: "Meera", age: 25, gender: "woman", pronouns: "she/her", area: "Indiranagar", verified: true, intent: "serious", battery: "some", reliable: true,
    moments: [
      { id: "m1", scene: "books", caption: "my to-read pile is a cry for help" },
      { id: "m2", scene: "coffee", caption: "third cup, no regrets" },
      { id: "m3", scene: "rain", caption: "monsoon walks only" },
    ],
    starterPack: ["secondhand bookstores", "monsoon walks", "annotating everything", "bad puns"],
    hotTake: "Re-reading a favourite book beats reading something new.",
    voice: { prompt: "What I'm reading right now", seconds: 15, transcript: "A very long Russian novel I'm pretending to understand." },
    thisOrThat: tot("abbaabaaba"), interests: ["books", "coffee", "rain", "writing"],
    work: "Content strategist", college: "Christ University", demo: { reactsBack: true, replies: ["oh I love that", "okay now I'm curious", "you'd like this one bookstore in Indiranagar"] },
  },
  {
    id: "u_arjun", name: "Arjun", age: 27, gender: "man", pronouns: "he/him", area: "Jayanagar", verified: true, intent: "serious", battery: "full", reliable: true,
    moments: [
      { id: "m1", scene: "boardgame", caption: "undefeated at Catan (allegedly)" },
      { id: "m2", scene: "cycle", caption: "sunday rides to Lalbagh" },
      { id: "m3", scene: "kitchen", caption: "my one signature dish: eggs" },
    ],
    starterPack: ["board games", "cycling", "cooking experiments", "old Bollywood"],
    hotTake: "Board games are the best first date. You learn everything.",
    voice: { prompt: "My most Bengaluru story", seconds: 13, transcript: "I've lived here five years and I still get lost in Malleshwaram." },
    thisOrThat: tot("abaaabaaba"), interests: ["boardgames", "cycling", "food"],
    work: "Data analyst", college: "PES University", demo: { reactsBack: true, replies: ["haha okay", "fair point", "do you play any board games?"] },
  },
  {
    id: "u_rhea", name: "Rhea", age: 23, gender: "woman", pronouns: "she/her", area: "Whitefield", verified: true, intent: "figuring", battery: "full",
    moments: [
      { id: "m1", scene: "pottery", caption: "made a bowl. it's a plate now" },
      { id: "m2", scene: "cat", caption: "Mochi, my landlord" },
    ],
    starterPack: ["pottery class", "cat person", "rainy day playlists", "momos"],
    hotTake: "Monsoon is the best season and it isn't close.",
    voice: { prompt: "A tiny thing that made my week", seconds: 12, transcript: "Mochi finally sat on my lap. Huge week." },
    thisOrThat: tot("babbbbaabb"), interests: ["pottery", "cats", "art", "music"],
    work: "UX researcher", demo: { reactsBack: false },
  },
  {
    id: "u_sana", name: "Sana", age: 24, gender: "woman", pronouns: "she/her", area: "Malleshwaram", verified: true, intent: "open", battery: "full",
    moments: [
      { id: "m1", scene: "city", caption: "rooftop sunsets > rooftop parties" },
      { id: "m2", scene: "beach", caption: "Gokarna, 2am plan, 6am bus" },
      { id: "m3", scene: "coffee", caption: "work from café era" },
    ],
    starterPack: ["voice notes", "spontaneous trips", "street food", "sketching"],
    hotTake: "Voice notes are better than texting. Always.",
    voice: { prompt: "My most Bengaluru story", seconds: 15, transcript: "I moved here for work and the first thing I learned was to always carry a jacket." },
    thisOrThat: tot("bbaabbbabb"), interests: ["travel", "coffee", "art", "food"],
    work: "Marketing", demo: { reactsBack: true, replies: ["haha love that", "okay voice note incoming later", "where are you from originally?"] },
  },
  {
    id: "u_dev", name: "Dev", age: 25, gender: "man", pronouns: "he/him", area: "Indiranagar", verified: true, intent: "casual", battery: "some",
    moments: [
      { id: "m1", scene: "concert", caption: "gigs every weekend I can" },
      { id: "m2", scene: "dosa", caption: "CTR butter dosa pilgrimage" },
    ],
    starterPack: ["live gigs", "butter dosa", "cricket arguments", "sneakers"],
    hotTake: "Bengaluru traffic is a personality trait.",
    voice: { prompt: "A song I can't stop playing", seconds: 11, transcript: "The Local Train, always. Non-negotiable." },
    thisOrThat: tot("bbabbbbbab"), interests: ["music", "food", "cricket"],
    work: "Sales", demo: { reactsBack: false },
  },
  {
    id: "u_ishita", name: "Ishita", age: 26, gender: "woman", pronouns: "she/her", area: "BTM Layout", verified: true, intent: "open", battery: "full",
    moments: [
      { id: "m1", scene: "boardgame", caption: "game night host, ruthless" },
      { id: "m2", scene: "books", caption: "library card, very active" },
      { id: "m3", scene: "plant", caption: "plant mom of 14" },
    ],
    starterPack: ["game nights", "library card", "plant mom", "chai over coffee"],
    hotTake: "Chai is better than filter coffee. I said what I said.",
    voice: { prompt: "A tiny thing that made my week", seconds: 14, transcript: "My monstera grew a new leaf. I texted everyone." },
    thisOrThat: tot("aaabababba"), interests: ["boardgames", "books", "plants"],
    work: "HR", demo: { reactsBack: true, replies: ["hahaha okay", "game night soon?", "chai or coffee, choose wisely"] },
  },
  {
    id: "u_nikhil", name: "Nikhil", age: 28, gender: "man", pronouns: "he/him", area: "Bellandur", verified: true, intent: "serious", battery: "full", reliable: true,
    moments: [
      { id: "m1", scene: "sunrise", caption: "Nandi Hills at 5am, worth it" },
      { id: "m2", scene: "cycle", caption: "100km club, barely" },
    ],
    starterPack: ["early mornings", "long rides", "masala chai", "documentaries"],
    hotTake: "The best plans are made the night before.",
    voice: { prompt: "My most Bengaluru story", seconds: 15, transcript: "Biked to Nandi Hills, it rained, we laughed the whole way down." },
    thisOrThat: tot("aaaaabaabb"), interests: ["cycling", "trekking", "food"],
    work: "Mechanical engineer", demo: { reactsBack: true, replies: ["haha true", "have you been to Nandi Hills?", "sounds fun"] },
  },
  {
    id: "u_tara", name: "Tara", age: 24, gender: "woman", pronouns: "she/her", area: "Sadashivanagar", verified: true, intent: "companionship", battery: "some",
    moments: [
      { id: "m1", scene: "kitchen", caption: "baking at midnight, again" },
      { id: "m2", scene: "cat", caption: "Pepper judges my bakes" },
    ],
    starterPack: ["midnight baking", "cat mom", "musicals", "long walks"],
    hotTake: "Musicals are the most underrated movies.",
    voice: { prompt: "A tiny thing that made my week", seconds: 13, transcript: "My sourdough finally rose. I may have cried." },
    thisOrThat: tot("bababbabbb"), interests: ["baking", "cats", "music"],
    work: "Teacher", demo: { reactsBack: true, replies: ["aww thank you", "do you bake?", "haha okay"] },
  },
  {
    id: "u_rohan", name: "Rohan", age: 25, gender: "man", pronouns: "he/him", area: "Koramangala", verified: true, intent: "open", battery: "full",
    moments: [
      { id: "m1", scene: "books", caption: "secondhand book hunt on Church Street" },
      { id: "m2", scene: "coffee", caption: "pour-over nerd, sorry" },
      { id: "m3", scene: "rain", caption: "walked home in this. worth it" },
    ],
    starterPack: ["Church Street books", "pour-over coffee", "long walks", "quizzing"],
    hotTake: "A good bookstore is the best date spot in the city.",
    voice: { prompt: "What I'm reading right now", seconds: 15, transcript: "A book about the history of maps. Yes, I'm that person." },
    thisOrThat: tot("aaababaaab"), interests: ["books", "coffee", "quizzing"],
    work: "Software engineer", demo: { reactsBack: true, replies: ["haha fair", "okay which book though", "Church Street this weekend?"] },
  },
  {
    id: "u_zoya", name: "Zoya", age: 27, gender: "woman", pronouns: "she/her", area: "Frazer Town", verified: true, intent: "serious", battery: "full",
    moments: [
      { id: "m1", scene: "dosa", caption: "Ramzan street food walk, every year" },
      { id: "m2", scene: "city", caption: "golden hour on MG Road" },
    ],
    starterPack: ["street food walks", "photography", "old Bollywood", "sunday brunch"],
    hotTake: "Brunch is just breakfast with confidence.",
    voice: { prompt: "My most Bengaluru story", seconds: 14, transcript: "I've eaten my way through every lane of Frazer Town. Ask me anything." },
    thisOrThat: tot("abbaaaaaab"), interests: ["food", "photography", "music"],
    work: "Architect", demo: { reactsBack: true, replies: ["hahaha", "you'd love the food walks", "okay deal"] },
  },
  {
    id: "u_aditya", name: "Aditya", age: 26, gender: "man", pronouns: "he/him", area: "Whitefield", verified: true, intent: "figuring", battery: "some",
    moments: [
      { id: "m1", scene: "pottery", caption: "pottery class, made a very honest mug" },
      { id: "m2", scene: "beach", caption: "Varkala, would go back tomorrow" },
    ],
    starterPack: ["pottery", "beach trips", "anime", "maggi at 1am"],
    hotTake: "Maggi at 1am is a love language.",
    voice: { prompt: "A tiny thing that made my week", seconds: 12, transcript: "My mug didn't crack in the kiln. Proud parent." },
    thisOrThat: tot("bbbbbbbaab"), interests: ["pottery", "travel", "anime"],
    work: "QA engineer", demo: { reactsBack: false },
  },
  {
    id: "u_sam", name: "Sam", age: 25, gender: "nonbinary", pronouns: "they/them", area: "Indiranagar", verified: true, intent: "open", battery: "full",
    moments: [
      { id: "m1", scene: "concert", caption: "indie gigs, always" },
      { id: "m2", scene: "plant", caption: "balcony garden progress" },
    ],
    starterPack: ["indie gigs", "balcony garden", "thrift finds", "zines"],
    hotTake: "Thrift stores have better clothes than malls.",
    voice: { prompt: "A song I can't stop playing", seconds: 13, transcript: "Something by When Chai Met Toast. Every single morning." },
    thisOrThat: tot("abbbbbbbab"), interests: ["music", "plants", "art"],
    work: "Illustrator", demo: { reactsBack: true, replies: ["haha love it", "what are you listening to lately?", "okay that's cute"] },
  },
];

export const DATE_CATALOG: DateIdea[] = [
  { id: "coffee", activity: "coffee", title: "Coffee and conversation", blurb: "Easy, low-pressure, and you can stay as long as it's fun.", tags: ["coffee", "books", "writing", "travel"], emoji: "☕" },
  { id: "bookstore", activity: "bookstore", title: "Bookstore wander", blurb: "Pick a book for each other. Explain your choice.", tags: ["books", "quizzing", "writing"], emoji: "📚" },
  { id: "pottery", activity: "pottery", title: "Beginner pottery class", blurb: "Messy hands, zero awkward silences.", tags: ["pottery", "art", "anime"], emoji: "🏺" },
  { id: "boardgames", activity: "boardgames", title: "Board game café", blurb: "Friendly competition. You'll learn a lot.", tags: ["boardgames", "quizzing"], emoji: "🎲" },
  { id: "brunch", activity: "brunch", title: "Weekend brunch", blurb: "Dosa, coffee and a long chat.", tags: ["food", "baking", "photography"], emoji: "🥞" },
  { id: "walk", activity: "walk", title: "Morning walk in Cubbon Park", blurb: "Fresh air, a public space, coffee after.", tags: ["plants", "cycling", "trekking", "rain", "dogs"], emoji: "🌳" },
  { id: "gig", activity: "gig", title: "Live music evening", blurb: "Catch a small indie gig together.", tags: ["music", "concerts"], emoji: "🎸" },
  { id: "art", activity: "art", title: "Sketch and sip workshop", blurb: "Draw badly, laugh a lot.", tags: ["art", "photography", "cats"], emoji: "🎨" },
];

/** Fictional venues. Mock data for the prototype; no real availability or bookings. */
export const VENUES: Venue[] = [
  { id: "v1", activity: "coffee", name: "Kaapi & Kitaab", area: "Indiranagar", price: "₹300 for two", perk: "Free filter coffee for Isle dates", partner: true, scene: "coffee", address: "12th Main, Indiranagar" },
  { id: "v2", activity: "coffee", name: "Third Cup Roasters", area: "Koramangala", price: "₹450 for two", partner: false, scene: "coffee", address: "5th Block, Koramangala" },
  { id: "v3", activity: "bookstore", name: "Dog-Eared Pages", area: "Church Street", price: "Free to browse", perk: "10% off any book you pick for each other", partner: true, scene: "books", address: "Church Street, CBD" },
  { id: "v4", activity: "pottery", name: "Wobbly Wheel Studio", area: "HSR Layout", price: "₹1,200 per person", perk: "Glazing included", partner: true, scene: "pottery", address: "Sector 2, HSR Layout" },
  { id: "v5", activity: "boardgames", name: "Dice & Dosa", area: "HSR Layout", price: "₹250 per person", perk: "First hour free", partner: true, scene: "boardgame", address: "27th Main, HSR Layout" },
  { id: "v6", activity: "boardgames", name: "Meeple Corner", area: "Jayanagar", price: "₹200 per person", partner: false, scene: "boardgame", address: "4th Block, Jayanagar" },
  { id: "v7", activity: "brunch", name: "Sunny Side Kitchen", area: "Indiranagar", price: "₹900 for two", perk: "Complimentary dessert", partner: true, scene: "kitchen", address: "100 Feet Road, Indiranagar" },
  { id: "v8", activity: "walk", name: "Cubbon Park, Bandstand gate", area: "CBD", price: "Free", partner: false, scene: "plant", address: "Kasturba Road entrance" },
  { id: "v9", activity: "gig", name: "The Little Stage", area: "Koramangala", price: "₹500 per person", perk: "Reserved seats", partner: true, scene: "concert", address: "6th Block, Koramangala" },
  { id: "v10", activity: "art", name: "Doodle Den", area: "Malleshwaram", price: "₹700 per person", perk: "Materials included", partner: true, scene: "city", address: "8th Cross, Malleshwaram" },
];

/** Sample Tables. Not real events: shown with a "Sample" label and can't be booked. */
export const DEMO_TABLES: TableEvent[] = [
  { id: "t1", title: "Thursday dinner, new in Bengaluru", circle: "New to Bengaluru", area: "Koramangala", dayOffset: 2, time: "8:00 PM", seats: 6, left: 2, price: 149, scene: "dosa", photoQuery: "friends dinner table restaurant", blurb: "Six newcomers, one long table, South Indian thali. A host keeps the conversation going." },
  { id: "t2", title: "Board games night", circle: "Board games", area: "HSR Layout", dayOffset: 4, time: "7:00 PM", seats: 6, left: 3, price: 199, scene: "boardgame", photoQuery: "board game cafe friends", blurb: "Beginner-friendly games, a game master to teach the rules, and snacks." },
  { id: "t3", title: "Silent book club", circle: "Readers", area: "Indiranagar", dayOffset: 5, time: "11:00 AM", seats: 8, left: 5, price: 0, scene: "books", photoQuery: "people reading books cafe", blurb: "An hour of reading whatever you like, then coffee and book talk." },
  { id: "t4", title: "Sunrise trek to Skandagiri", circle: "Trekking", area: "Hebbal", dayOffset: 4, time: "3:00 AM", seats: 8, left: 1, price: 899, scene: "sunrise", photoQuery: "sunrise hill trek india", blurb: "Night trek with a certified guide, transport from Hebbal included." },
  { id: "t5", title: "Photo walk: old Bengaluru", circle: "Photography", area: "Basavanagudi", dayOffset: 5, time: "7:00 AM", seats: 6, left: 4, price: 0, scene: "city", photoQuery: "street photography walk india", blurb: "Bull Temple, Gandhi Bazaar and filter coffee. Any camera or phone works." },
  { id: "t6", title: "Sunday brunch club", circle: "Foodies", area: "Indiranagar", dayOffset: 5, time: "12:30 PM", seats: 6, left: 2, price: 249, scene: "kitchen", photoQuery: "brunch table friends", blurb: "A new brunch spot every week, split the bill, rate the dosa." },
  { id: "t7", title: "Beginner pottery evening", circle: "Art and making", area: "HSR Layout", dayOffset: 1, time: "6:30 PM", seats: 6, left: 0, price: 1200, scene: "pottery", photoQuery: "pottery wheel class", blurb: "Throw your first bowl. Glazing and firing included." },
  { id: "t8", title: "Indie gig and chill", circle: "Music and gigs", area: "Koramangala", dayOffset: 3, time: "8:30 PM", seats: 8, left: 6, price: 300, scene: "concert", photoQuery: "small indie gig crowd", blurb: "Small venue, local bands, a Table reserved near the stage." },
  { id: "t9", title: "Cubbon Park morning walk", circle: "New to Bengaluru", area: "CBD", dayOffset: 0, time: "7:00 AM", seats: 8, left: 3, price: 0, scene: "plant", photoQuery: "park morning walk trees", blurb: "An easy loop through the park, then breakfast at a darshini." },
  { id: "t10", title: "Quiz night", circle: "Board games", area: "Jayanagar", dayOffset: 6, time: "7:30 PM", seats: 6, left: 4, price: 150, scene: "boardgame", photoQuery: "pub quiz night friends", blurb: "Teams of three, general knowledge and Bollywood rounds." },
];

export const TABLE_AREAS = [...new Set(DEMO_TABLES.map((t) => t.area))].sort();
export const TABLE_CATEGORIES = [...new Set(DEMO_TABLES.map((t) => t.circle))].sort();

export function tableDate(t: Pick<TableEvent, "dayOffset" | "time" | "startsAt">, now: number) {
  if (t.startsAt) return new Date(t.startsAt);
  const d = new Date(now);
  d.setDate(d.getDate() + t.dayOffset);
  const [hm, ap] = t.time.split(" ");
  const [h, m] = hm.split(":").map(Number);
  d.setHours((h % 12) + (ap === "PM" ? 12 : 0), m, 0, 0);
  return d;
}
export const fmtTableWhen = (d: Date) => d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const fmtPrice = (n: number) => (n === 0 ? "Free" : `₹${n.toLocaleString("en-IN")}`);

export const CIRCLES = [
  { id: "c1", name: "New to Bengaluru", members: 1240, emoji: "🧭" },
  { id: "c2", name: "Board games", members: 860, emoji: "🎲" },
  { id: "c3", name: "Readers", members: 712, emoji: "📚" },
  { id: "c4", name: "Trekking", members: 655, emoji: "⛰️" },
  { id: "c5", name: "Foodies", members: 1530, emoji: "🍜" },
  { id: "c6", name: "Photography", members: 420, emoji: "📷" },
  { id: "c7", name: "Music and gigs", members: 980, emoji: "🎧" },
  { id: "c8", name: "Art and making", members: 390, emoji: "🏺" },
];

export const STARTER_SUGGESTIONS = [
  "filter coffee", "sunrise treks", "board games", "secondhand books", "live gigs", "dog person", "cat person", "street food",
  "long walks", "midnight maggi", "old Bollywood", "pottery", "cycling", "baking", "photography", "plant parent", "quizzing", "travel plans",
];

export const HOT_TAKE_PROMPTS = [
  "Pineapple on pizza is…", "The most overrated thing about Bengaluru is…", "The best first date is…", "Texting back fast is…",
];

export const VOICE_PROMPTS = ["My most Bengaluru story", "A tiny thing that made my week", "A song I can't stop playing", "What I'm reading right now"];

export const INTEREST_TAGS = ["coffee", "books", "trekking", "music", "food", "boardgames", "pottery", "art", "cycling", "plants", "travel", "photography", "dogs", "cats", "baking", "concerts", "quizzing"];

/** Demo-only match used to show the Red Flag Radar. Never appears in drops. */
export const RADAR_DEMO: Record<"woman" | "man", Profile> = {
  man: {
    id: "u_vikram", name: "Vikram", age: 27, gender: "man", area: "Marathahalli", verified: true, intent: "casual", battery: "low",
    moments: [{ id: "m1", scene: "city", caption: "city lights" }], starterPack: ["travel", "gym", "cars"], hotTake: "Life is short, take risks.",
    thisOrThat: {}, interests: ["travel"], demo: { reactsBack: false, replies: ["?", "come on, it's just 2000"] },
  },
  woman: {
    id: "u_riya", name: "Riya", age: 25, gender: "woman", area: "Marathahalli", verified: true, intent: "casual", battery: "low",
    moments: [{ id: "m1", scene: "beach", caption: "beach days" }], starterPack: ["travel", "fashion", "crypto"], hotTake: "Life is short, take risks.",
    thisOrThat: {}, interests: ["travel"], demo: { reactsBack: false, replies: ["?", "please it's urgent"] },
  },
};
