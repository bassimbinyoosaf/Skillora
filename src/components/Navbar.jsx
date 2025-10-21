import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentPath, setCurrentPath] = useState(location.pathname);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const [state, setState] = useState(() => {
    try {
      const userData = localStorage.getItem('skillora_user');
      const authToken = localStorage.getItem('skillora_auth_token');
      return {
        isAuthenticated: !!(userData && authToken),
        user: userData ? JSON.parse(userData) : null
      };
    } catch {
      return { isAuthenticated: false, user: null };
    }
  });

  // Check if user is admin
  const isAdmin = state.user?.role === 'admin' || 
                  state.user?.isAdmin === true || 
                  state.user?.email === 'admin@skillora.org';

  // Navigation items configuration - Tracker only shows when authenticated AND not admin
  const navItems = [
    { path: '/', label: 'Home', isActive: () => state.isAuthenticated ? currentPath === '/welcome' : currentPath === '/' },
    { path: '/about', label: 'About' },
    // Conditionally add Tracker link only when authenticated AND not admin
    ...(state.isAuthenticated && !isAdmin ? [{ path: '/tracker', label: 'Tracker' }] : []),
    { path: '/services', label: 'Services' },
    { path: '/contact', label: 'Contact' }
  ];

  const authButtons = [
    { path: '/login', label: 'Login', variant: 'outline' },
    { path: '/signup', label: 'Sign Up', variant: 'solid' }
  ];

  const userMenuItems = [
    { path: '/profile', label: 'Profile' },
    { path: '/dashboard', label: 'Dashboard' },
    // Only show Tracker in dropdown if not admin
    ...(!isAdmin ? [{ path: '/tracker', label: 'Tracker' }] : []),
    { label: 'Logout', action: 'logout', variant: 'danger' }
  ];

  useEffect(() => setCurrentPath(location.pathname), [location.pathname]);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('skillora_user');
        const authToken = localStorage.getItem('skillora_auth_token');
        const newState = { isAuthenticated: !!(userData && authToken), user: userData ? JSON.parse(userData) : null };
        setState(prev => JSON.stringify(prev) !== JSON.stringify(newState) ? newState : prev);
      } catch (error) {
        console.error('Auth check error:', error);
        setState({ isAuthenticated: false, user: null });
      }
    };

    checkAuth();
    const interval = setInterval(checkAuth, 2000);
    const handleAuthChange = (e) => setState(e.detail);
    
    window.addEventListener('authStateChanged', handleAuthChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.skillora-user-menu')) setShowUserDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setShowUserDropdown(false);
  };

  const handleNavClick = (e, path) => {
    e.preventDefault();
    navigate(path === '/' && state.isAuthenticated ? '/welcome' : path);
    closeMenus();
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('skillora_auth_token');
      localStorage.removeItem('skillora_user');
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    setState({ isAuthenticated: false, user: null });
    closeMenus();
    navigate('/');
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { isAuthenticated: false, user: null } }));
  };

  const getDisplayName = () => {
    if (!state.user) return 'User';
    const { firstName, lastName, fullName, name, email } = state.user;
    return (firstName && lastName) ? `${firstName} ${lastName}` 
         : firstName || fullName || name || email?.split('@')[0] || 'User';
  };

  const NavLink = ({ item, isMobile = false }) => {
    const isActive = item.isActive ? item.isActive() : currentPath === item.path;
    return (
      <li className={`skillora-nav-item ${isActive ? 'active' : ''}`}>
        <a href={item.path} className="skillora-nav-link" onClick={(e) => handleNavClick(e, item.path)}>
          {item.label}
        </a>
      </li>
    );
  };

  const AuthButton = ({ button, isMobile = false }) => (
    <li className={`skillora-nav-item ${isMobile ? 'skillora-mobile-auth' : ''}`}>
      <button
        type="button"
        className={`skillora-auth-btn skillora-${button.variant === 'outline' ? 'login' : 'signup'}-btn ${currentPath === button.path ? 'active' : ''}`}
        onClick={() => { navigate(button.path); closeMenus(); }}
      >
        {button.label}
      </button>
    </li>
  );

  return (
    <>
      <nav className='skillora-nav'>
        <a href="/" className='skillora-site-name' onClick={(e) => handleNavClick(e, '/')}>
          Skillora
        </a>
        
        <button 
          className={`skillora-mobile-menu-btn ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); setShowUserDropdown(false); }}
          type="button"
        >
          ☰
        </button>
        
        <ul className={`skillora-nav-menu ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {navItems.map((item, i) => <NavLink key={i} item={item} />)}
          
          {!state.isAuthenticated ? (
            <>
              <li className="skillora-nav-item skillora-mobile-auth-divider"></li>
              {authButtons.map((button, i) => <AuthButton key={i} button={button} isMobile />)}
            </>
          ) : (
            <>
              <li className="skillora-nav-item skillora-mobile-auth-divider"></li>
              <li className="skillora-nav-item skillora-mobile-user">
                <div className="skillora-mobile-user-info">
                  <span className="skillora-mobile-username">Welcome, {getDisplayName()}</span>
                  <button type="button" className="skillora-mobile-logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </li>
            </>
          )}
        </ul>

        <div className='skillora-nav-auth'>
          {!state.isAuthenticated ? (
            authButtons.map((button, i) => (
              <button 
                key={i}
                type="button"
                className={`skillora-auth-btn skillora-${button.variant === 'outline' ? 'login' : 'signup'}-btn ${currentPath === button.path ? 'active' : ''}`}
                onClick={() => navigate(button.path)}
              >
                {button.label}
              </button>
            ))
          ) : (
            <div className="skillora-user-menu">
              <button type="button" className="skillora-user-btn" onClick={() => setShowUserDropdown(!showUserDropdown)}>
                <span className="skillora-username">Hi, {getDisplayName()}</span>
                <span className={`skillora-dropdown-arrow ${showUserDropdown ? 'open' : ''}`}>▼</span>
              </button>
              
              {showUserDropdown && (
                <div className="skillora-user-dropdown">
                  <div className="skillora-user-info">
                    <div className="skillora-user-name">{getDisplayName()}</div>
                    {state.user?.email && <div className="skillora-user-email">{state.user.email}</div>}
                  </div>
                  <div className="skillora-dropdown-divider"></div>
                  {userMenuItems.map((item, i) => (
                    <button 
                      key={i}
                      type="button"
                      className={`skillora-dropdown-item ${item.variant === 'danger' ? 'skillora-logout-item' : ''}`}
                      onClick={item.action === 'logout' ? handleLogout : (e) => handleNavClick(e, item.path)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          margin: 0 !important;
          padding: 0 !important;
        }

        .skillora-nav {
          display: flex !important;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          height: 60px;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          margin: 0;
        }

        .skillora-site-name {
          font-weight: bold;
          font-size: 1.5rem;
          color: #e2e8f0 !important;
          text-decoration: none;
        }

        .skillora-site-name:hover {
          color: #ff9800 !important;
        }

        .skillora-nav-menu {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
          gap: 1.5rem;
          align-items: center;
        }

        .skillora-nav-item {
          position: relative;
        }

        .skillora-nav-link {
          color: #e2e8f0 !important;
          text-decoration: none;
          font-weight: 500;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          transition: all 0.3s ease;
          display: block;
        }

        .skillora-nav-link:hover {
          color: #ff9800 !important;
        }

        .skillora-nav-item.active .skillora-nav-link {
          font-weight: bold;
          color: #ff9800 !important;
        }

        .skillora-nav-auth {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .skillora-auth-btn {
          padding: 0.5rem 1rem;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid;
          transition: all 0.3s ease;
          font-size: 0.9rem;
          background: transparent;
        }

        .skillora-login-btn {
          color: #e2e8f0 !important;
          border-color: #e2e8f0;
        }

        .skillora-login-btn:hover, .skillora-login-btn.active {
          color: #ff9800 !important;
          border-color: #ff9800;
        }

        .skillora-signup-btn {
          background: #ff9800 !important;
          color: white !important;
          border-color: #ff9800;
        }

        .skillora-signup-btn:hover, .skillora-signup-btn.active {
          background: #e68900 !important;
          border-color: #e68900;
        }

        .skillora-user-menu {
          position: relative;
        }

        .skillora-user-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 152, 0, 0.1);
          border: 1px solid #ff9800;
          border-radius: 25px;
          color: #ff9800 !important;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .skillora-user-btn:hover {
          background: rgba(255, 152, 0, 0.2);
        }

        .skillora-username {
          font-size: 0.9rem;
        }

        .skillora-dropdown-arrow {
          font-size: 0.7rem;
          transition: transform 0.3s ease;
        }

        .skillora-dropdown-arrow.open {
          transform: rotate(180deg);
        }

        .skillora-user-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 200px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          padding: 8px 0;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          z-index: 10001;
        }

        .skillora-user-info {
          padding: 12px 16px;
        }

        .skillora-user-name {
          font-weight: 600;
          color: #e2e8f0;
          font-size: 0.95rem;
        }

        .skillora-user-email {
          color: #94a3b8;
          font-size: 0.85rem;
          margin-top: 2px;
        }

        .skillora-dropdown-divider {
          height: 1px;
          background: rgba(148, 163, 184, 0.2);
          margin: 8px 0;
        }

        .skillora-dropdown-item {
          width: 100%;
          text-align: left;
          padding: 10px 16px;
          background: none;
          border: none;
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }

        .skillora-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ff9800;
        }

        .skillora-logout-item {
          color: #ef4444 !important;
        }

        .skillora-logout-item:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171 !important;
        }

        .skillora-mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.3s ease;
          color: #e2e8f0;
          z-index: 10001;
        }

        .skillora-mobile-menu-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .skillora-mobile-auth,
        .skillora-mobile-auth-divider,
        .skillora-mobile-user {
          display: none;
        }

        @media (max-width: 768px) {
          .skillora-nav {
            padding: 0 1rem;
          }

          .skillora-mobile-menu-btn {
            display: block;
            order: 3;
          }

          .skillora-nav-menu {
            display: none;
            position: fixed;
            top: 60px;
            right: 0;
            width: 280px;
            max-width: 90vw;
            flex-direction: column;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 0 0 0 12px;
            padding: 16px 0;
            box-shadow: -2px 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-top: none;
            border-right: none;
            z-index: 10000;
            align-items: stretch;
            gap: 0;
          }

          .skillora-nav-menu.mobile-open {
            display: flex;
          }

          .skillora-nav-menu .skillora-nav-item {
            margin: 0;
            width: 100%;
          }

          .skillora-nav-menu .skillora-nav-link {
            padding: 16px 24px;
            margin: 0;
            border-radius: 0;
            font-weight: 500;
            transition: all 0.2s ease;
            color: #e2e8f0 !important;
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          }

          .skillora-nav-menu .skillora-nav-link:hover {
            background: rgba(255, 152, 0, 0.1);
            color: #ff9800 !important;
            padding-left: 32px;
          }

          .skillora-nav-menu .skillora-nav-item.active .skillora-nav-link {
            color: #ff9800 !important;
            background: rgba(255, 152, 0, 0.15);
            border-left: 4px solid #ff9800;
          }

          .skillora-nav-auth {
            display: none;
          }

          .skillora-mobile-auth,
          .skillora-mobile-user {
            display: block !important;
          }

          .skillora-mobile-auth-divider {
            display: block !important;
            height: 1px;
            background: rgba(148, 163, 184, 0.2);
            margin: 12px 0 !important;
            width: 100%;
          }

          .skillora-mobile-auth .skillora-auth-btn {
            width: calc(100% - 32px);
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 600;
            transition: all 0.2s ease;
            margin: 8px 16px;
            cursor: pointer;
            border: 2px solid;
            background: transparent;
          }

          .skillora-mobile-auth .skillora-login-btn {
            color: #e2e8f0 !important;
            border-color: rgba(148, 163, 184, 0.3);
          }

          .skillora-mobile-auth .skillora-login-btn:hover,
          .skillora-mobile-auth .skillora-login-btn:active {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(148, 163, 184, 0.5);
            transform: scale(0.98);
          }

          .skillora-mobile-auth .skillora-signup-btn {
            background: #ff9800 !important;
            color: white !important;
            border-color: #ff9800;
          }

          .skillora-mobile-auth .skillora-signup-btn:hover,
          .skillora-mobile-auth .skillora-signup-btn:active {
            background: #e68900 !important;
            border-color: #e68900;
            transform: scale(0.98);
          }

          .skillora-mobile-user-info {
            padding: 16px 24px;
            text-align: center;
          }

          .skillora-mobile-username {
            display: block;
            color: #ff9800;
            font-weight: 600;
            margin-bottom: 12px;
            font-size: 0.95rem;
          }

          .skillora-mobile-logout-btn {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid #ef4444;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .skillora-mobile-logout-btn:hover {
            background: rgba(239, 68, 68, 0.2);
            transform: scale(0.98);
          }
        }

        @media (max-width: 1024px) and (min-width: 769px) {
          .skillora-nav {
            padding: 0 1.5rem;
          }
          
          .skillora-nav-menu {
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .skillora-nav-menu {
            width: 100vw;
            right: 0;
            border-radius: 0;
          }
        }
      `}</style>
    </>
  );
}

export const handleLoginSuccess = (userData) => {
  console.log('Login success, storing user data:', userData);
  
  try {
    if (typeof Storage !== 'undefined') {
      localStorage.setItem('skillora_user', JSON.stringify(userData));
      localStorage.setItem('skillora_auth_token', 'authenticated_' + Date.now());
    }
    
    window.dispatchEvent(new CustomEvent('authStateChanged', { 
      detail: { isAuthenticated: true, user: userData } 
    }));
    
    console.log('Auth state updated, navbar should show user info');
  } catch (error) {
    console.error('Error in handleLoginSuccess:', error);
  }
};