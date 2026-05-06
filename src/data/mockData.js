// TODO: Replace all data with Supabase queries

export const TRIP_HISTORY = [
  {
    id: 'h_001',
    name: 'Ahmad Khoury',
    pickup: 'Hamra, Beirut',
    dropoff: 'ABC Mall, Dbayeh',
    fare: '$22',
    status: 'completed',
    time: '2h ago',
  },
  {
    id: 'h_002',
    name: 'Sara Rizk',
    pickup: 'Verdun, Beirut',
    dropoff: 'AUB Medical Center',
    fare: '$12',
    status: 'dispatching',
    time: '5h ago',
  },
  {
    id: 'h_003',
    name: 'Karim Nassar',
    pickup: 'Dora, Beirut',
    dropoff: 'Jal el Dib',
    fare: '$18',
    status: 'cancelled',
    time: 'Yesterday',
  },
  {
    id: 'h_004',
    name: 'Maya Haddad',
    pickup: 'Achrafieh',
    dropoff: 'Jounieh',
    fare: '$35',
    status: 'completed',
    time: 'Yesterday',
  },
  {
    id: 'h_005',
    name: 'Lara Gemayel',
    pickup: 'Raouche',
    dropoff: 'Antelias',
    fare: '$28',
    status: 'completed',
    time: '2 days ago',
  },
];

export const TRIP_STATS = {
  total: 42,
  awaiting: 3,
  earned: '$860',
};

export const EARNINGS_BREAKDOWN = [
  { label: 'Today', value: '$86', trips: '4 trips' },
  { label: '7 Days', value: '$312', trips: '14 trips' },
  { label: '30 Days', value: '$1,240', trips: '52 trips' },
];

export const WEEKLY_BARS = [34, 52, 28, 60, 12, 0, 0];
export const WEEKLY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const WEEKLY_TODAY_INDEX = 3;
