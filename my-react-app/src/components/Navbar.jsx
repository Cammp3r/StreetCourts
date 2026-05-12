import { Routes, Route, Link } from "react-router-dom";
import { useState, useEffect } from 'react';
import { UserProfilePage } from "../pages/UserProfile";
import { CourtPage } from "../pages/CourtPage";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar({ user, setUser }) {
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem('sc_token')));

  useEffect(() => {
    const onStorage = () => setLoggedIn(Boolean(localStorage.getItem('sc_token')));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogin = () => {
    const authBase = import.meta.env.VITE_AUTH_BASE || 'http://localhost:4000';
    window.location.href = `${authBase}/auth/google`;
  };

  const handleLogout = () => {
    localStorage.removeItem('sc_token');
    setLoggedIn(false);
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
                <div className="nav-profile-initials">{(user.name||'').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()}</div>
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
        <Route path="/profile" element={<UserProfilePage user={user} />} />
        <Route path="/courts/:courtId" element={<CourtPage />} />
        <Route path="*" element={<></>} />
      </Routes>
    </div>
  );
}
