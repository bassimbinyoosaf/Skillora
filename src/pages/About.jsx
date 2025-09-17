import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Target, Users, Award, Lightbulb, Rocket } from 'lucide-react';

export const About = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

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

  const getDisplayName = () => {
    if (!user) return 'User';
    return user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` :
           user.firstName || user.fullName || user.name || user.email?.split('@')[0] || 'User';
  };

  // Logged out UI (Original colorful design)
  if (!isAuthenticated) {
    const sections = [
      { title: 'Our Mission', text: 'At Skillora, we believe that everyone has the potential to learn and grow. Our platform is designed to make skill development accessible, engaging, and effective for learners of all levels.' },
      { title: 'Our Story', text: 'Founded with the vision of democratizing education, Skillora brings together expert instructors and innovative learning technologies to create an unparalleled learning experience.' },
      { title: 'Why Choose Us?', list: ['Expert-led courses and tutorials', 'Interactive and practical learning approach', 'Flexible learning schedules', 'Community-driven support system'] }
    ];

    return (
      <div className="position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', paddingTop: '50px', minHeight: '100vh' }}>
        <div className="position-absolute w-100 h-100" style={{ background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)', animation: 'float 6s ease-in-out infinite' }}></div>
        <div className="position-relative py-5 px-3">
          <div className="text-center mb-5">
            <h1 className="display-4 fw-bold text-white" style={{ textShadow: '0 10px 30px rgba(0,0,0,0.3)', animation: 'fadeInUp 1s ease-out', marginTop: 0 }}>
              About <span className="text-warning">Skillora</span>
            </h1>
          </div>
          <div className="row justify-content-center g-4 px-md-5">
            {sections.map((section, idx) => (
              <div key={idx} className="col-md-10 col-lg-8">
                <div className="p-4 rounded-4 mb-4" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', animation: 'fadeInUp 1s ease-out', animationDelay: `${idx * 0.2}s`, animationFillMode: 'both' }}>
                  <h3 className="fw-bold text-warning mb-3">{section.title}</h3>
                  {section.text && <p className="text-white-50 fs-5">{section.text}</p>}
                  {section.list && (
                    <ul className="text-white-50 fs-5 ps-3">
                      {section.list.map((item, i) => <li key={i} className="mb-2">{item}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <style jsx>{`
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        `}</style>
      </div>
    );
  }

  // Logged in UI (Dark theme)
  const missionCards = [
    { icon: <Target size={32} />, title: "Our Mission", desc: "Empowering students to track, achieve, and exceed their academic and career goals through innovative technology." },
    { icon: <Lightbulb size={32} />, title: "Our Vision", desc: "Creating a world where every student has the tools and insights needed to shape their future successfully." },
    { icon: <Rocket size={32} />, title: "Your Journey", desc: "From academic tracking to career planning, we're here to support every step of your educational journey." }
  ];

  const features = [
    { icon: <BookOpen size={24} />, title: "Academic Tracking", desc: "Monitor your progress across all subjects and semesters" },
    { icon: <Target size={24} />, title: "Goal Management", desc: "Set and track your academic and career objectives" },
    { icon: <Award size={24} />, title: "Achievement Records", desc: "Keep track of your accomplishments and certificates" },
    { icon: <Users size={24} />, title: "Peer Community", desc: "Connect with fellow students and share experiences" }
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111827", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", paddingTop: "90px" }}>
      <motion.h1 initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem", textAlign: "center" }}>
        About <span style={{ color: "#F59E0B" }}>Skillora</span>
      </motion.h1>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.7 }} style={{ color: "#9CA3AF", marginBottom: "2rem", textAlign: "center", fontSize: "1.1rem", maxWidth: "600px" }}>
        Your personalized learning journey starts here. Discover our mission and how we're helping students like you achieve their goals.
      </motion.p>

      <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.2 } } }} style={{ marginBottom: "3rem", display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", maxWidth: "1024px", width: "100%" }}>
        {missionCards.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ backgroundColor: "#1F2937", borderRadius: "1rem", padding: "2rem", textAlign: "center", border: "1px solid #374151" }}>
            <div style={{ marginBottom: "1rem", color: "#F59E0B" }}>{item.icon}</div>
            <h3 style={{ marginBottom: "1rem", color: "#F3F4F6" }}>{item.title}</h3>
            <p style={{ color: "#9CA3AF", lineHeight: "1.6" }}>{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.2 } } }} style={{ marginBottom: "3rem", display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", maxWidth: "1024px", width: "100%" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ backgroundColor: "#1F2937", borderRadius: "1rem", padding: "1.5rem", textAlign: "center", border: "1px solid #374151", gridColumn: "1 / -1" }}>
          <h3 style={{ marginBottom: "1rem", color: "#F59E0B" }}>What You Get With Skillora</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
            {features.map((feature, i) => (
              <div key={i} style={{ padding: "1rem", textAlign: "center" }}>
                <div style={{ color: "#F59E0B", marginBottom: "0.5rem" }}>{feature.icon}</div>
                <h4 style={{ fontSize: "0.9rem", marginBottom: "0.5rem", color: "#F3F4F6" }}>{feature.title}</h4>
                <p style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.7 }} style={{ maxWidth: "768px", textAlign: "center", marginBottom: "3rem" }}>
        <div style={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: "1rem", padding: "2rem" }}>
          <h3 style={{ marginBottom: "1rem", color: "#F59E0B" }}>Ready to Excel?</h3>
          <p style={{ color: "#D1D5DB", fontSize: "1.1rem", marginBottom: "1.5rem" }}>
            Start tracking your academic journey and unlock your potential with our comprehensive tools and features.
          </p>
          <button style={{ backgroundColor: "#F59E0B", color: "#111827", border: "none", padding: "0.75rem 2rem", borderRadius: "0.5rem", fontWeight: "600", fontSize: "1rem", cursor: "pointer", transition: "all 0.3s ease" }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#D97706"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#F59E0B"}>
            Explore Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
};