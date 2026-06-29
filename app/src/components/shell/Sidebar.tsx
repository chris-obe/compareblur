import { NavLink } from 'react-router-dom';
import { useAdminAccess } from '../../auth/AdminAccessProvider';
import { PRIMARY_NAV, FOOTER_NAV, type NavItemData } from './navItems';

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

// Desktop navigation. Hidden on mobile, where BottomNav takes over.
export function Sidebar() {
  const { isAdmin } = useAdminAccess();
  const footer = FOOTER_NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="hidden h-full w-52 shrink-0 flex-col border-r border-line lg:flex">
      <div className="flex h-14 items-center border-b border-line px-4">
        <span className="text-lg font-bold tracking-tight">blur</span>
      </div>

      <nav className="flex flex-col py-2">
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Footer: Admin (admins only) above Settings */}
      <nav className="mt-auto flex flex-col border-t border-line py-2">
        {footer.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
    </aside>
  );
}
