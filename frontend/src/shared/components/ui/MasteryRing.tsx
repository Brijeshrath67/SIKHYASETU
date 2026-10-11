import { MASTERED_THRESHOLD } from '../../lib/offline/tutor';
import { percent } from '../../utils/format';

type MasteryRingProps = {
  mastery: number;
  hasData?: boolean;
  size?: number;
  className?: string;
};

export function MasteryRing({
  mastery,
  hasData = true,
  size = 44,
  className = '',
}: MasteryRingProps) {
  const value = Math.max(0, Math.min(1, mastery));
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);
  const strokeWidth = size > 48 ? 5.5 : 4.5;
  const tone = value >= MASTERED_THRESHOLD ? 'ok' : value >= 0.5 ? 'brand' : value > 0 ? 'warn' : 'empty';

  return (
    <span
      className={`ring ring--${tone} ${className}`}
      role="img"
      aria-label={`${percent(value)} mastery`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={hasData ? offset : circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring__value">{hasData ? percent(value) : '—'}</span>
    </span>
  );
}
