// 4ステップ型のフォームを使う場合に App.tsx から import して使用してください。
// STEPS のラベルは各ツールに合わせて編集してください。
const STEPS = [
  { label: '基本情報' },
  { label: '入力' },
  { label: '詳細' },
  { label: '結果' },
];

interface Props {
  currentStep: number;
}

export function StepIndicator({ currentStep }: Props) {
  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {STEPS.map((step, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : isCompleted
                    ? 'bg-accent text-white'
                    : 'bg-card-hover text-text-muted'
                }`}
              >
                {isCompleted ? '\u2713' : stepNum}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isActive ? 'text-primary font-bold' : 'text-text-muted'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 mb-4 ${
                  isCompleted ? 'bg-accent' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
