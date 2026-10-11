import './guru.css';

export type GuruMood = 'idle' | 'happy' | 'think';

type Props = {
  speaking?: boolean;
  mood?: GuruMood;
  size?: number;
  className?: string;
};

/**
 * Guru — the offline learning assistant emblem.
 * Clean, respectful educational icon (lamp of knowledge / open book) with subtle state indicators.
 */
export function GuruAvatar({ speaking = false, mood = 'idle', size = 48, className = '' }: Props) {
  const classes = [
    'guru-avatar-pro',
    speaking ? 'is-speaking' : '',
    `is-${mood}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="SikhyaSetu Study Assistant"
    >
      <defs>
        <linearGradient id="guru-bg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="guru-gold-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Outer rounded tile / badge */}
      <rect x="6" y="6" width="88" height="88" rx="22" fill="url(#guru-bg-grad)" />
      <rect x="6" y="6" width="88" height="88" rx="22" fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.3" />

      {/* Orbit ring for 'think' mood */}
      <circle className="guru-pro-orbit" cx="50" cy="50" r="40" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="6 6" />

      {/* Lamp of knowledge / flame (Diya flame) */}
      <path
        className="guru-pro-flame"
        d="M50 22 C45 32 43 38 43 44 C43 49 46 52 50 52 C54 52 57 49 57 44 C57 38 55 32 50 22 Z"
        fill="url(#guru-gold-grad)"
      />
      <circle cx="50" cy="45" r="3.5" fill="#fef3c7" />

      {/* Open book base (knowledge foundation) */}
      <g className="guru-pro-book">
        {/* Left page */}
        <path
          d="M26 68 C34 65 42 65 48 68 L48 55 C42 52 34 52 26 55 Z"
          fill="#ffffff"
          opacity="0.95"
        />
        {/* Right page */}
        <path
          d="M74 68 C66 65 58 65 52 68 L52 55 C58 52 66 52 74 55 Z"
          fill="#ffffff"
          opacity="0.95"
        />
        {/* Spine */}
        <path d="M50 55 L50 71" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
        {/* Page text lines */}
        <line x1="31" y1="59" x2="43" y2="57.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="31" y1="63" x2="41" y2="61.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="57" y1="57.5" x2="69" y2="59" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="59" y1="61.5" x2="69" y2="63" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Base stand / Diya bowl */}
      <path
        d="M40 70 Q50 75 60 70 L62 74 Q50 79 38 74 Z"
        fill="#f59e0b"
      />

      {/* Speaking equalizer bars */}
      <g className="guru-pro-eq">
        <rect className="eq-bar eq-bar-1" x="24" y="80" width="8" height="3" rx="1.5" fill="#60a5fa" />
        <rect className="eq-bar eq-bar-2" x="36" y="79" width="8" height="4" rx="2" fill="#93c5fd" />
        <rect className="eq-bar eq-bar-3" x="48" y="78" width="8" height="6" rx="2" fill="#ffffff" />
        <rect className="eq-bar eq-bar-4" x="60" y="79" width="8" height="4" rx="2" fill="#93c5fd" />
        <rect className="eq-bar eq-bar-5" x="72" y="80" width="8" height="3" rx="1.5" fill="#60a5fa" />
      </g>
    </svg>
  );
}
