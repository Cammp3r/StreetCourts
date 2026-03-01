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

export const COURTS = [
  {
    id: 'kpi',
    typeLabel: 'Баскетбол',
    badgeClassName: 'court-type-badge badge-basket',
    name: 'Поляна КПІ',
    address: 'вул. Політехнічна, 14',
    image:
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=200&q=80',
    statusDotClassName: 'dot free',
    statusText: 'Зараз: Вільне поле',
    selected: true,
  },
  {
    id: 'xpark',
    typeLabel: 'Футбол',
    badgeClassName: 'court-type-badge badge-foot',
    name: 'X-Park Arena',
    address: 'Парк Муромець',
    image:
      'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=200&q=80',
    statusDotClassName: 'dot free',
    statusText: 'Зараз: Вільне поле',
    selected: false,
  },
];

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
