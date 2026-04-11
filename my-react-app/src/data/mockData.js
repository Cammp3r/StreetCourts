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
