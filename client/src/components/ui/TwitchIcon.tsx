export function TwitchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4.3 2 2.6 6.4v13.2h4.5V22l3.1-2.4h3.5l6.7-6.7V2H4.3Zm14.1 9.9-3.5 3.5h-3.5l-3.1 3.1v-3.1H5.3V4h13.1v7.9Z" />
      <path d="M15.5 6.9h2v4.3h-2Zm-4.9 0h2v4.3h-2Z" />
    </svg>
  );
}
