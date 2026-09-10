export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#14161C" />
      <path
        d="M8 22V10h6.2a4.2 4.2 0 1 1 0 8.4H11.6V22H8Zm3.6-6.8h2.4a1.4 1.4 0 1 0 0-2.8h-2.4v2.8Z"
        fill="#7C5CFC"
      />
      <circle cx="23" cy="10" r="2.4" fill="#EC4899" />
    </svg>
  );
}
