import './App.css';
import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { COURTS } from './data/mockData';
import { fetchCourts } from './utils/courtsApi';

function App() {
const location = useLocation();
const isCourtPage = location.pathname.startsWith('/courts/');
const [selectedCourtId, setSelectedCourtId] = useState(null);
const [courts, setCourts] = useState(COURTS);

  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);

  const profileStorageKey = useMemo(() => {
    const profileId = user?.id || user?.email || user?.name;
    return profileId ? `sc_profile:${profileId}` : null;
  }, [user?.email, user?.id, user?.name]);

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
  const controller = new AbortController();

  const bootstrapAuth = async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('sc_token', token);
      params.delete('token');
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }

    const stored = localStorage.getItem('sc_token');
    if (!stored) return;

    try {
      const authBase = import.meta.env.VITE_AUTH_BASE || 'http://localhost:4000';
      const response = await fetch(`${authBase}/auth/verify?token=${encodeURIComponent(stored)}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        localStorage.removeItem('sc_token');
        return;
      }

      const payload = await response.json();
      if (payload?.ok && payload?.data?.user) {
        setUser(payload.data.user);
      } else {
        localStorage.removeItem('sc_token');
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        console.warn('Auth verification failed', e);
      }
    }
  };

  bootstrapAuth();

  return () => controller.abort();
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



  return (
    <div className={`app${isCourtPage ? ' app--court-page' : ''}`}>
      {/* навігація */}
      <Navbar user={mergedUser} setUser={setUser} onSaveProfile={handleProfileSave} />

      {/* головний контейнер */}
      <div className="main-container">

        {/* лівий сайдбар */}
        {!isCourtPage && (
          <Sidebar
            courts={courts}
            selectedCourtId={selectedCourtId}
            onSelectCourt={(court) => setSelectedCourtId(court?.id ?? null)}
            user={mergedUser}
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