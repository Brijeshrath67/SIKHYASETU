type StatTone = 'ok' | 'brand' | 'warn' | 'bad' | 'slate';

type StatTileProps = {
  value: string;
  label: string;
  sub?: string;
  tone?: StatTone | string;
  className?: string;
};

export function StatTile({
  value,
  label,
  sub,
  tone = 'brand',
  className = '',
}: StatTileProps) {
  return (
    <div className={`stat-tile stat-tile--${tone} ${className}`}>
      <span className="stat-tile__value">{value}</span>
      <span className="stat-tile__label">{label}</span>
      {sub && <span className="stat-tile__sub">{sub}</span>}
    </div>
  );
}
