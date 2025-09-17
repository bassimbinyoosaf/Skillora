import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Users,
  Award,
  Briefcase,
  Target,
  Video,
  MessageCircle,
  Calendar,
  Building
} from 'lucide-react';

export const Services = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Define the yellows here for clarity
  const loggedOutYellow = '#FBBF24'; // brighter golden yellow for logged out
  const loggedInYellow = '#F59E0B'; // amber from logo for logged in

  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const userData = localStorage.getItem('skillora_user');
        const authToken = localStorage.getItem('skillora_auth_token');
        const isAuth = !!(userData && authToken);
        setIsAuthenticated(isAuth);
        setUser(isAuth ? JSON.parse(userData) : null);
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    checkAuthStatus();
    const handleAuthStateChange = (event) => {
      setIsAuthenticated(event.detail.isAuthenticated);
      setUser(event.detail.user);
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);
    const authCheckInterval = setInterval(checkAuthStatus, 2000);

    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
      clearInterval(authCheckInterval);
    };
  }, []);

  const services = [
    {
      title: "Online Courses",
      description:
        "Comprehensive courses covering various topics from beginner to advanced levels.",
      features: ["Video lectures", "Interactive assignments", "Progress tracking", "Certificates"]
    },
    {
      title: "Personal Mentoring",
      description:
        "One-on-one guidance from industry experts to accelerate your learning journey.",
      features: ["Custom learning path", "Regular check‑ins", "Career guidance", "Portfolio review"]
    },
    {
      title: "Workshop Series",
      description:
        "Hands-on workshops designed to provide practical experience in specific skills.",
      features: ["Live sessions", "Group projects", "Networking opportunities", "Real‑world scenarios"]
    },
    {
      title: "Corporate Training",
      description:
        "Customized training solutions for organizations looking to upskill their teams.",
      features: ["Tailored curriculum", "Team assessments", "Progress analytics", "Ongoing support"]
    }
  ];

  const authenticatedServices = [
    {
      icon: BookOpen,
      title: "Academic Tracking",
      desc: "Monitor your semester performance, GPA trends, and academic milestones with detailed analytics and insights."
    },
    {
      icon: Briefcase,
      title: "Career Management",
      desc: "Track internships, job applications, placement opportunities, and build your professional portfolio."
    },
    {
      icon: Target,
      title: "Goal Setting",
      desc: "Set, track, and achieve your academic and career objectives with personalized milestone tracking."
    },
    {
      icon: Award,
      title: "Achievement Hub",
      desc: "Document your certifications, awards, projects, and accomplishments in one organized space."
    }
  ];

  const premiumFeatures = [
    { icon: Video, title: "Video Tutorials", desc: "Access exclusive learning content and guides" },
    { icon: MessageCircle, title: "Mentorship", desc: "Connect with industry professionals and alumni" },
    {
      icon: Calendar,
      title: "Schedule Planner",
      desc: "Organize your academic and career activities"
    },
    {
      icon: Building,
      title: "Company Insights",
      desc: "Get detailed information about potential employers"
    }
  ];

  const handleContactClick = () => (window.location.href = '/contact');

  // --- Logged-out UI (Glassmorphism design, original bright golden yellow) ---
  if (!isAuthenticated) {
    return (
      <div
        className="position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          paddingTop: '50px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          className="position-absolute w-100 h-100"
          style={{
            background:
              'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
            animation: 'float 6s ease-in-out infinite'
          }}
        ></div>

        <div
          className="position-relative py-5 px-3"
          style={{ width: '100%', maxWidth: '1200px' }}
        >
          <div className="text-center mb-5">
            <h1
              className="display-4 fw-bold text-white"
              style={{
                textShadow: '0 10px 30px rgba(0,0,0,0.3)',
                marginTop: 0,
                marginBottom: '2rem'
              }}
            >
              Our <span style={{ color: loggedOutYellow }}>Services</span>
            </h1>
            <p
              className="fs-5 text-white-50 mb-5 mx-auto"
              style={{ maxWidth: '650px' }}
            >
              Discover our range of learning solutions designed to help you achieve your goals.
            </p>
          </div>

          <div className="row justify-content-center g-4">
            {services.map((service, idx) => (
              <div key={idx} className="col-md-6 col-lg-5 col-xl-3">
                <div
                  className="p-4 rounded-4"
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    height: '100%'
                  }}
                >
                  <h3 className="fw-bold mb-3" style={{ fontSize: '1.25rem', color: loggedOutYellow }}>
                    {service.title}
                  </h3>
                  <p className="text-white-50 mb-3" style={{ fontSize: '0.9rem' }}>
                    {service.description}
                  </p>
                  <ul className="text-white-50 ps-3" style={{ fontSize: '0.85rem' }}>
                    {service.features.map((f, i) => (
                      <li key={i} className="mb-1">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-5">
            <h2 className="mb-3 text-white">Ready to Get Started?</h2>
            <p className="text-white-50 mb-4">
              Choose the service that best fits your learning needs and begin your journey today.
            </p>
            <button
              onClick={handleContactClick}
              className="btn btn-lg px-5 py-3 rounded-pill fw-semibold shadow-lg"
              style={{
                transition: 'all 0.3s ease',
                backgroundColor: loggedOutYellow,
                border: 'none',
                color: '#111827'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = `0 15px 35px ${loggedOutYellow}66`;
                e.target.style.backgroundColor = '#FCD34D';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                e.target.style.backgroundColor = loggedOutYellow;
              }}
            >
              Contact Us Today
            </button>
          </div>
        </div>
        <style jsx>{`
          @keyframes float {
            0%,
            100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }
        `}</style>
      </div>
    );
  }

  // --- Logged-in UI (Dark theme with glassmorphism styling, amber yellow) ---
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#111827',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        paddingTop: '90px'
      }}
    >
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}
      >
        Our <span style={{ color: loggedInYellow }}>Services</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.7 }}
        style={{
          color: '#9CA3AF',
          marginBottom: '2rem',
          textAlign: 'center',
          fontSize: '1.1rem',
          maxWidth: '600px'
        }}
      >
        Explore powerful tools designed to enhance your academic and career success.
      </motion.p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
          gap: '1.8rem',
          maxWidth: '900px',
          width: '100%'
        }}
      >
        {authenticatedServices.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 * i, duration: 0.6 }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(15px)',
              borderRadius: '1rem',
              padding: '1.8rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              color: 'white',
              boxShadow: '0 8px 25px rgba(0,0,0,0.6)'
            }}
          >
            <Icon size={28} color={loggedInYellow} style={{ marginBottom: '0.6rem' }} />
            <h3 style={{ marginBottom: '0.6rem', fontWeight: '700', color: loggedInYellow }}>
              {title}
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#D1D5DB' }}>{desc}</p>
          </motion.div>
        ))}
      </div>

      <div
        style={{
          maxWidth: '900px',
          width: '100%',
          marginTop: '3.5rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          backdropFilter: 'blur(15px)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.7)',
          textAlign: 'center',
          color: '#D1D5DB'
        }}
      >
        <h2 style={{ color: loggedInYellow, marginBottom: '1.5rem' }}>Premium Features</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
            gap: '1.5rem'
          }}
        >
          {premiumFeatures.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '1.2rem 1.5rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.9rem',
                boxShadow: '0 5px 15px rgba(0,0,0,0.5)'
              }}
            >
              <Icon size={26} color={loggedInYellow} />
              <div>
                <h4
                  style={{
                    marginBottom: '0.3rem',
                    fontWeight: '600',
                    color: loggedInYellow
                  }}
                >
                  {title}
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#E0E0E0', margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
