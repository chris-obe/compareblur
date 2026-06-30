import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function TopBar({ title }: { title: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
      <div className="flex min-w-0 items-baseline gap-3">
        {/* brand lives in the sidebar on desktop; surface it here on mobile only */}
        <BrandMark className="lg:hidden" />
        <h1 className="truncate text-sm font-bold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {/* theme toggle lives in the sidebar on desktop; here on mobile only */}
        <span className="lg:hidden">
          <ThemeToggle />
        </span>
        <UserMenu />
      </div>
    </header>
  );
}
