import { Images, GitCompare, Aperture, FolderOpen, Lightbulb, Shield, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FeatureFlagKey } from '../../lib/featureFlags';

export interface NavItemData {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
  featureFlag?: FeatureFlagKey;
}

// Primary destinations (top of the sidebar / left of the bottom bar).
export const PRIMARY_NAV: NavItemData[] = [
  { to: '/', label: 'Gallery', icon: Images, end: true, featureFlag: 'gallery' },
  { to: '/albums', label: 'Albums', icon: FolderOpen, featureFlag: 'albums' },
  { to: '/compare', label: 'Compare', icon: GitCompare, featureFlag: 'compare' },
  { to: '/kit', label: 'My Kit', icon: Aperture, featureFlag: 'kit' },
  { to: '/suggestions', label: 'Suggestions', icon: Lightbulb, featureFlag: 'suggestions' },
];

// Footer destinations (Admin is gated to admins).
export const FOOTER_NAV: NavItemData[] = [
  { to: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings, featureFlag: 'settings' },
];
