import KYIV_COURTS_DB from './courts.kyiv.osm.json';

const KYIV_RAW_COURTS = Array.isArray(KYIV_COURTS_DB?.courts) ? KYIV_COURTS_DB.courts : [];

export const COURTS = KYIV_RAW_COURTS.map((court, index) => ({
  ...court,
  selected: typeof court?.selected === 'boolean' ? court.selected : index === 0,
}));
