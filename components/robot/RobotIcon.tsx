export default function RobotIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 머리 */}
      <rect
        x="7"
        y="2"
        width="10"
        height="8"
        rx="2"
        className="fill-zinc-100 dark:fill-zinc-800"
      />
      {/* 몸통 */}
      <rect
        x="5"
        y="10"
        width="14"
        height="12"
        rx="2"
        className="fill-blue-500 dark:fill-blue-600"
      />
      {/* 안테나 */}
      <line x1="12" y1="2" x2="12" y2="0.5" />
      <circle cx="12" cy="0.5" r="1" className="fill-red-500 stroke-none" />
      {/* 눈 */}
      <circle cx="9.5" cy="5.5" r="1" className="fill-sky-400 stroke-none" />
      <circle cx="14.5" cy="5.5" r="1" className="fill-sky-400 stroke-none" />
      {/* 입 */}
      <path d="M10 8h4" />
      {/* 팔 */}
      <path d="M5 13H2v4h3" />
      <path d="M19 13h3v4h-3" />
    </svg>
  );
}
