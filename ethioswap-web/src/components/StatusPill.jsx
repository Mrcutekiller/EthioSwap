import './StatusPill.css';

const variants = {
  received: 'pill-received',
  sent: 'pill-sent',
  pending: 'pill-pending',
  completed: 'pill-completed',
};

export default function StatusPill({ status }) {
  return (
    <span className={`status-pill ${variants[status] || ''}`}>
      {status}
    </span>
  );
}
