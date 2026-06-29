import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg text-fg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
