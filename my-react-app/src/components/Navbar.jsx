import { Routes, Route, Link } from "react-router-dom";
import { useEffect, useMemo } from 'react';
import { UserProfilePage } from "../pages/UserProfile";
import { CourtPage } from "../pages/CourtPage";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar({ user, setUser, onSaveProfile }) {
  const loggedIn = Boolean(user || localStorage.getItem('sc_token'));

  const initials = useMemo(() => {
    const name = String(user?.name || '');
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => Array.from(part)[0] || '')
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user?.name]);

  const handleLogin = () => {
    const authBase = import.meta.env.VITE_AUTH_BASE || 'http://localhost:4000';
    window.location.href = `${authBase}/auth/google`;
  };

  const handleLogout = () => {
    localStorage.removeItem('sc_token');
    if (setUser) setUser(null);
  };

  return (
    <div>
      <nav className="navbar">
        <div className="logo"><Link to="/">StreetCourts</Link></div>
        <div className="nav-menu">
          <Link to="/" className="active">
            Карта
          </Link>
          {user ? (
            <Link to="/profile" className="nav-profile">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="nav-profile-avatar" />
              ) : (
                <div className="nav-profile-initials">{initials}</div>
              )}
              <span className="nav-profile-name">{user.name}</span>
            </Link>
          ) : (
            <Link to="/profile">Мій профіль</Link>
          )}
          <ThemeToggle />
          {loggedIn ? (
            <button className="btn-link" onClick={handleLogout}>Вийти</button>
          ) : (
            <button className="btn-link" onClick={handleLogin}>Увійти через Google</button>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<></>} />
        <Route path="/profile" element={<UserProfilePage user={user} onSaveProfile={onSaveProfile} />} />
        <Route path="/courts/:courtId" element={<CourtPage />} />
        <Route path="*" element={<></>} />
      </Routes>
    </div>
  );
}
