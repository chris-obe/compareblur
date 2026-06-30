import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-bg text-fg">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar title={title} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
