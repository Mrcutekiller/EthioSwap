import { Bell } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { user } from '../data/dummy';
import './TopBar.css';

export default function TopBar({ title }) {
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-actions">
        <button className="topbar-bell" onClick={() => navigate('/notifications')}>
          <Bell size={22} weight="regular" />
          <span className="topbar-badge">2</span>
        </button>
        <div className="topbar-avatar">
          {user.name.split(' ').map(n => n[0]).join('')}
        </div>
      </div>
    </header>
  );
}
