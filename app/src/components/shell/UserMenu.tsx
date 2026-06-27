import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, DropdownItem } from '../ui/Dropdown';

export function UserMenu() {
  const navigate = useNavigate();
  return (
    <Dropdown
      align="right"
      trigger={
        <span className="flex h-8 w-8 items-center justify-center border border-line hover:border-line-strong transition-colors">
          <User size={15} strokeWidth={1.5} />
        </span>
      }
    >
      <div className="border-b border-line px-3 py-2">
        <div className="label">Signed in</div>
        <div className="text-xs">christian.obe</div>
      </div>
      <DropdownItem onClick={() => navigate('/kit')}>My Kit</DropdownItem>
      <DropdownItem onClick={() => navigate('/settings')}>Settings</DropdownItem>
      <DropdownItem>Sign out</DropdownItem>
    </Dropdown>
  );
}
