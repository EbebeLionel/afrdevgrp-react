import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userData, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        avatarRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  // Get user's initials
  const getUserInitial = () => {
    if (userData?.name) {
      return userData.name.charAt(0).toUpperCase();
    }
    if (currentUser?.displayName) {
      return currentUser.displayName.charAt(0).toUpperCase();
    }
    if (currentUser?.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="Header">
      <img
        src="/images/Adg-image2.png"
        alt="ADG"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer', height: '50px' }}
      />
      <div className="nav">
        <ul>
          <li 
            className={`home ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <img src="https://cdn-icons-png.flaticon.com/128/25/25694.png" alt="Home" />
          </li>
          <li 
            className={`events ${location.pathname === '/events' ? 'active' : ''}`}
            onClick={() => navigate('/events')}
          >
            <img src="https://cdn-icons-png.flaticon.com/128/3857/3857838.png" alt="Events" />
          </li>
          <li 
            className={`reels ${location.pathname === '/reels' ? 'active' : ''}`}
            onClick={() => navigate('/reels')}
          >
            <img src="https://cdn-icons-png.flaticon.com/128/12595/12595820.png" alt="Reels" />
          </li>
          
          {currentUser ? (
            <li className="user-avatar-container">
              <div 
                ref={avatarRef}
                className="user-avatar" 
                onClick={toggleDropdown}
              >
                {getUserInitial()}
              </div>
              {showDropdown && (
                <div ref={dropdownRef} className="user-dropdown">
                  <div className="user-info">
                    <p className="user-name">{userData?.name || currentUser.displayName || 'User'}</p>
                    <p className="user-email">{currentUser.email}</p>
                  </div>
                  <button 
                    className="logout-btn" 
                    onClick={handleLogout}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </li>
          ) : (
            <li 
              className={`log-in ${location.pathname === '/auth' ? 'active' : ''}`}
              onClick={() => navigate('/auth')}
            >
              <img src="https://cdn-icons-png.flaticon.com/128/6681/6681235.png" alt="Log in" />
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default Header;