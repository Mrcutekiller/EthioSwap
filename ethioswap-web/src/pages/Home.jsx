import TopBar from '../components/TopBar';
import StatusPill from '../components/StatusPill';
import { user, transactions, chartData, formatUSD, truncateAddress } from '../data/dummy';
import { ArrowUpRight, ArrowDownLeft, CaretRight } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const latest = transactions.slice(0, 5);
  const maxVal = Math.max(...chartData.flatMap(d => [d.sent, d.received]));

  return (
    <div className="home">
      <TopBar title="Home" />

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total Balance</span>
          <span className="stat-value gold">{formatUSD(user.balance)}</span>
          <span className="stat-sub">Your USDT wallet</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Sent</span>
          <span className="stat-value danger">{formatUSD(user.totalSent)}</span>
          <span className="stat-sub">All time</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Received</span>
          <span className="stat-value teal">{formatUSD(user.totalReceived)}</span>
          <span className="stat-sub">All time</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Orders</span>
          <span className="stat-value">{user.activeOrders}</span>
          <span className="stat-sub">Open trades</span>
        </div>
      </div>

      <div className="home-grid">
        <div className="chart-section">
          <div className="section-header">
            <h2 className="section-title">Transaction Overview</h2>
            <select className="month-select">
              <option>June</option>
              <option>May</option>
              <option>April</option>
            </select>
          </div>
          <div className="chart">
            <div className="chart-yaxis">
              <span>${maxVal}</span>
              <span>${Math.round(maxVal * 0.66)}</span>
              <span>${Math.round(maxVal * 0.33)}</span>
              <span>$0</span>
            </div>
            <div className="chart-bars">
              {chartData.map(d => (
                <div key={d.day} className="chart-col">
                  <div className="chart-col-bars">
                    <div
                      className="bar bar-received"
                      style={{ height: `${(d.received / maxVal) * 100}%` }}
                      title={`Received: ${formatUSD(d.received)}`}
                    />
                    <div
                      className="bar bar-sent"
                      style={{ height: `${(d.sent / maxVal) * 100}%` }}
                      title={`Sent: ${formatUSD(d.sent)}`}
                    />
                  </div>
                  <span className="chart-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-dot teal" /> Received</span>
            <span className="legend-item"><span className="legend-dot danger" /> Sent</span>
          </div>
        </div>

        <div className="latest-section">
          <div className="section-header">
            <h2 className="section-title">Latest</h2>
            <button className="see-all" onClick={() => navigate('/history')}>
              See all <CaretRight size={14} weight="bold" />
            </button>
          </div>
          <div className="latest-list">
            {latest.map(tx => (
              <div key={tx.id} className="tx-row">
                <div className={`tx-avatar ${tx.type === 'received' ? 'avatar-teal' : 'avatar-danger'}`}>
                  {tx.type === 'received' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div className="tx-info">
                  <span className="tx-name">{tx.name}</span>
                  <span className="tx-addr">{truncateAddress(tx.address)}</span>
                </div>
                <div className="tx-right">
                  <span className={`tx-amount ${tx.type === 'received' ? 'gold' : 'danger'}`}>
                    {tx.type === 'received' ? '+' : '-'}{formatUSD(tx.amount)}
                  </span>
                  <span className="tx-date">{tx.date}</span>
                </div>
                <StatusPill status={tx.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
