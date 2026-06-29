import { Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function TopBar({ title }: { title: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
      <div className="flex min-w-0 items-baseline gap-3">
        {/* brand lives in the sidebar on desktop; surface it here on mobile */}
        <span className="text-lg font-bold tracking-tight lg:hidden">blur</span>
        <h1 className="truncate text-sm font-bold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 border border-line px-2.5 py-1.5 sm:flex focus-within:border-line-strong transition-colors">
          <Search size={14} strokeWidth={1.5} className="text-muted" />
          <input
            type="text"
            placeholder="Search"
            className="w-40 bg-transparent text-xs outline-none placeholder:text-muted"
          />
        </label>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
