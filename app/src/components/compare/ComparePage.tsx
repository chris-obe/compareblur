import { useCompare } from '../../store/CompareProvider';
import { BlurChart } from './BlurChart';
import { SubjectControl } from './SubjectControl';
import { AddSystem } from './AddSystem';
import { SystemList } from './SystemList';

export function ComparePage() {
  const { systems, subjectWidthM, setSubjectWidthM, focusOverrideM, setFocusOverrideM } = useCompare();

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:flex-row">
      {/* Controls: a left sidebar on desktop, stacked below the chart on mobile */}
      <aside className="order-2 shrink-0 border-line lg:order-1 lg:w-[22rem] lg:overflow-y-auto lg:border-r">
        <div className="space-y-4 p-4 lg:p-5">
          <AddSystem />
          <SystemList />
        </div>
      </aside>

      {/* Main: framing controls + the chart filling the rest */}
      <div className="order-1 flex min-w-0 flex-1 flex-col gap-4 p-4 lg:order-2 lg:p-6">
        <p className="max-w-prose text-sm text-muted">
          Pick how much of the frame the subject occupies. The chart calculates where each system must stand to frame that subject,
          then plots how blurry the background becomes as it falls farther behind the subject.
        </p>

        <SubjectControl
          width={subjectWidthM}
          onChange={setSubjectWidthM}
          focusM={focusOverrideM}
          onFocusChange={setFocusOverrideM}
        />

        <div className="min-h-[60vh] lg:min-h-0 lg:flex-1">
          <BlurChart systems={systems} subjectWidthM={subjectWidthM} focusOverrideM={focusOverrideM} />
        </div>
      </div>
    </div>
  );
}
