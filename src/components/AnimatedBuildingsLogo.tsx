const AnimatedBuildingsLogo = ({ size = 40 }: { size?: number }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7941D" />
          <stop offset="100%" stopColor="#E53429" />
        </linearGradient>
        <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5BBE2B" />
          <stop offset="100%" stopColor="#3DA018" />
        </linearGradient>
        <linearGradient id="grad3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2196D3" />
          <stop offset="100%" stopColor="#00BCD4" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <style>{`
        @keyframes growShrink1 {
          0%, 100% { transform: scaleY(0.78); }
          50% { transform: scaleY(1); }
        }
        @keyframes growShrink2 {
          0%, 100% { transform: scaleY(0.72); }
          50% { transform: scaleY(1); }
        }
        @keyframes growShrink3 {
          0%, 100% { transform: scaleY(0.8); }
          50% { transform: scaleY(1); }
        }
        .b1 { animation: growShrink1 2.8s ease-in-out infinite; transform-origin: 50% 88px; }
        .b2 { animation: growShrink2 2.8s ease-in-out 0.5s infinite; transform-origin: 50% 88px; }
        .b3 { animation: growShrink3 2.8s ease-in-out 1s infinite; transform-origin: 50% 88px; }
      `}</style>

      {/* Ground */}
      <rect x="8" y="88" width="84" height="3" rx="1.5" fill="hsl(207 60% 30% / 0.3)" />

      {/* Building 1 - Gold */}
      <g className="b1" filter="url(#glow)">
        <rect x="14" y="42" width="18" height="46" rx="4" fill="url(#grad1)" />
        <rect x="18" y="48" width="4" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="24" y="48" width="4" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="18" y="58" width="4" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="24" y="58" width="4" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="18" y="68" width="4" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="24" y="68" width="4" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
      </g>

      {/* Building 2 - Deep blue (tallest) */}
      <g className="b2" filter="url(#glow)">
        <rect x="36" y="22" width="20" height="66" rx="4" fill="url(#grad2)" />
        <rect x="40" y="28" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="47" y="28" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="40" y="38" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="47" y="38" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="40" y="48" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="47" y="48" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="40" y="58" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="47" y="58" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="40" y="68" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="47" y="68" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
      </g>

      {/* Building 3 - Medium blue */}
      <g className="b3" filter="url(#glow)">
        <rect x="60" y="32" width="22" height="56" rx="4" fill="url(#grad3)" />
        <rect x="64" y="38" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="73" y="38" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="64" y="48" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="73" y="48" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="64" y="58" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="73" y="58" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="64" y="68" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <rect x="73" y="68" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.5)" />
      </g>
    </svg>
  );
};

export default AnimatedBuildingsLogo;
