import { NavLink } from 'react-router-dom';
import { useAdminAccess } from '../../auth/AdminAccessProvider';
import { PRIMARY_NAV, FOOTER_NAV } from './navItems';

// Mobile app-style bottom tab bar. Hidden on desktop (Sidebar takes over).
export function BottomNav() {
  const { isAdmin } = useAdminAccess();
  const items = [...PRIMARY_NAV, ...FOOTER_NAV].filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex shrink-0 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            [
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
              isActive ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
            ].join(' ')
          }
        >
          <Icon size={18} strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-wide">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
