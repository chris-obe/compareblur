import { useState } from 'react';
import { useCompare } from '../../store/CompareProvider';
import { BlurChart } from './BlurChart';
import { SubjectControl } from './SubjectControl';
import { AddSystem } from './AddSystem';
import { SystemList } from './SystemList';
import { CompareGalleryExamples, CompareGalleryExamplesToggle } from './CompareGalleryExamples';

export function ComparePage() {
  const { systems, subjectWidthM, setSubjectWidthM, focusOverrideM, setFocusOverrideM } = useCompare();
  const [examplesOpen, setExamplesOpen] = useState(false);

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
        <p className="text-sm text-muted">
          Compare shows how each camera/lens frames the same subject, then how blur changes as the background moves farther away.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <SubjectControl
              width={subjectWidthM}
              onChange={setSubjectWidthM}
              focusM={focusOverrideM}
              onFocusChange={setFocusOverrideM}
            />
          </div>
          <CompareGalleryExamplesToggle open={examplesOpen} onToggle={() => setExamplesOpen((current) => !current)} />
        </div>

        <div className="min-h-[60vh] lg:min-h-0 lg:flex-1">
          <BlurChart systems={systems} subjectWidthM={subjectWidthM} focusOverrideM={focusOverrideM} />
        </div>
      </div>

      {examplesOpen && (
        <aside className="order-3 min-h-0 shrink-0 border-line lg:w-[24rem] lg:border-l">
          <CompareGalleryExamples
            systems={systems}
            subjectWidthM={subjectWidthM}
            focusOverrideM={focusOverrideM}
            onSubjectWidth={setSubjectWidthM}
            onClose={() => setExamplesOpen(false)}
          />
        </aside>
      )}
    </div>
  );
}
