import { NavLink } from 'react-router-dom';
import { Images, GitCompare, Aperture, Lightbulb, Shield, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAdminAccess } from '../../auth/AdminAccessProvider';

interface NavItemData {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItemData[] = [
  { to: '/', label: 'Gallery', icon: Images, end: true },
  { to: '/compare', label: 'Compare', icon: GitCompare },
  { to: '/kit', label: 'My Kit', icon: Aperture },
  { to: '/suggestions', label: 'Suggestions', icon: Lightbulb },
];

function NavItem({ to, label, icon: Icon, end }: NavItemData) {
  return (
    <NavLink
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
  );
}

export function Sidebar() {
  const { isAdmin } = useAdminAccess();

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-line">
      <div className="flex h-14 items-center border-b border-line px-4">
        <span className="text-lg font-bold tracking-tight">blur</span>
      </div>

      <nav className="flex flex-col py-2">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Footer: Admin (admins only) above Settings */}
      <nav className="mt-auto flex flex-col border-t border-line py-2">
        {isAdmin && <NavItem to="/admin" label="Admin" icon={Shield} />}
        <NavItem to="/settings" label="Settings" icon={Settings} />
      </nav>
    </aside>
  );
}
