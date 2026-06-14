export const user = {
  id: 'ES-0042819',
  name: 'Abebe Girma',
  username: '@abebeg',
  balance: 250.0,
  totalSent: 1240.0,
  totalReceived: 1490.0,
  activeOrders: 3,
  country: 'Ethiopia',
  city: 'Addis Ababa',
  joined: 'June 2024',
  rating: 4.88,
  reviews: 147,
  address: 'T8z2kP9xLm4qRn7wBn3',
};

export const transactions = [
  { id: 1, name: 'Hana Tesfaye', address: 'T3kR9xPm2qLn5wBn8', amount: 45.00, type: 'received', date: 'Today', time: '2:34 PM', status: 'completed' },
  { id: 2, name: 'Dawit Mekonnen', address: 'T7bN4xKm8qRp2wLn5', amount: 120.00, type: 'sent', date: 'Today', time: '11:20 AM', status: 'completed' },
  { id: 3, name: 'Fatima Ahmed', address: 'T9pL2xNm6qRk4wBn7', amount: 85.50, type: 'received', date: 'Yesterday', time: '5:15 PM', status: 'completed' },
  { id: 4, name: 'Yonas Bekele', address: 'T2wK8xPn3qRm7bLn4', amount: 30.00, type: 'sent', date: 'Yesterday', time: '9:45 AM', status: 'pending' },
  { id: 5, name: 'Sara Hassan', address: 'T5nR3xLm9qPk6wBn2', amount: 200.00, type: 'received', date: 'June 10, 2025', time: '3:00 PM', status: 'completed' },
  { id: 6, name: 'Bruk Tilahun', address: 'T8xN5kPm2qRl4wBn9', amount: 15.00, type: 'sent', date: 'June 10, 2025', time: '1:30 PM', status: 'completed' },
  { id: 7, name: 'Meron Getachew', address: 'T4bL7xNm3qRk8wPn5', amount: 75.00, type: 'received', date: 'June 9, 2025', time: '4:20 PM', status: 'completed' },
  { id: 8, name: 'Abebe Kebede', address: 'T6wK2xPn9qRm5bLn3', amount: 50.00, type: 'sent', date: 'June 9, 2025', time: '10:10 AM', status: 'completed' },
  { id: 9, name: 'Liya Alemayehu', address: 'T1nR8xLm4qPk7wBn6', amount: 110.00, type: 'received', date: 'June 8, 2025', time: '6:00 PM', status: 'completed' },
  { id: 10, name: 'Tadesse Worku', address: 'T3kP5xNm7qRl2wBn8', amount: 25.00, type: 'sent', date: 'June 8, 2025', time: '8:30 AM', status: 'pending' },
];

export const traders = [
  { id: 1, name: 'Hana Tesfaye', rating: 4.9, type: 'buy', price: 186, limits: { min: 3.5, max: 205 }, methods: ['CBE Birr', 'Telebirr'] },
  { id: 2, name: 'Dawit Mekonnen', rating: 4.7, type: 'sell', price: 188, limits: { min: 5, max: 500 }, methods: ['CBE Birr'] },
  { id: 3, name: 'Fatima Ahmed', rating: 4.8, type: 'buy', price: 185, limits: { min: 10, max: 300 }, methods: ['Telebirr', 'HelloCash'] },
  { id: 4, name: 'Yonas Bekele', rating: 4.6, type: 'sell', price: 187, limits: { min: 2, max: 150 }, methods: ['CBE Birr', 'Telebirr'] },
  { id: 5, name: 'Sara Hassan', rating: 5.0, type: 'buy', price: 184, limits: { min: 20, max: 1000 }, methods: ['CBE Birr', 'HelloCash'] },
  { id: 6, name: 'Bruk Tilahun', rating: 4.5, type: 'sell', price: 189, limits: { min: 1, max: 100 }, methods: ['Telebirr'] },
  { id: 7, name: 'Meron Getachew', rating: 4.8, type: 'buy', price: 186, limits: { min: 5, max: 250 }, methods: ['CBE Birr', 'Telebirr'] },
  { id: 8, name: 'Liya Alemayehu', rating: 4.3, type: 'sell', price: 190, limits: { min: 10, max: 400 }, methods: ['HelloCash'] },
  { id: 9, name: 'Tadesse Worku', rating: 4.9, type: 'buy', price: 185, limits: { min: 15, max: 600 }, methods: ['CBE Birr'] },
];

export const notifications = [
  { id: 1, name: 'Hana Tesfaye', amount: 45.00, type: 'received', time: '2 hours ago', address: 'T3kR9xPm2qLn5wBn8', unread: true },
  { id: 2, name: 'Dawit Mekonnen', amount: 120.00, type: 'sent', time: '5 hours ago', address: 'T7bN4xKm8qRp2wLn5', unread: true },
  { id: 3, name: 'Fatima Ahmed', amount: 85.50, type: 'received', time: '1 day ago', address: 'T9pL2xNm6qRk4wBn7', unread: false },
  { id: 4, name: 'Yonas Bekele', amount: 30.00, type: 'sent', time: '1 day ago', address: 'T2wK8xPn3qRm7bLn4', unread: false },
  { id: 5, name: 'Sara Hassan', amount: 200.00, type: 'received', time: '3 days ago', address: 'T5nR3xLm9qPk6wBn2', unread: false },
];

export const chartData = [
  { day: 'Mon', sent: 80, received: 150 },
  { day: 'Tue', sent: 120, received: 90 },
  { day: 'Wed', sent: 40, received: 200 },
  { day: 'Thu', sent: 160, received: 110 },
  { day: 'Fri', sent: 70, received: 180 },
  { day: 'Sat', sent: 100, received: 140 },
  { day: 'Sun', sent: 50, received: 220 },
];

export function truncateAddress(addr) {
  if (!addr || addr.length <= 8) return addr;
  return addr.slice(0, 4) + '...' + addr.slice(-3);
}

export function formatUSD(n) {
  return '$' + Number(n).toFixed(2);
}
