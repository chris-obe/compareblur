import { LogIn, LogOut, Settings, User, UserPlus } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, DropdownItem } from '../ui/Dropdown';

export function UserMenu() {
  const navigate = useNavigate();
  const { error, isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();

  const label =
    user?.name ?? user?.email ?? user?.nickname ?? (isAuthenticated ? 'Signed in' : 'Account');

  const login = () => loginWithRedirect({ appState: { returnTo: window.location.pathname } });
  const signup = () =>
    loginWithRedirect({
      appState: { returnTo: window.location.pathname },
      authorizationParams: { screen_hint: 'signup' },
    });
  const signOut = () => logout({ logoutParams: { returnTo: window.location.origin } });

  return (
    <Dropdown
      align="right"
      trigger={
        <span className="flex h-8 w-8 items-center justify-center border border-line hover:border-line-strong transition-colors">
          {user?.picture ? (
            <img src={user.picture} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={15} strokeWidth={1.5} />
          )}
        </span>
      }
    >
      <div className="border-b border-line px-3 py-2">
        <div className="label">
          {isLoading ? 'Checking account' : isAuthenticated ? 'Signed in' : 'Signed out'}
        </div>
        <div className="max-w-56 truncate text-xs">{error ? error.message : label}</div>
      </div>
      {isAuthenticated ? (
        <>
          <DropdownItem onClick={() => navigate('/kit')}>
            <User size={13} strokeWidth={1.5} />
            My Kit
          </DropdownItem>
          <DropdownItem onClick={() => navigate('/settings')}>
            <Settings size={13} strokeWidth={1.5} />
            Settings
          </DropdownItem>
          <DropdownItem onClick={signOut}>
            <LogOut size={13} strokeWidth={1.5} />
            Sign out
          </DropdownItem>
        </>
      ) : (
        <>
          <DropdownItem onClick={login}>
            <LogIn size={13} strokeWidth={1.5} />
            Log in
          </DropdownItem>
          <DropdownItem onClick={signup}>
            <UserPlus size={13} strokeWidth={1.5} />
            Sign up
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}
