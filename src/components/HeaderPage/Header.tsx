import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFeedback } from '../common/Feedback';
import './Header.css';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: 'https://cdn-icons-png.flaticon.com/128/25/25694.png', className: 'home' },
  { path: '/events', label: 'Events', icon: 'https://cdn-icons-png.flaticon.com/128/3857/3857838.png', className: 'events' },
  { path: '/reels', label: 'Reels', icon: 'https://cdn-icons-png.flaticon.com/128/12595/12595820.png', className: 'reels' },
];

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, profile, logout } = useAuth();
  const { show } = useFeedback();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!showDropdown) return;
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
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowDropdown(false);
        avatarRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
      show('You have signed out.', 'success');
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
      show('Sign-out did not finish. Please try again.', 'error');
    }
  };

  const displayName = profile?.fullName || currentUser?.email || 'Signed-in user';
  const initial = displayName.charAt(0).toUpperCase();

  // Keyboard users get the same activation as mouse users.
  const activate = (action: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <header className="Header">
      <button
        type="button"
        className="brand-button"
        onClick={() => navigate('/')}
        aria-label="African Development Group Columbia, go to home page"
      >
        <img src="/images/Adg-image2.png" alt="" className="brand-logo" />
      </button>

      <nav className="nav" aria-label="Main">
        <ul>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <li
                key={item.path}
                className={`${item.className} ${active ? 'active' : ''}`}
                role="link"
                tabIndex={0}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                title={item.label}
                onClick={() => navigate(item.path)}
                onKeyDown={activate(() => navigate(item.path))}
              >
                <img src={item.icon} alt="" />
                <span className="nav-label">{item.label}</span>
              </li>
            );
          })}

          {currentUser ? (
            <li className="user-avatar-container">
              <button
                ref={avatarRef}
                type="button"
                className="user-avatar"
                aria-label={`Account menu for ${displayName}`}
                aria-expanded={showDropdown}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown((open) => !open);
                }}
              >
                {initial}
              </button>
              {showDropdown && (
                <div ref={dropdownRef} className="user-dropdown" role="menu">
                  <div className="user-info">
                    <p className="user-name">{displayName}</p>
                    <p className="user-email">{currentUser.email}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    className="logout-btn"
                    onClick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </li>
          ) : (
            <li
              className={`log-in ${location.pathname === '/auth' ? 'active' : ''}`}
              role="link"
              tabIndex={0}
              aria-label="Sign in"
              aria-current={location.pathname === '/auth' ? 'page' : undefined}
              title="Sign in"
              onClick={() => navigate('/auth', { state: { from: location.pathname } })}
              onKeyDown={activate(() => navigate('/auth', { state: { from: location.pathname } }))}
            >
              <img src="https://cdn-icons-png.flaticon.com/128/6681/6681235.png" alt="" />
              <span className="nav-label">Sign in</span>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}

export default Header;
