import { NavLink } from 'react-router-dom';
import { Images, GitCompare, Aperture, Lightbulb, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Gallery', icon: Images, end: true },
  { to: '/compare', label: 'Compare', icon: GitCompare },
  { to: '/kit', label: 'My Kit', icon: Aperture },
  { to: '/suggestions', label: 'Suggestions', icon: Lightbulb },
  { to: '/admin', label: 'Admin', icon: Shield },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-line">
      <div className="flex h-14 items-center border-b border-line px-4">
        <span className="text-lg font-bold tracking-tight">blur</span>
      </div>
      <nav className="flex flex-col py-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'mx-2 flex items-center gap-3 px-3 py-2 text-xs tracking-wide uppercase transition-colors',
                isActive ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
              ].join(' ')
            }
          >
            <Icon size={15} strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-line p-4">
        <div className="label mb-1">Engine</div>
        <div className="text-xs text-muted">equivalence · v0.1</div>
      </div>
    </aside>
  );
}
