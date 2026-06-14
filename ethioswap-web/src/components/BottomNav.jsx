import { NavLink } from 'react-router-dom';
import { House, ArrowsLeftRight, Scan, Clock, User } from '@phosphor-icons/react';
import './BottomNav.css';

const tabs = [
  { to: '/', label: 'Home', icon: House },
  { to: '/trade', label: 'Trade', icon: ArrowsLeftRight },
  { to: '/scan', label: 'Scan', icon: Scan, center: true },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  return (
    <nav className="bottomnav">
      {tabs.map(({ to, label, icon: Icon, center }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `bottomnav-tab ${isActive ? 'active' : ''} ${center ? 'center' : ''}`}
        >
          {center ? (
            <div className="bottomnav-scan">
              <Icon size={24} weight="fill" />
            </div>
          ) : (
            <>
              <Icon size={22} weight="regular" />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
