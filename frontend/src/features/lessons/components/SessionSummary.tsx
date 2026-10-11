import { percent } from '../../../shared/utils/format';
import type { Fingerprint } from '../../../shared/types/domain';

export type ConceptResult = {
  conceptId: string;
  title: string;
  correct: boolean;
  masteryBefore: number;
  masteryAfter: number;
  status: Fingerprint['status'];
};

type SessionSummaryProps = {
  results: ConceptResult[];
  onRestart: () => void;
};

export function SessionSummary({ results, onRestart }: SessionSummaryProps) {
  return (
    <section className="card summary">
      <span className="lesson-card__badge">SESSION COMPLETED</span>
      <h2 className="card__title">ଅଧ୍ୟୟନ ସମାପ୍ତ (Session Complete)</h2>
      <p className="card__explanation">
        All responses evaluated and queued locally. The lesson state has been updated on your device.
      </p>

      <table className="summary__table">
        <thead>
          <tr>
            <th>Concept</th>
            <th>Diagnostic</th>
            <th>Mastery Transition</th>
            <th>Final Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.conceptId}>
              <td>{result.title}</td>
              <td>{result.correct ? '✓ Correct' : '⚠ Repaired'}</td>
              <td>
                {percent(result.masteryBefore)} → {percent(result.masteryAfter)}
              </td>
              <td>
                <span className={`status status--${result.status}`}>
                  {result.status.replace('_', ' ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" className="primary-btn" onClick={onRestart}>
        Start New Session →
      </button>
    </section>
  );
}
