import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { Navbar } from "./components/Navbar.jsx";
import { Home } from "./pages/Home.jsx";
import { About } from "./pages/About.jsx";
import { Contact } from "./pages/Contact.jsx";
import { Services } from "./pages/Services.jsx";
import { Login } from "./pages/Login.jsx";
import { Signup } from "./pages/Signup.jsx";
import { Welcome } from "./pages/Welcome.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Tracker } from "./pages/Tracker.jsx"; // Import the Tracker component
import { Profile } from "./pages/Profile.jsx"; // Import the Profile component

// Auto-scroll with login exception and browser scroll control
function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPath = useRef('');

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    
    if (!(prevPath.current === '/login' && pathname === '/welcome')) {
      window.scrollTo(0, 0);
    }
    prevPath.current = pathname;
  }, [pathname]);

  return null;
}

// Auth check helper
const isAuth = () => {
  try {
    return !!(localStorage.getItem('skillora_user') && localStorage.getItem('skillora_auth_token'));
  } catch { return false; }
};

// Protected route wrapper
const ProtectedRoute = ({ children, requireAuth = true, redirectTo = "/" }) => {
  const authenticated = isAuth();
  return (requireAuth && !authenticated) || (!requireAuth && authenticated) 
    ? <Navigate to={redirectTo} replace /> 
    : children;
};

// Animated route wrapper
const AnimatedRoute = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5 }}
  >
    {children}
  </motion.div>
);

function AnimatedRoutes() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(isAuth);
  const authCount = useRef(0);
  const lastAuthChange = useRef(Date.now());

  useEffect(() => {
    const handleAuthChange = (event) => {
      const now = Date.now();
      if (now - lastAuthChange.current < 100) return;
      lastAuthChange.current = now;
      setIsAuthenticated(event.detail.isAuthenticated);
    };

    setIsAuthenticated(isAuth());
    window.addEventListener('authStateChanged', handleAuthChange);
    
    const authInterval = setInterval(() => {
      if (++authCount.current % 5 === 0) {
        const currentAuth = isAuth();
        if (currentAuth !== isAuthenticated) setIsAuthenticated(currentAuth);
      }
    }, 1000);

    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange);
      clearInterval(authInterval);
    };
  }, [isAuthenticated]);

  // Route definitions with simplified structure
  const routes = [
    { path: "/", element: isAuthenticated ? <Navigate to="/welcome" replace /> : <Home />, public: true },
    { path: "/welcome", element: <Welcome />, requireAuth: true },
    { path: "/dashboard", element: <Dashboard />, requireAuth: true },
    { path: "/tracker", element: <Tracker />, requireAuth: true }, // Add Tracker route
    { path: "/profile", element: <Profile />, requireAuth: true }, // Add Profile route
    { path: "/login", element: <Login />, requireAuth: false, redirectTo: "/welcome" },
    { path: "/signup", element: <Signup />, requireAuth: false, redirectTo: "/welcome" },
    { path: "/about", element: <About />, public: true },
    { path: "/contact", element: <Contact />, public: true },
    { path: "/services", element: <Services />, public: true }
  ];

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {routes.map(({ path, element, public: isPublic, requireAuth, redirectTo }) => (
          <Route
            key={path}
            path={path}
            element={
              <AnimatedRoute>
                {isPublic ? element : (
                  <ProtectedRoute requireAuth={requireAuth} redirectTo={redirectTo || "/"}>
                    {element}
                  </ProtectedRoute>
                )}
              </AnimatedRoute>
            }
          />
        ))}
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  // Scroll debugging (condensed)
  useEffect(() => {
    console.log('Initial scroll:', window.scrollY);
    const logScroll = () => console.log('Scroll:', window.scrollY);
    let timeout;
    const logScrollEnd = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => console.log('Scroll ended:', window.scrollY), 150);
    };
    
    window.addEventListener('scroll', logScroll);
    window.addEventListener('scroll', logScrollEnd);
    return () => {
      window.removeEventListener('scroll', logScroll);
      window.removeEventListener('scroll', logScrollEnd);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <Navbar />
      <AnimatedRoutes />
    </Router>
  );
}