export type StepItem = {
  key: string;
  label: string;
  labelOr?: string;
};

type StepperProps = {
  steps: StepItem[];
  activeKey: string;
  completedKeys?: string[];
  className?: string;
};

export function Stepper({
  steps,
  activeKey,
  completedKeys = [],
  className = '',
}: StepperProps) {
  const activeIdx = steps.findIndex((s) => s.key === activeKey);

  return (
    <div className={`lesson__pipeline ${className}`} role="progressbar" aria-label="Workflow progress">
      {steps.map((step, idx) => {
        const isDone = completedKeys.includes(step.key) || idx < activeIdx;
        const isActive = step.key === activeKey;

        return (
          <div key={step.key} className="pipeline-step-wrap">
            <div
              className={`pipeline-step ${isActive ? 'is-active' : isDone ? 'is-done' : ''}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="pipeline-num">{isDone ? '✓' : idx + 1}</span>
              <div className="pipeline-labels">
                <span className="pipeline-label">{step.label}</span>
                {step.labelOr && <span className="pipeline-label-or">{step.labelOr}</span>}
              </div>
            </div>
            {idx < steps.length - 1 && <div className="pipeline-line" />}
          </div>
        );
      })}
    </div>
  );
}
