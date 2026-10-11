import type { LessonPack } from '../../../shared/types/domain';

type PackHeaderProps = {
  pack: LessonPack;
  currentIndex: number;
  total: number;
};

export function PackHeader({ pack, currentIndex, total }: PackHeaderProps) {
  return (
    <section className="packheader">
      <div className="packheader__top">
        <div>
          <span className="packheader__tag">Active Learning Pack</span>
          <h1 className="packheader__title">
            Grade 9 Science · {pack.primary_language}
          </h1>
          <p className="packheader__meta">
            Session length: ~{pack.budget.estimated_minutes} min · Payload: {pack.budget.estimated_kb} KB · Offline SHA-256 Verified
          </p>
        </div>
        <div className="packheader__counter">
          <span className="packheader__count-val">
            {Math.min(currentIndex + 1, total)} of {total}
          </span>
          <span className="packheader__count-lbl">Concepts</span>
        </div>
      </div>

      <div className="packheader__objectives-box">
        <span className="packheader__obj-title">Target Objectives:</span>
        <ul className="packheader__objectives">
          {pack.objectives.slice(0, 2).map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
