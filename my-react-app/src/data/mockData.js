import KYIV_COURTS_DB from './courts.kyiv.osm.json';

export const REAL_DB_USERS = ['Макс', 'Олег', 'Андрій', 'Саша'];

export const FRIENDS = [
  {
    id: 'oleg-1',
    name: 'Олег',
    handle: '@oleg_hoop',
    initials: 'ОМ',
    status: 'Online • Грає зараз',
    sport: '🏀',
  },
  {
    id: 'andrii-2',
    name: 'Андрій',
    handle: '@andrii_sport',
    initials: 'АП',
    status: 'Online • На майданчику',
    sport: '⚽',
  },
  {
    id: 'sasha-3',
    name: 'Саша',
    handle: '@sasha_ball',
    initials: 'СК',
    status: 'Було 2 години тому',
    sport: '🏀',
  },
  {
    id: 'kolya-4',
    name: 'Коля',
    handle: '@kolya_court',
    initials: 'КВ',
    status: 'Offline',
    sport: '⚽',
  },
  {
    id: 'dima-5',
    name: 'Діма',
    handle: '@dima_game',
    initials: 'ДА',
    status: 'Online • Шукає гру',
    sport: '🏀',
  },
];

const KYIV_RAW_COURTS = Array.isArray(KYIV_COURTS_DB?.courts) ? KYIV_COURTS_DB.courts : [];

export const COURTS = KYIV_RAW_COURTS.map((court, index) => ({
  ...court,
  selected: typeof court?.selected === 'boolean' ? court.selected : index === 0,
  popularity: Math.floor(Math.random() * 100) + 1,
}));

export const COURT_DETAIL = {
  title: 'Поляна КПІ',
  subtitle: '🏀 Вуличний баскетбол • Асфальт • Є освітлення',
  headerImage:
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=500&q=80',
  planningStatusText: 'Сьогодні, 19:00 — Очікується 15 гравців 🔥',
  timeSlots: ['17:00 (5 чол.)', '18:00 (9 чол.)', '19:00 (15 чол.)', '20:00 (8 чол.)'],
  selectedTimeSlotIndex: 2,
  checkinButtonText: 'Я буду грати о 19:00',
  reviewsTitle: 'Відгуки (24)',
  reviews: [
    {
      id: 'max-d',
      author: 'Макс Данкер',
      stars: '★★★★★',
      text: 'Кільця нові, сітки є. Але ввечері дуже багато людей, черга на гру.',
    },
    {
      id: 'olexii',
      author: 'Олексій',
      stars: '★★★☆☆',
      text: 'Асфальт трохи кривий біля триочкової.',
    },
  ],
};
