const AnimatedCubesLogo = ({ size = 28 }: { size?: number }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <style>{`
        @keyframes rotateCube1 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rotateCube2 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .cube1 {
          animation: rotateCube1 3s linear infinite;
          transform-origin: 18px 30px;
        }
        .cube2 {
          animation: rotateCube2 3s linear infinite;
          transform-origin: 42px 30px;
        }
      `}</style>

      {/* Cube 1 - Green */}
      <g className="cube1">
        <rect x="6" y="18" width="24" height="24" rx="4" fill="#7AB648" />
        <rect x="10" y="22" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.3)" />
        <rect x="19" y="22" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.2)" />
        <rect x="10" y="31" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.2)" />
        <rect x="19" y="31" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.15)" />
      </g>

      {/* Cube 2 - Teal/Green */}
      <g className="cube2">
        <rect x="30" y="18" width="24" height="24" rx="4" fill="#5B9E3C" />
        <rect x="34" y="22" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.3)" />
        <rect x="43" y="22" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.2)" />
        <rect x="34" y="31" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.2)" />
        <rect x="43" y="31" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.15)" />
      </g>
    </svg>
  );
};

export default AnimatedCubesLogo;
