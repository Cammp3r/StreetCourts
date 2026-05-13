import './App.css';
import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { arrayCycler, runEngine, colorCycle } from 'streetcourts-lib';
import { Navbar } from './components/Navbar';
import { LastCheckinBanner } from './components/LastCheckinBanner';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { COURTS, REAL_DB_USERS } from './data/mockData';
import { MaxPriorityQueue } from './utils/maxPriorityQueue';
import { getCourtBookingsCount } from './utils/bookingStorage';
import { getCourtStatusDotClassName, getCourtStatusText } from './utils/courtPresentation';
import { fetchCourts } from './utils/courtsApi';

function decodeJwtPayload(token) {
  const payloadPart = String(token || '').split('.')[1];
  if (!payloadPart) {
    throw new Error('Invalid token payload');
  }

  const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(paddedBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder('utf-8').decode(bytes));
}

function App() { 
const location = useLocation();
const isCourtPage = location.pathname.startsWith('/courts/');
const [borderColor, setBorderColor] = useState("#333");
const [recommendedCourt, setRecommendedCourt] = useState(null); // Task1: рекомендована площадка
const [selectedCourtId, setSelectedCourtId] = useState(null);
const [courts, setCourts] = useState(COURTS);

useEffect(() => {
  const colorGen = colorCycle(["red", "green", "blue"]);
  const stopColors = runEngine(colorGen, setBorderColor, 500 ); 

  return () => {
    stopColors(); // на всякий випадок очищаємо при анмаунті
  };
}, []);
 const [activeUser, setActiveUser] = useState('Завантаження...');
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);

  const profileStorageKey = useMemo(() => {
    const profileId = user?.id || user?.email || user?.name;
    return profileId ? `sc_profile:${profileId}` : null;
  }, [user?.email, user?.id, user?.name]);

useEffect(() => {
  // генератор імен
  const nameGen = arrayCycler(REAL_DB_USERS);


  const names = runEngine(nameGen, setActiveUser, 2000); // міняємо ім'я кожні 2 сек

  return () => {
    names();
  };
}, []);

useEffect(() => {
  if (!profileStorageKey || !user) {
    setProfileData(null);
    return;
  }

  try {
    const rawProfile = localStorage.getItem(profileStorageKey);
    if (!rawProfile) {
      setProfileData(null);
      return;
    }

    const storedProfile = JSON.parse(rawProfile);
    setProfileData(storedProfile && typeof storedProfile === 'object' ? storedProfile : null);
  } catch (error) {
    console.warn('Failed to load profile data', error);
    setProfileData(null);
  }
}, [profileStorageKey, user]);

const mergedUser = useMemo(() => {
  if (!user) return null;

  return {
    ...user,
    ...(profileData || {}),
    favoriteSports: profileData?.favoriteSports || user.favoriteSports,
    favoriteSport: profileData?.favoriteSport || user.favoriteSport,
    age: profileData?.age || user.age,
    heightCm: profileData?.heightCm || user.heightCm,
    weightKg: profileData?.weightKg || user.weightKg,
    bio: profileData?.bio || user.bio,
  };
}, [profileData, user]);

const handleProfileSave = (nextProfile) => {
  if (!profileStorageKey) return;

  const payload = {
    ...(profileData || {}),
    ...nextProfile,
    updatedAt: new Date().toISOString(),
  };

  setProfileData(payload);
  localStorage.setItem(profileStorageKey, JSON.stringify(payload));
};

useEffect(() => {
  try {
    
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('sc_token', token);
      params.delete('token');
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }

    const stored = localStorage.getItem('sc_token');
    if (stored) {
      try {
        const payload = decodeJwtPayload(stored);
        setUser(payload.user || null);
      } catch (e) {
        console.warn('Failed to parse stored token', e);
      }
    }
  } catch (e) {
    console.warn('Auth token handling error', e);
  }
}, []);

useEffect(() => {
  let isMounted = true;

  const loadCourts = async () => {
    try {
      const nextCourts = await fetchCourts();
      if (isMounted && Array.isArray(nextCourts) && nextCourts.length > 0) {
        setCourts(nextCourts);
      }
    } catch (error) {
      console.error('Failed to load courts from API, falling back to local data:', error);
      if (isMounted) {
        setCourts(COURTS);
      }
    }
  };

  loadCourts();

  return () => {
    isMounted = false;
  };
}, []);



useEffect(() => {
  if (!Array.isArray(courts) || courts.length === 0) return;

  const courtsWithAddress = courts.filter(
    (court) => court?.address && court.address !== 'Київ (адреса невідома)'
  );

  if (courtsWithAddress.length === 0) return;

  const calculatePriority = (court) => {
    const popularityScore = Number(court?.popularity) || 0;
    const bookingScore = Math.min(getCourtBookingsCount(court.id), 40);
    const statusClass = getCourtStatusDotClassName(court);

    let loadBoost = 10;
    if (statusClass.includes('busy')) loadBoost = 28;
    if (statusClass.includes('medium')) loadBoost = 18;
    if (statusClass.includes('free')) loadBoost = 6;

    return popularityScore + bookingScore + loadBoost;
  };

  const buildQueue = () => {
    const q = new MaxPriorityQueue();
    courtsWithAddress.forEach((court) => {
      q.enqueue(court, calculatePriority(court));
    });
    return q;
  };

  let priorityQueue = buildQueue();

  function* recommendationGenerator() {
    while (true) {
      const next = priorityQueue.dequeue();
      if (!next) {
        priorityQueue = buildQueue();
        continue;
      }
      yield next;
    }
  }

  const courtsGen = recommendationGenerator();

  const stopRecommend = runEngine(
    courtsGen,
    (court) => {
      if (court) {
        setRecommendedCourt({
          ...court,
          statusText: getCourtStatusText(court),
        });
      }
    },
    5000
  );

  return () => {
    stopRecommend();
  };
}, [courts]);

  return (
    
    
    <div className={`app${isCourtPage ? ' app--court-page' : ''}`}>
      {/* навігація */}
      <Navbar user={mergedUser} setUser={setUser} onSaveProfile={handleProfileSave} />

      

      {/* live рамка тих хто чекіниться */}
      {!isCourtPage && <LastCheckinBanner activeUser={activeUser} borderColor={borderColor} />}

      {/* рекомендована площадка, що змінюється раз на 5 секунд */}
      {!isCourtPage && (
        <div className="recommended-court-banner">
          {recommendedCourt ? (
            <>
              <div className="recommended-label">Рекомендована площадка</div>
              <div className="recommended-name">{recommendedCourt.name}</div>
              <div className="recommended-address">{recommendedCourt.address}</div>
              <div className="recommended-status">{recommendedCourt.statusText}</div>
            </>
          ) : (
            <div className="recommended-placeholder">Завантаження рекомендованої площадки...</div>
          )}
        </div>
      )}

      {/* головний контейнер */}
      <div className="main-container">
        
        {/* лівий сайдбар */}
        {!isCourtPage && (
          <Sidebar
            courts={courts}
            selectedCourtId={selectedCourtId}
            onSelectCourt={(court) => setSelectedCourtId(court?.id ?? null)}
          />
        )}

        {/* права частина карта */}
        {!isCourtPage && (
          <MapView
            courts={courts}
            selectedCourtId={selectedCourtId}
            onSelectCourt={(court) => setSelectedCourtId(court?.id ?? null)}
          />
        )}

      </div>
    </div>
  );
}

export default App;