import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import './AppLayout.css';

export default function AppLayout() {
  return (
    <div className="applayout">
      <Sidebar />
      <BottomNav />
      <main className="applayout-main">
        <div className="applayout-content page-fade">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
