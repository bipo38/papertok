import { Link, useNavigate } from 'react-router-dom';
import { Menu } from '@base-ui/react/menu';
import {
  ArrowSquareOut,
  Desktop,
  FolderOpen,
  GearSix,
  Moon,
  SignOut,
  Sun,
  UserCircle,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { GithubMark } from '../ui/GithubMark.jsx';
import './AccountMenu.css';

const THEMES = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
  { id: 'system', label: 'System', Icon: Desktop },
];

export const PAPERTOK_REPO_URL = 'https://github.com/mugar123/papertok';


export default function AccountMenu() {
  const navigate = useNavigate();
  const { user, profilePhoto, signOut } = useAuth();
  const { preference, setPreference } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/feed');
  };

  const photo = profilePhoto || user.photoURL;

  return (
    <Menu.Root>
      <Menu.Trigger className="navbar-avatar-btn" aria-label="Account menu" title="Account">
        {photo ? (
          <img
            src={photo}
            alt=""
            className="navbar-avatar"
            referrerPolicy="no-referrer"
            decoding="async"
            width="26"
            height="26"
          />
        ) : (
          <div className="navbar-avatar navbar-avatar--fallback" aria-hidden="true">
            {user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner className="account-menu-positioner" align="end" sideOffset={8}>
          <Menu.Popup className="account-menu">
            <div className="account-menu-head">
              <strong>{user.displayName || 'PaperTok user'}</strong>
              <span>{user.email}</span>
            </div>


            <Menu.LinkItem className="account-menu-item" closeOnClick render={<Link to="/profile" />}>
              <UserCircle size={17} aria-hidden="true" /> View my profile
            </Menu.LinkItem>
            <Menu.LinkItem className="account-menu-item" closeOnClick render={<Link to="/lists" />}>
              <FolderOpen size={17} aria-hidden="true" /> My lists
            </Menu.LinkItem>
            <Menu.LinkItem className="account-menu-item" closeOnClick render={<Link to="/settings" />}>
              <GearSix size={17} aria-hidden="true" /> Settings
            </Menu.LinkItem>

            <Menu.Separator className="account-menu-separator" />

            <Menu.Group>
              <Menu.GroupLabel className="visually-hidden">Theme</Menu.GroupLabel>
              <Menu.RadioGroup
                className="account-menu-theme"
                value={preference}
                onValueChange={setPreference}
                style={{ '--theme-index': THEMES.findIndex(option => option.id === preference) }}
              >
                <span className="account-menu-theme-pill" aria-hidden="true" />
                {THEMES.map(({ id, label, Icon }) => (
                  <Menu.RadioItem key={id} value={id} closeOnClick={false} className="account-menu-theme-option">
                    <Icon size={14} weight={preference === id ? 'fill' : 'regular'} aria-hidden="true" />
                    {label}
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Group>

            <Menu.Separator className="account-menu-separator" />

            <Menu.LinkItem className="account-menu-item" closeOnClick href={PAPERTOK_REPO_URL} target="_blank" rel="noreferrer">
              <GithubMark size={17} /> PaperTok is open source
              <ArrowSquareOut size={13} className="account-menu-external" aria-hidden="true" />
              <span className="visually-hidden">(opens in a new tab)</span>
            </Menu.LinkItem>

            <Menu.Separator className="account-menu-separator" />

            <Menu.Item className="account-menu-item is-danger" onClick={handleSignOut}>
              <SignOut size={17} aria-hidden="true" /> Log out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
