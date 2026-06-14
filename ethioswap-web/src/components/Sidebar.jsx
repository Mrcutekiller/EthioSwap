import { NavLink } from 'react-router-dom';
import { House, ArrowsLeftRight, Wallet, Bell, User, GearSix, SignOut } from '@phosphor-icons/react';
import { user } from '../data/dummy';
import './Sidebar.css';

const links = [
  { to: '/', label: 'Home', icon: House },
  { to: '/trade', label: 'Trade', icon: ArrowsLeftRight },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/history', label: 'History', icon: Bell },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: GearSix },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">E</div>
        <span className="sidebar-logo-text">EthioSwap</span>
      </div>

      <nav className="sidebar-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} weight="regular" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-id">{user.id}</span>
          </div>
        </div>
        <button className="sidebar-logout">
          <SignOut size={18} weight="regular" />
        </button>
      </div>
    </aside>
  );
}
