import { Images, GitCompare, Aperture, FolderOpen, Lightbulb, Shield, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItemData {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
}

// Primary destinations (top of the sidebar / left of the bottom bar).
export const PRIMARY_NAV: NavItemData[] = [
  { to: '/', label: 'Gallery', icon: Images, end: true },
  { to: '/albums', label: 'Albums', icon: FolderOpen },
  { to: '/compare', label: 'Compare', icon: GitCompare },
  { to: '/kit', label: 'My Kit', icon: Aperture },
  { to: '/suggestions', label: 'Suggestions', icon: Lightbulb },
];

// Footer destinations (Admin is gated to admins).
export const FOOTER_NAV: NavItemData[] = [
  { to: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];
