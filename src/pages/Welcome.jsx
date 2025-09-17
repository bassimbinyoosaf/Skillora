import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BookOpen, Briefcase, Target, GraduationCap, Users, Shield, Settings, BarChart3, Database, UserCheck, ClipboardList, FileText, Crown } from "lucide-react";

export function Welcome() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const userData = localStorage.getItem('skillora_user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        const adminStatus = parsedUser.role === 'admin' || 
                          parsedUser.isAdmin === true ||
                          parsedUser.email === 'admin@skillora.org';
        
        setIsAdmin(adminStatus);
        console.log('User data loaded:', parsedUser);
        console.log('Admin status detected:', adminStatus);
        
        if (adminStatus) console.log('🔐 Admin user detected - showing admin interface');
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }, []);

  // Centralized configuration object
  const config = {
    welcome: isAdmin 
      ? { message: <><Crown size={40} style={{ color: '#F59E0B' }} /><span>Welcome Admin - {user?.firstName}</span></>, color: "#FCA5A5" }
      : { message: `Welcome back, ${user?.firstName || "to Skillora"}`, color: "white" },
    
    subtext: isAdmin 
      ? "You have full administrative access to the Skillora platform. Manage users, monitor system performance, and oversee academic progress tracking across the entire system."
      : "Track your academic & career progress with ease. Stay updated on your goals, internships, placements, and more—all in one place.",
    
    testimonial: isAdmin 
      ? "\"Skillora's admin panel provides comprehensive oversight and management capabilities for our entire academic tracking system.\""
      : "\"The Student Career Tracker has transformed how I manage my academic journey.\"",
    
    buttons: isAdmin 
      ? [
          { icon: Shield, text: "Admin Panel", bg: "#DC2626", hover: "#B91C1C", onClick: () => console.log('Navigate to Admin Panel') },
          { icon: BarChart3, text: "View Reports", bg: "transparent", hover: "rgba(107, 114, 128, 0.1)", border: true, onClick: () => console.log('Navigate to Reports') }
        ]
      : [
          { text: "Get Started", bg: "#2563EB", hover: "#1D4ED8", onClick: () => navigate('/tracker') }, // Changed to navigate to /tracker
          { text: "Dashboard", bg: "transparent", hover: "rgba(107, 114, 128, 0.1)", border: true, onClick: () => navigate('/dashboard') }
        ]
  };

  // Consolidated features object
  const features = {
    original: [
      { icon: BookOpen, title: "Academic Progress", desc: "View semester wise performance", color: "#3B82F6" },
      { icon: Briefcase, title: "Placement Tracker", desc: "Record company visits and offers", color: "#3B82F6" },
      { icon: Target, title: "Goal Setting", desc: "Set academic & career milestones", color: "#3B82F6" }
    ],
    admin: isAdmin ? [
      { icon: Users, title: "User Management", desc: "Add, edit, and manage student & faculty accounts with full control", color: "#EF4444" },
      { icon: BarChart3, title: "Analytics Dashboard", desc: "View comprehensive platform statistics and performance reports", color: "#EF4444" },
      { icon: Database, title: "Data Management", desc: "Backup, export, and maintain all system data and records", color: "#EF4444" },
      { icon: Settings, title: "System Settings", desc: "Configure platform preferences and administrative settings", color: "#EF4444" },
      { icon: UserCheck, title: "Role Management", desc: "Assign and modify user roles and access permissions", color: "#EF4444" },
      { icon: ClipboardList, title: "Audit Logs", desc: "Monitor all system activities and user interactions", color: "#EF4444" }
    ] : [],
    roles: [
      { icon: GraduationCap, title: "Students", desc: "Track learning & placements", color: "#10B981" },
      { icon: Users, title: "Faculty", desc: "Monitor student performance", color: "#10B981" },
      { icon: Shield, title: "Admin", desc: "Manage users, data & reports", color: "#10B981" }
    ],
    capabilities: isAdmin ? [
      { icon: Shield, title: "Administrative Control", desc: "Complete system access and management capabilities", color: "#F59E0B" },
      { icon: FileText, title: "Reports & Analytics", desc: "Generate comprehensive system reports and insights", color: "#F59E0B" },
      { icon: Database, title: "Data Oversight", desc: "Monitor, backup, and maintain data integrity", color: "#F59E0B" }
    ] : []
  };

  // Reusable FeatureGrid component
  const FeatureGrid = ({ items, title, titleColor }) => (
    <>
      {title && (
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "3rem", marginBottom: "1rem", textAlign: "center", color: titleColor }}
        >
          {title}
        </motion.h2>
      )}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.2 } } }}
        style={{ 
          marginTop: title ? "0" : "1rem",
          display: "grid", 
          gap: "1.5rem", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          maxWidth: "1024px", 
          width: "100%" 
        }}
      >
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              backgroundColor: "#1F2937",
              borderRadius: "1rem",
              padding: "1.5rem",
              textAlign: "center",
              border: title ? "1px solid #374151" : "none",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            whileHover={{ scale: 1.02, backgroundColor: "#374151" }}
          >
            <div style={{ marginBottom: "1rem", color: item.color }}>
              <item.icon size={32} />
            </div>
            <h3 style={{ marginBottom: "0.5rem" }}>{item.title}</h3>
            <p style={{ color: "#9CA3AF", fontSize: "0.9rem" }}>{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </>
  );

  // Reusable Button component
  const Button = ({ icon: Icon, text, bg, hover, border, onClick }) => (
    <button
      style={{
        backgroundColor: bg,
        border: border ? "1px solid #6B7280" : "none",
        padding: "0.75rem 1.5rem",
        borderRadius: "0.5rem",
        fontWeight: "600",
        cursor: "pointer",
        color: "white",
        transition: "all 0.3s ease",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem"
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = hover;
        if (border) e.target.style.borderColor = "#9CA3AF";
        e.target.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = bg;
        if (border) e.target.style.borderColor = "#6B7280";
        e.target.style.transform = "translateY(0)";
      }}
      onClick={onClick}
    >
      {Icon && <Icon size={18} />}
      {text}
    </button>
  );

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#111827",
      color: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
      paddingTop: "90px",
    }}>
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
      
      {/* Admin Status Banner */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            backgroundColor: "#7C2D12",
            border: "1px solid #DC2626",
            borderRadius: "1rem",
            padding: "1rem 1.5rem",
            marginBottom: "2rem",
            textAlign: "center",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #DC2626, #F59E0B, #DC2626)",
            animation: "shimmer 2s linear infinite"
          }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <Shield size={24} style={{ color: "#F59E0B" }} />
            <div>
              <div style={{ fontWeight: "700", fontSize: "1.1rem", color: "#FEE2E2" }}>
                Administrator Privileges Active
              </div>
              <div style={{ fontSize: "0.85rem", color: "#FECACA", marginTop: "0.25rem" }}>
                Logged in as: {user?.email || 'Admin'} • Full System Access
              </div>
            </div>
            <Crown size={24} style={{ color: "#F59E0B" }} />
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{
          fontSize: "2.5rem",
          fontWeight: "bold",
          marginBottom: "1rem",
          textAlign: "center",
          color: config.welcome.color,
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          justifyContent: "center"
        }}
      >
        {config.welcome.message}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.7 }}
        style={{ color: "#9CA3AF", marginBottom: "1.5rem", textAlign: "center", maxWidth: "600px" }}
      >
        {config.subtext}
      </motion.p>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.7 }}
        style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "2rem" }}
      >
        {config.buttons.map((btn, i) => <Button key={i} {...btn} />)}
      </motion.div>

      {/* Feature Grids */}
      <FeatureGrid items={features.original} />
      {features.admin.length > 0 && <FeatureGrid items={features.admin} title="Administrative Features" titleColor="#EF4444" />}
      <FeatureGrid items={features.roles} />
      {features.capabilities.length > 0 && <FeatureGrid items={features.capabilities} title="Administrative Capabilities" titleColor="#F59E0B" />}

      {/* Testimonial */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.7 }}
        style={{ maxWidth: "768px", textAlign: "center", marginTop: "4rem", marginBottom: "3rem" }}
      >
        <p style={{ fontStyle: "italic", color: "#D1D5DB", fontSize: "1.125rem" }}>
          {config.testimonial}
        </p>
      </motion.div>
    </div>
  );
}