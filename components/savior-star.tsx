// Pre-calculated static points to avoid hydration mismatch
const STAR_POINTS = "50,8 54.9,28.6 66.5,15.8 61.8,37.2 80.9,25.0 70.7,44.0 92.1,38.3 77.1,52.5 95.1,53.7 77.9,62.3 91.5,70.0 73.4,71.6 82.1,86.6 65.1,79.4 67.1,97.0 53.9,83.5 50,100 46.1,83.5 32.9,97.0 34.9,79.4 17.9,86.6 26.6,71.6 8.5,70.0 22.1,62.3 4.9,53.7 22.9,52.5 7.9,38.3 29.3,44.0 19.1,25.0 38.2,37.2 33.5,15.8 45.1,28.6"

export function SaviorStar({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.75 0.18 85)" />
          <stop offset="50%" stopColor="oklch(0.7 0.2 45)" />
          <stop offset="100%" stopColor="oklch(0.65 0.22 30)" />
        </linearGradient>
        <filter id="starGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon
        points={STAR_POINTS}
        fill="url(#starGradient)"
        filter="url(#starGlow)"
      />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontSize="28"
        fontWeight="bold"
        fontFamily="sans-serif"
        fill="oklch(0.1 0.02 30)"
      >
        S
      </text>
    </svg>
  )
}
