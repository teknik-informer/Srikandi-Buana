/**
 * Landing illustration — a designed dashboard scene, drawn in SVG.
 *
 * This is deliberately *not* a screenshot: it is a composition built from the
 * same green-and-gold language as the hero ribbon, with abstract bars instead
 * of real figures so it can never be mistaken for the product's live data.
 * Everything scales from one viewBox, so it stays crisp at any width.
 */
export function DashboardArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 760"
      role="img"
      aria-label="Ilustrasi antarmuka dasbor Srikandi Buana: ringkasan anggota, keuangan, dan agenda"
      className={className}
    >
      <defs>
        <linearGradient id="daBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e3f25" />
          <stop offset="52%" stopColor="#14532e" />
          <stop offset="100%" stopColor="#0a2c19" />
        </linearGradient>
        <linearGradient id="daGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b8871f" />
          <stop offset="28%" stopColor="#e3bc5c" />
          <stop offset="52%" stopColor="#f7e6ae" />
          <stop offset="76%" stopColor="#e2ba58" />
          <stop offset="100%" stopColor="#a87a1a" />
        </linearGradient>
        <linearGradient id="daSide" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#2a7448" />
          <stop offset="55%" stopColor="#1d5c38" />
          <stop offset="100%" stopColor="#184e2f" />
        </linearGradient>
        <linearGradient id="daActive" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2f8a4f" />
          <stop offset="100%" stopColor="#1c6c3d" />
        </linearGradient>
        <linearGradient id="daArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f8a4f" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#2f8a4f" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="daCard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f2f7f0" />
        </linearGradient>
        <linearGradient id="daSpark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a87a1a" />
          <stop offset="50%" stopColor="#e3bc5c" />
          <stop offset="100%" stopColor="#f7e6ae" />
        </linearGradient>
        <filter id="daPanelShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="26" stdDeviation="30" floodColor="#04150c" floodOpacity="0.34" />
        </filter>
        <filter id="daCardShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0d2b1a" floodOpacity="0.10" />
        </filter>
        <clipPath id="daPanelClip">
          <rect x="116" y="86" width="968" height="510" rx="20" />
        </clipPath>
        <clipPath id="daChartClip">
          <rect x="334" y="292" width="512" height="132" rx="8" />
        </clipPath>
      </defs>

      {/* ── field: deep green plate with a gold crest, echoing the hero ── */}
      <rect x="0" y="0" width="1200" height="760" rx="30" fill="url(#daBg)" />
      <path
        d="M0 686 C 210 652, 420 702, 590 676 C 770 648, 950 688, 1200 666 L1200 760 L0 760 Z"
        fill="url(#daGold)"
        opacity="0.92"
      />
      <path
        d="M0 716 C 300 686, 560 736, 830 708 C 990 692, 1110 714, 1200 706 L1200 760 L0 760 Z"
        fill="#082f1a"
      />
      <circle cx="1092" cy="112" r="86" fill="#ffffff" opacity="0.04" />
      <circle cx="64" cy="596" r="120" fill="#ffffff" opacity="0.03" />

      {/* ── floating accent: a small card with a spark line ───────────── */}
      <g filter="url(#daCardShadow)">
        <rect x="986" y="22" width="168" height="72" rx="16" fill="#fffdf5" stroke="#e6c56a" strokeOpacity="0.55" />
        <rect x="980" y="44" width="52" height="7" rx="3.5" fill="#c9b489" />
        <rect x="980" y="60" width="84" height="11" rx="5.5" fill="#17372a" />
        <path
          d="M1046 74 L1062 58 L1074 66 L1090 42 L1104 50"
          fill="none"
          stroke="url(#daSpark)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* ── the product panel ─────────────────────────────────────────── */}
      <rect x="104" y="74" width="992" height="534" rx="28" fill="#f6f9f4" opacity="0.10" />
      <g filter="url(#daPanelShadow)">
        <rect x="116" y="86" width="968" height="510" rx="20" fill="#f6f9f4" />
      </g>
      <g clipPath="url(#daPanelClip)">
        {/* sidebar */}
        <rect x="116" y="86" width="186" height="510" fill="url(#daSide)" />
        <image href="/brand/emblem-gold.png" x="108" y="96" width="34" height="34" />
        <rect x="152" y="101" width="72" height="8" rx="4" fill="#efdfae" />
        <rect x="152" y="115" width="46" height="5" rx="2.5" fill="#8fb79a" opacity="0.8" />
        <rect x="108" y="146" width="146" height="1" fill="#ffffff" opacity="0.12" />

        {/* nav — first item active */}
        <rect x="100" y="166" width="162" height="30" rx="9" fill="url(#daActive)" />
        <rect x="100" y="166" width="3.5" height="30" rx="1.75" fill="#e6c56a" />
        <circle cx="120" cy="181" r="3.4" fill="#f4e6c3" />
        <rect x="132" y="177.5" width="92" height="7" rx="3.5" fill="#eaf4e6" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} opacity={0.92 - i * 0.09}>
            <circle cx="120" cy={222 + i * 32} r="3" fill="#79a98a" />
            <rect x="132" y={218.5 + i * 32} width={98 - i * 7} height="6" rx="3" fill="#9dc0a8" />
          </g>
        ))}

        {/* sidebar footer card */}
        <rect x="120" y="510" width="162" height="64" rx="11" fill="#ffffff" opacity="0.07" />
        <rect x="120" y="510" width="162" height="64" rx="11" fill="none" stroke="#e6c56a" strokeOpacity="0.35" />
        <rect x="134" y="526" width="64" height="6" rx="3" fill="#c8dcce" />
        <rect x="134" y="540" width="104" height="14" rx="7" fill="#ffffff" opacity="0.16" />
        <circle cx="264" cy="533" r="6" fill="#e6c56a" opacity="0.85" />

        {/* header row */}
        <rect x="318" y="102" width="188" height="11" rx="5.5" fill="#17372a" />
        <rect x="318" y="122" width="126" height="6" rx="3" fill="#a7bbaa" />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={932 + i * 22} cy="113" r="13" fill="#dfe9dc" stroke="#f6f9f4" strokeWidth="2.5" />
        ))}
        <rect x="1016" y="100" width="62" height="26" rx="13" fill="url(#daActive)" />
        <rect x="1029" y="109.5" width="36" height="7" rx="3.5" fill="#eaf4e6" />

        {/* stat cards */}
        {[
          { x: 298, icon: "#2f8a4f", w: 236 },
          { x: 550, icon: "#c99a2c", w: 236 },
          { x: 802, icon: "#3f7f8c", w: 256 },
        ].map((c, i) => (
          <g key={i} filter="url(#daCardShadow)">
            <rect x={c.x} y="152" width={c.w} height="92" rx="13" fill="url(#daCard)" stroke="#e3ebe0" />
            <circle cx={c.x + 26} cy="180" r="14" fill={c.icon} opacity="0.14" />
            <circle cx={c.x + 26} cy="180" r="5.5" fill={c.icon} />
            <rect x={c.x + 50} y="172" width="72" height="6" rx="3" fill="#a7bbaa" />
            <rect x={c.x + 50} y="184" width="96" height="11" rx="5.5" fill="#1e4032" />
            <rect x={c.x + 18} y="210" width={c.w - 108} height="6" rx="3" fill="#cfdccb" />
            <rect x={c.x + c.w - 74} y="204" width="56" height="18" rx="9" fill={c.icon} opacity="0.12" />
            <rect x={c.x + c.w - 62} y="210" width="32" height="6" rx="3" fill={c.icon} />
          </g>
        ))}

        {/* chart card */}
        <g filter="url(#daCardShadow)">
          <rect x="318" y="260" width="548" height="196" rx="13" fill="url(#daCard)" stroke="#e3ebe0" />
        </g>
        <rect x="336" y="278" width="112" height="9" rx="4.5" fill="#1e4032" />
        <rect x="336" y="294" width="78" height="5.5" rx="2.75" fill="#a7bbaa" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <circle cx={686 + i * 44} cy="287" r="4" fill={["#2f8a4f", "#3f7f8c", "#e0b64a"][i]} />
            <rect x={694 + i * 44} y="283.5" width="28" height="6" rx="3" fill="#b8c9b6" />
          </g>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="334"
            x2="846"
            y1={318 + i * 32}
            y2={318 + i * 32}
            stroke="#e3ebe0"
            strokeDasharray="4 6"
          />
        ))}
        <g clipPath="url(#daChartClip)">
          <path
            d="M314 396 C 356 388, 380 356, 418 360 C 456 364, 470 330, 508 334 C 546 338, 560 306, 598 312 C 636 318, 650 296, 688 300 C 726 304, 744 322, 782 314 C 806 309, 816 300, 826 296 L826 418 L314 418 Z"
            fill="url(#daArea)"
          />
          <path
            d="M314 396 C 356 388, 380 356, 418 360 C 456 364, 470 330, 508 334 C 546 338, 560 306, 598 312 C 636 318, 650 296, 688 300 C 726 304, 744 322, 782 314 C 806 309, 816 300, 826 296"
            fill="none"
            stroke="#2f8a4f"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M314 406 C 360 402, 396 386, 434 390 C 472 394, 498 372, 536 376 C 574 380, 596 360, 634 362 C 672 364, 700 348, 738 350 C 772 352, 800 340, 826 336"
            fill="none"
            stroke="#e0b64a"
            strokeWidth="3"
            strokeDasharray="7 7"
            strokeLinecap="round"
          />
        </g>
        {[
          [418, 360],
          [508, 334],
          [598, 312],
          [688, 300],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="6.5" fill="#ffffff" />
            <circle cx={x} cy={y} r="4" fill="#2f8a4f" />
          </g>
        ))}

        {/* donut card */}
        <g filter="url(#daCardShadow)">
          <rect x="884" y="260" width="194" height="196" rx="13" fill="url(#daCard)" stroke="#e3ebe0" />
        </g>
        <rect x="902" y="278" width="86" height="9" rx="4.5" fill="#1e4032" />
        <g transform="translate(961 356) rotate(-90)">
          <circle r="44" fill="none" stroke="#e6eee3" strokeWidth="16" />
          <circle r="44" fill="none" stroke="#2f8a4f" strokeWidth="16" strokeDasharray="168 277" strokeLinecap="round" />
          <circle r="44" fill="none" stroke="#e0b64a" strokeWidth="16" strokeDasharray="55 277" strokeDashoffset="-176" strokeLinecap="round" />
          <circle r="44" fill="none" stroke="#3f7f8c" strokeWidth="16" strokeDasharray="34 277" strokeDashoffset="-239" strokeLinecap="round" />
        </g>
        <rect x="961" y="354" width="40" height="9" rx="4.5" fill="#1e4032" />
        <rect x="966" y="368" width="30" height="5" rx="2.5" fill="#a7bbaa" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <circle cx="910" cy={424 + i * 0} r="4" fill={["#2f8a4f", "#e0b64a", "#3f7f8c"][i]} />
            <rect x={900 + i * 52} y="427" width="34" height="6" rx="3" fill="#b8c9b6" />
          </g>
        ))}

        {/* agenda card */}
        <g filter="url(#daCardShadow)">
          <rect x="318" y="476" width="548" height="100" rx="13" fill="url(#daCard)" stroke="#e3ebe0" />
        </g>
        <rect x="336" y="494" width="94" height="8" rx="4" fill="#1e4032" />
        {[0, 1].map((i) => (
          <g key={i}>
            <circle cx="346" cy={522 + i * 26} r="4.5" fill={["#2f8a4f", "#e0b64a"][i]} />
            <rect x="360" y={518 + i * 26} width={248 - i * 40} height="7" rx="3.5" fill="#5d7d68" />
            <rect x="826" y={518 + i * 26} width="22" height="7" rx="3.5" fill="#c9d8c6" />
          </g>
        ))}

        {/* mini bars card */}
        <g filter="url(#daCardShadow)">
          <rect x="884" y="476" width="194" height="100" rx="13" fill="url(#daCard)" stroke="#e3ebe0" />
        </g>
        <rect x="902" y="494" width="72" height="8" rx="4" fill="#1e4032" />
        {[18, 34, 26, 44, 30, 52].map((h, i) => (
          <rect
            key={i}
            x={882 + i * 28}
            y={548 - h}
            width="16"
            height={h}
            rx="5"
            fill={i === 5 ? "#e0b64a" : "#2f8a4f"}
            opacity={i === 5 ? 1 : 0.55 + i * 0.06}
          />
        ))}
      </g>

      {/* panel rim */}
      <rect x="116" y="86" width="968" height="510" rx="20" fill="none" stroke="#ffffff" strokeOpacity="0.22" />
      <rect x="116.5" y="86.5" width="967" height="509" rx="19.5" fill="none" stroke="#04150c" strokeOpacity="0.18" />
    </svg>
  );
}
