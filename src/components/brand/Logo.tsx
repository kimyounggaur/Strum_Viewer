/** 앱 로고: 기타 줄 위의 리듬 슬래시(/)와 다운 스트로크 기호(⊓). public/favicon.svg와 같은 도형. */
export function Logo({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="#0f766e" />
      <path
        d="M12 30h40M12 38h40M12 46h40"
        stroke="#5eead4"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path d="M24 53L45 19" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
      <path d="M11 20V11h13v9" fill="none" stroke="#ffffff" strokeWidth="3.5" />
    </svg>
  );
}
