import { useId } from "react";

export type Mood = "happy" | "cheer" | "think" | "worried" | "sleepy";

/** Zel, the ZELTA mascot: a danfo-yellow coin with a ridged edge. Original character. */
export default function Zel({ mood = "happy", size = 96, bob = false, label }: { mood?: Mood; size?: number; bob?: boolean; label?: string }) {
  const I = "#2b2d7f";
  const gid = `zel-${useId().replace(/:/g, "")}`;
  const eyes = mood === "sleepy"
    ? <><path d="M37 58 Q46 65 55 58" stroke={I} strokeWidth="3.2" fill="none" strokeLinecap="round" /><path d="M65 58 Q74 65 83 58" stroke={I} strokeWidth="3.2" fill="none" strokeLinecap="round" /></>
    : <>
      <ellipse cx="46" cy="56" rx="9" ry="11" fill="#fff" stroke={I} strokeWidth="2.5" /><ellipse cx="74" cy="56" rx="9" ry="11" fill="#fff" stroke={I} strokeWidth="2.5" />
      <circle cx={mood === "think" ? 49 : 46} cy={mood === "think" ? 52 : 58} r="5" fill={I} /><circle cx={mood === "think" ? 77 : 74} cy={mood === "think" ? 52 : 58} r="5" fill={I} />
      <circle cx="48" cy="55" r="1.6" fill="#fff" /><circle cx="76" cy="55" r="1.6" fill="#fff" />
    </>;
  const brows = mood === "worried"
    ? <><path d="M36 40 L54 45" stroke={I} strokeWidth="3" strokeLinecap="round" /><path d="M84 40 L66 45" stroke={I} strokeWidth="3" strokeLinecap="round" /></>
    : mood === "think" ? <path d="M64 41 Q75 35 85 41" stroke={I} strokeWidth="3" fill="none" strokeLinecap="round" /> : null;
  const mouth = {
    happy: <path d="M50 75 Q60 85 70 75" stroke={I} strokeWidth="3.5" fill="none" strokeLinecap="round" />,
    cheer: <><path d="M47 72 Q60 94 73 72 Z" fill={I} /><path d="M54 82 Q60 78 66 82 Q60 88 54 82Z" fill="#ff8a8a" /></>,
    think: <circle cx="63" cy="79" r="3.4" fill={I} />,
    worried: <path d="M51 81 Q60 73 69 81" stroke={I} strokeWidth="3.5" fill="none" strokeLinecap="round" />,
    sleepy: <path d="M54 78 Q60 82 66 78" stroke={I} strokeWidth="3.2" fill="none" strokeLinecap="round" />,
  }[mood];
  return (
    <svg viewBox="0 0 120 124" width={size} height={size * 124 / 120} role={label ? "img" : undefined} aria-label={label}
      aria-hidden={label ? undefined : true} className={bob ? "zel-bob" : undefined}>
      <defs>
        <radialGradient id={gid} cx="38%" cy="30%" r="80%"><stop offset="0" stopColor="#ffe27a" /><stop offset=".55" stopColor="#ffc21a" /><stop offset="1" stopColor="#f2a900" /></radialGradient>
      </defs>
      <ellipse cx="60" cy="118" rx="26" ry="4" fill="#1d1f3a" opacity=".12" />
      <ellipse cx="46" cy="109" rx="9" ry="6" fill={I} /><ellipse cx="74" cy="109" rx="9" ry="6" fill={I} />
      <circle cx="60" cy="62" r="46" fill={`url(#${gid})`} stroke="#d99a00" strokeWidth="4" />
      <circle cx="60" cy="62" r="38" fill="none" stroke="#ffe08a" strokeWidth="2.5" strokeDasharray="2 6" strokeLinecap="round" />
      <path d="M28 44 Q34 30 50 26" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".6" /><path d="M70 22 Q80 24 88 31" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".35" />
      {mood === "cheer" && <><circle cx="14" cy="40" r="3" fill="#ffc21a" /><circle cx="108" cy="34" r="3.5" fill="#1fb178" /><circle cx="104" cy="82" r="2.6" fill="#ff5d5d" /></>}
      {mood === "cheer" && <><path d="M16 66 Q8 52 14 46" stroke="#d99a00" strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M104 66 Q112 52 106 46" stroke="#d99a00" strokeWidth="5" fill="none" strokeLinecap="round" /></>}
      <circle cx="35" cy="73" r="6" fill="#ff8a6b" opacity=".45" /><circle cx="85" cy="73" r="6" fill="#ff8a6b" opacity=".45" />
      {/* adire head wrap: indigo band with stitched rings */}
      <path d="M17 44 Q60 10 103 44 Q101 31 88 21 Q60 7 32 21 Q19 31 17 44Z" fill="#25297a" stroke="#12143f" strokeWidth="2" strokeLinejoin="round" />
      <path d="M26 33 Q60 12 94 33" fill="none" stroke="#f5efe2" strokeWidth="1.8" strokeDasharray="3 4" strokeLinecap="round" opacity=".85" />
      <circle cx="60" cy="19" r="3.2" fill="none" stroke="#f5efe2" strokeWidth="1.6" /><circle cx="42" cy="25" r="2.4" fill="none" stroke="#f5efe2" strokeWidth="1.4" /><circle cx="78" cy="25" r="2.4" fill="none" stroke="#f5efe2" strokeWidth="1.4" />
      <path d="M94 24 Q112 20 114 34 Q104 30 98 32Z" fill="#25297a" stroke="#12143f" strokeWidth="2" strokeLinejoin="round" />
      {eyes}{brows}{mouth}
    </svg>
  );
}
