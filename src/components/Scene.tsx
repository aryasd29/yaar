/* Illustrated stand-ins for demo users' photos. Real users upload their own photos. */
export type SceneKey =
  | "sunrise" | "plant" | "coffee" | "books" | "beach" | "guitar" | "city" | "dog"
  | "dosa" | "pottery" | "boardgame" | "cat" | "rain" | "cycle" | "concert" | "kitchen";

const C = { coral: "#FF7A5C", butter: "#FFC94D", sage: "#6FD1BF", peri: "#7DB9EC", vanilla: "#F4E7D3", ink: "#1b2d45", white: "#FFF9F0" };

export function Scene({ k, className }: { k: SceneKey | string; className?: string }) {
  const s = scenes[k as SceneKey] ?? scenes.city;
  return (
    <svg viewBox="0 0 200 200" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {s}
    </svg>
  );
}

const scenes: Record<SceneKey, React.ReactNode> = {
  sunrise: (<>
    <rect width="200" height="200" fill={C.butter} /><circle cx="100" cy="120" r="38" fill={C.coral} />
    <path d="M0 150 L50 95 L85 130 L125 80 L200 150 V200 H0Z" fill={C.ink} opacity=".85" />
    <path d="M0 170 Q60 150 120 168 T200 160 V200 H0Z" fill={C.peri} opacity=".9" />
  </>),
  plant: (<>
    <rect width="200" height="200" fill={C.sage} /><rect x="0" y="150" width="200" height="50" fill={C.vanilla} />
    <path d="M78 150 H122 L116 186 H84Z" fill={C.coral} />
    <path d="M100 150 C100 110 70 100 62 70 C90 80 100 100 100 150 C100 100 120 70 146 62 C140 96 112 110 100 150" fill="#1F8A7A" />
  </>),
  coffee: (<>
    <rect width="200" height="200" fill={C.peri} /><ellipse cx="100" cy="150" rx="70" ry="16" fill={C.white} />
    <path d="M60 90 H140 V130 Q140 152 100 152 Q60 152 60 130Z" fill={C.white} />
    <path d="M140 100 Q162 100 158 120 Q154 134 138 132" stroke={C.white} strokeWidth="9" fill="none" />
    <ellipse cx="100" cy="92" rx="38" ry="7" fill="#8A5A3C" />
    <path d="M86 70 Q80 58 88 48 M104 72 Q98 58 106 46" stroke={C.white} strokeWidth="4" fill="none" strokeLinecap="round" />
  </>),
  books: (<>
    <rect width="200" height="200" fill={C.vanilla} /><rect x="0" y="160" width="200" height="40" fill="#C9A982" />
    <rect x="30" y="70" width="26" height="90" fill={C.coral} /><rect x="58" y="60" width="22" height="100" fill={C.peri} />
    <rect x="82" y="80" width="30" height="80" fill={C.sage} /><rect x="114" y="66" width="20" height="94" fill={C.butter} />
    <rect x="136" y="88" width="34" height="72" fill={C.ink} transform="rotate(8 153 124)" />
  </>),
  beach: (<>
    <rect width="200" height="200" fill="#CFE6FA" /><circle cx="150" cy="56" r="22" fill={C.butter} />
    <path d="M0 120 Q50 110 100 122 T200 116 V200 H0Z" fill={C.peri} /><path d="M0 150 Q70 138 200 152 V200 H0Z" fill="#F3DDB8" />
  </>),
  guitar: (<>
    <rect width="200" height="200" fill={C.coral} />
    <g transform="rotate(-30 100 110)"><rect x="94" y="20" width="12" height="90" fill={C.ink} />
      <circle cx="100" cy="130" r="34" fill={C.butter} /><circle cx="100" cy="104" r="24" fill={C.butter} />
      <circle cx="100" cy="122" r="9" fill={C.ink} /></g>
  </>),
  city: (<>
    <rect width="200" height="200" fill={C.peri} /><circle cx="150" cy="50" r="16" fill={C.white} />
    <rect x="20" y="90" width="40" height="110" fill={C.ink} /><rect x="64" y="60" width="36" height="140" fill="#2C4260" />
    <rect x="104" y="100" width="30" height="100" fill={C.ink} /><rect x="138" y="76" width="44" height="124" fill="#2C4260" />
    {[0, 1, 2, 3, 4].map(i => <rect key={i} x={72} y={72 + i * 22} width="8" height="8" fill={C.butter} />)}
  </>),
  dog: (<>
    <rect width="200" height="200" fill={C.butter} />
    <ellipse cx="100" cy="128" rx="52" ry="46" fill="#C98D5B" /><ellipse cx="58" cy="100" rx="16" ry="30" fill="#8A5A3C" transform="rotate(20 58 100)" />
    <ellipse cx="142" cy="100" rx="16" ry="30" fill="#8A5A3C" transform="rotate(-20 142 100)" />
    <circle cx="84" cy="118" r="6" fill={C.ink} /><circle cx="116" cy="118" r="6" fill={C.ink} /><ellipse cx="100" cy="140" rx="10" ry="7" fill={C.ink} />
  </>),
  dosa: (<>
    <rect width="200" height="200" fill={C.sage} /><circle cx="100" cy="110" r="70" fill={C.white} />
    <path d="M40 120 Q100 60 168 98 L60 140Z" fill="#E7A94A" /><circle cx="70" cy="150" r="14" fill={C.coral} /><circle cx="104" cy="158" r="14" fill="#F3F0D8" />
  </>),
  pottery: (<>
    <rect width="200" height="200" fill={C.peri} /><ellipse cx="100" cy="160" rx="64" ry="14" fill={C.ink} opacity=".6" />
    <path d="M70 80 Q60 120 76 152 H124 Q140 120 130 80 Q118 72 100 72 Q82 72 70 80Z" fill="#C98D5B" />
    <ellipse cx="100" cy="80" rx="30" ry="8" fill="#A8703F" />
  </>),
  boardgame: (<>
    <rect width="200" height="200" fill={C.vanilla} />
    <rect x="30" y="40" width="140" height="120" rx="10" fill={C.sage} />
    {[0, 1, 2, 3].map(i => [0, 1, 2].map(j => <rect key={`${i}${j}`} x={42 + i * 32} y={52 + j * 34} width="26" height="26" rx="4" fill={(i + j) % 2 ? C.white : C.butter} />))}
    <circle cx="78" cy="98" r="9" fill={C.coral} /><circle cx="142" cy="132" r="9" fill={C.ink} />
  </>),
  cat: (<>
    <rect width="200" height="200" fill={C.coral} />
    <ellipse cx="100" cy="140" rx="54" ry="40" fill={C.ink} /><circle cx="100" cy="96" r="36" fill={C.ink} />
    <path d="M70 76 L74 48 L92 66Z M130 76 L126 48 L108 66Z" fill={C.ink} />
    <ellipse cx="88" cy="96" rx="5" ry="7" fill={C.butter} /><ellipse cx="112" cy="96" rx="5" ry="7" fill={C.butter} />
  </>),
  rain: (<>
    <rect width="200" height="200" fill="#5C9BD6" />
    {[...Array(14)].map((_, i) => <line key={i} x1={(i * 37) % 200} y1={(i * 53) % 160} x2={(i * 37) % 200 - 6} y2={(i * 53) % 160 + 18} stroke={C.white} strokeWidth="3" strokeLinecap="round" opacity=".7" />)}
    <path d="M60 130 Q100 80 140 130Z" fill={C.butter} /><line x1="100" y1="130" x2="100" y2="176" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
  </>),
  cycle: (<>
    <rect width="200" height="200" fill={C.sage} /><rect x="0" y="160" width="200" height="40" fill="#3FB3A0" />
    <circle cx="60" cy="140" r="26" fill="none" stroke={C.ink} strokeWidth="6" /><circle cx="140" cy="140" r="26" fill="none" stroke={C.ink} strokeWidth="6" />
    <path d="M60 140 L92 100 L140 140 M92 100 L120 100 M84 92 H104" stroke={C.coral} strokeWidth="6" fill="none" strokeLinecap="round" />
  </>),
  concert: (<>
    <rect width="200" height="200" fill={C.ink} />
    <path d="M40 0 L80 140 H0Z" fill={C.butter} opacity=".35" /><path d="M160 0 L200 140 H120Z" fill={C.peri} opacity=".35" />
    {[20, 50, 80, 110, 140, 170].map((x, i) => <circle key={x} cx={x} cy={170 - (i % 2) * 8} r="18" fill="#2C4260" />)}
  </>),
  kitchen: (<>
    <rect width="200" height="200" fill={C.butter} /><rect x="0" y="140" width="200" height="60" fill={C.white} />
    <ellipse cx="100" cy="132" rx="56" ry="12" fill={C.ink} /><rect x="150" y="128" width="40" height="8" rx="4" fill={C.ink} />
    <circle cx="86" cy="124" r="8" fill={C.white} /><circle cx="86" cy="124" r="4" fill={C.butter} />
    <path d="M90 92 Q84 80 92 70 M110 94 Q104 80 112 70" stroke={C.white} strokeWidth="4" fill="none" strokeLinecap="round" />
  </>),
};
