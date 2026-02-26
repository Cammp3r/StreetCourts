 import { Routes, Route, Link } from "react-router-dom";
 import { UserProfilePage } from "../pages/UserProfile";

export function Navbar() {
  return (
    <div>
    <nav className="navbar">
      <div className="logo">StreetCourts</div>
      <div className="nav-menu">
        <Link to="/" className="active">
          Карта
        </Link>
        <Link to="/profile">Мій профіль</Link>
      </div>
    </nav>

    <Routes>

    <Route path="/profile" element={<UserProfilePage />} />
      </Routes>
    </div>
  );
}
