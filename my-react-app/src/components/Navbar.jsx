import { Routes, Route, Link } from "react-router-dom";
import { UserProfilePage } from "../pages/UserProfile";
import { CourtPage } from "../pages/CourtPage";

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
        <Route path="/" element={<></>} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/courts/:courtId" element={<CourtPage />} />
        <Route path="*" element={<></>} />
      </Routes>
    </div>
  );
}
