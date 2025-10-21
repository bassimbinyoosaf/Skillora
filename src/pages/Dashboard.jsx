import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigate } from "react-router-dom";
import { 
  BookOpen, Target, Trophy, TrendingUp, User, Award, CheckCircle,
  BarChart3, Edit3, Star, Users, Shield, Trash2, XCircle, Search, AlertCircle,
  Calendar, Clock, Filter, ChevronRight, Activity, ChevronDown, Briefcase, X
} from "lucide-react";

const API_URL = 'http://localhost:5000/api';

export function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const userData = localStorage.getItem('skillora_user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const adminCheck = parsedUser.role === 'admin' || parsedUser.isAdmin === true || 
                          parsedUser.email === 'admn.skillora@gmail.com';
        setIsAdmin(adminCheck);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111827', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ width: '50px', height: '50px', border: '3px solid #374151', borderTop: '3px solid #3B82F6', 
              borderRadius: '50%', margin: '0 auto 1rem' }}
          />
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ color: '#9CA3AF', fontSize: '1rem' }}
          >
            Loading Dashboard...
          </motion.p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  if (isAdmin) {
    return <AdminDashboard user={user} />;
  }

  return <StudentDashboard user={user} />;
}

// Student Dashboard Component
function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCareers, setSelectedCareers] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loadingCareers, setLoadingCareers] = useState(true);
  const [loadingAchievements, setLoadingAchievements] = useState(true);

  // Load selected careers from backend (MongoDB)
  useEffect(() => {
    async function fetchCareers() {
      try {
        setLoadingCareers(true);
        const res = await fetch(`${API_URL}/overview/${user.email}`);
        const data = await res.json();
        if (data.success) {
          setSelectedCareers(data.overview?.careers || []);
        } else {
          console.warn("Failed to load careers:", data.message);
        }
      } catch (err) {
        console.error("Error fetching careers:", err);
      } finally {
        setLoadingCareers(false);
      }
    }
    fetchCareers();
  }, [user.email]);

  // Load achievements from backend
  useEffect(() => {
    async function fetchAchievements() {
      try {
        setLoadingAchievements(true);
        const res = await fetch(`${API_URL}/achievements/${user.email}`);
        const data = await res.json();
        if (data.success) {
          setAchievements(data.achievements || []);
        } else {
          console.warn("Failed to load achievements:", data.message);
        }
      } catch (err) {
        console.error("Error fetching achievements:", err);
      } finally {
        setLoadingAchievements(false);
      }
    }
    fetchAchievements();
  }, [user.email]);

  // Mark skill as complete
  const markSkillComplete = async (skill) => {
    try {
      const res = await fetch(`${API_URL}/achievements/complete-skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, skill }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Skill "${skill}" marked as completed and moved to Achievements!`);
        setSelectedCareers(data.remainingCareers || []);
        // Refresh achievements
        const achievementsRes = await fetch(`${API_URL}/achievements/${user.email}`);
        const achievementsData = await achievementsRes.json();
        if (achievementsData.success) {
          setAchievements(achievementsData.achievements || []);
        }
      } else {
        alert(`⚠️ ${data.message || "Failed to complete skill."}`);
      }
    } catch (error) {
      console.error("Error completing skill:", error);
      alert("❌ Error completing skill.");
    }
  };

  const handleRemoveCareer = async (careerTitle) => {
    const updatedCareers = selectedCareers.filter(c => c.title !== careerTitle);
    setSelectedCareers(updatedCareers);
    // Optionally: Update backend
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={20} /> },
    { id: 'achievements', label: 'Achievements', icon: <Trophy size={20} /> }
  ];

  const getTabContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'grid', gap: '2rem' }}
          >
            {/* Selected Careers Section */}
            {loadingCareers ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
                Loading careers...
              </div>
            ) : selectedCareers.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  backgroundColor: '#1F2937',
                  padding: '2rem',
                  borderRadius: '1rem',
                  border: '1px solid #374151',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#F9FAFB', fontSize: '1.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Briefcase size={28} color="#3B82F6" />
                      Your Career Goals
                    </h3>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#9CA3AF', fontSize: '0.875rem' }}>
                      Track your progress towards your dream careers
                    </p>
                  </div>
                </div>

                {/* Grouped by Required Skill */}
                {(() => {
                  const skillsMap = {};
                  selectedCareers.forEach((career) => {
                    (career.required_skills || []).forEach((skill) => {
                      if (!skillsMap[skill]) skillsMap[skill] = [];
                      skillsMap[skill].push(career);
                    });
                  });

                  return (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                      {Object.entries(skillsMap).map(([skill, careers]) => (
                        <div
                          key={skill}
                          style={{
                            backgroundColor: '#111827',
                            borderRadius: '1rem',
                            border: '1px solid #374151',
                            padding: '1.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ color: '#3B82F6', fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>{skill}</h3>
                            <button
                              onClick={() => markSkillComplete(skill)}
                              style={{
                                background: '#22C55E20',
                                border: '1px solid #22C55E60',
                                color: '#22C55E',
                                borderRadius: '8px',
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#22C55E40')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = '#22C55E20')}
                            >
                              ✅ Mark Complete
                            </button>
                          </div>

                          {careers.map((career, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              whileHover={{ scale: 1.02 }}
                              style={{
                                backgroundColor: '#1F2937',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                border: '1px solid #374151',
                                marginBottom: i < careers.length - 1 ? '1rem' : 0
                              }}
                            >
                              <h4 style={{ color: '#F9FAFB', marginBottom: '0.5rem', margin: 0 }}>{career.title}</h4>
                              <p style={{ color: '#9CA3AF', marginBottom: '0.5rem', margin: '0.25rem 0' }}>{career.description}</p>
                              <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: '0.5rem 0' }}>
                                Match: <strong style={{ color: '#10B981' }}>{Math.round(career.relevance_score * 100)}%</strong> • Sector: {career.sector}
                              </p>
                              
                              {career.required_skills && career.required_skills.length > 0 && (
                                <div style={{ marginTop: '0.75rem' }}>
                                  <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginBottom: '0.5rem', margin: 0 }}>Required Skills:</p>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {career.required_skills.map((skillItem, index) => (
                                      <span
                                        key={index}
                                        style={{
                                          backgroundColor: '#2563EB20',
                                          border: '1px solid #2563EB40',
                                          color: '#60A5FA',
                                          borderRadius: '8px',
                                          padding: '0.25rem 0.5rem',
                                          fontSize: '0.75rem',
                                          fontWeight: '500'
                                        }}
                                      >
                                        {skillItem}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  backgroundColor: '#1F2937',
                  padding: '4rem 2rem',
                  borderRadius: '1rem',
                  border: '2px dashed #374151',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  display: 'inline-flex',
                  padding: '1.5rem',
                  borderRadius: '50%',
                  backgroundColor: '#111827',
                  marginBottom: '1.5rem'
                }}>
                  <Briefcase size={48} style={{ color: '#6B7280' }} />
                </div>
                <h3 style={{ margin: 0, color: '#F9FAFB', fontSize: '1.5rem', fontWeight: '600' }}>
                  No Career Goals Selected
                </h3>
                <p style={{ margin: '1rem auto 0', color: '#9CA3AF', fontSize: '0.95rem', maxWidth: '500px' }}>
                  Start exploring career paths and add them to your dashboard to track your progress and develop the skills you need.
                </p>
              </motion.div>
            )}
          </motion.div>
        );
      
      case 'achievements':
        return (
          <div style={{ padding: "1.5rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ color: "#F9FAFB", fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
                  🏆 Your Achievements
                </h2>
                <p style={{ color: "#9CA3AF", fontSize: "0.95rem", marginTop: "0.5rem", margin: '0.5rem 0 0 0' }}>
                  These are your earned milestones and completed skills.
                </p>
              </div>
            </div>

            {/* Achievements Grid / Empty State */}
            {loadingAchievements ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
                Loading achievements...
              </div>
            ) : achievements && achievements.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "1.5rem",
                  marginTop: "1rem"
                }}
              >
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    whileHover={{ scale: 1.03 }}
                    style={{
                      background: "linear-gradient(145deg, #1E293B, #111827)",
                      border: "1px solid #374151",
                      borderRadius: "12px",
                      padding: "16px",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: "120px"
                    }}
                  >
                    <div style={{ marginBottom: "12px" }}>
                      <h4 style={{ color: "#F9FAFB", fontSize: "1.05rem", margin: "0 0 6px 0" }}>
                        {achievement.title}
                      </h4>
                      <p style={{ color: "#9CA3AF", fontSize: "0.9rem", margin: 0, lineHeight: 1.3 }}>
                        {achievement.description || "No description provided."}
                      </p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid #374151", paddingTop: "10px" }}>
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color:
                            achievement.type === "skill"
                              ? "#10B981"
                              : achievement.type === "academic"
                              ? "#3B82F6"
                              : achievement.type === "certification"
                              ? "#F59E0B"
                              : "#8B5CF6",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em"
                        }}
                      >
                        {achievement.type || "achievement"}
                      </span>

                      <span style={{ fontSize: "0.82rem", color: "#9CA3AF" }}>
                        {achievement.date ? new Date(achievement.date).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  backgroundColor: "#1F2937",
                  border: "2px dashed #374151",
                  borderRadius: "12px",
                  padding: "36px",
                  textAlign: "center",
                  marginTop: "1rem"
                }}
              >
                <p style={{ color: "#9CA3AF", fontSize: "1rem", margin: 0 }}>
                  No achievements yet — complete a skill to earn your first badge 🥇
                </p>
              </motion.div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #111827 0%, #0F172A 100%)', color: 'white', padding: '110px 1.5rem 2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          style={{ marginBottom: '2rem' }}
        >
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: '700' }}>
            Welcome back, {user.firstName}!
          </h1>
          <p style={{ margin: 0, color: '#9CA3AF', fontSize: '1rem' }}>
            Track your progress and achieve your career goals
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            marginBottom: '2rem', 
            borderBottom: '1px solid #374151', 
            paddingBottom: '1rem'
          }}
        >
          {tabs.map((tab) => (
            <motion.button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ 
                backgroundColor: activeTab === tab.id ? '#3B82F6' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#9CA3AF', 
                border: activeTab === tab.id ? 'none' : '1px solid #374151', 
                padding: '0.875rem 1.5rem', 
                borderRadius: '0.75rem', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                transition: 'all 0.3s ease', 
                fontWeight: activeTab === tab.id ? '600' : '500',
                fontSize: '0.9rem'
              }}
            >
              {tab.icon} {tab.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab} 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {getTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;
    
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }
    
    setFilteredUsers(filtered);
  }, [searchTerm, filterRole, users]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/users`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setFilteredUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showMessage('error', 'Failed to fetch users');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/auth/user/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', 'User deleted successfully');
        fetchUsers();
        setDeleteConfirm(null);
      } else {
        showMessage('error', data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('error', 'Failed to delete user');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await fetch(`${API_URL}/auth/user/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', `User role updated to ${newRole}`);
        fetchUsers();
      } else {
        showMessage('error', data.message || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showMessage('error', 'Failed to update user role');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    verifiedUsers: users.filter(u => u.isVerified).length
  };

  const StatCard = ({ icon, title, value, subtitle, color = '#EF4444', trend }) => (
    <motion.div 
      whileHover={{ scale: 1.03, y: -5 }} 
      transition={{ type: "spring", stiffness: 300 }}
      style={{ 
        backgroundColor: '#1F2937', 
        padding: '1.5rem', 
        borderRadius: '1rem', 
        border: '1px solid #374151',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        right: 0, 
        width: '100px', 
        height: '100px', 
        background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
        transform: 'translate(30%, -30%)'
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ 
          padding: '0.75rem', 
          borderRadius: '12px', 
          backgroundColor: `${color}20`,
          border: `1px solid ${color}40`
        }}>
          {React.cloneElement(icon, { size: 28, style: { color } })}
        </div>
        {trend && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem',
            color: trend > 0 ? '#10B981' : '#EF4444',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            <TrendingUp size={16} style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#F9FAFB', fontSize: '2rem', fontWeight: '700' }}>
          {value}
        </h3>
        <p style={{ margin: '0 0 0.25rem 0', color: '#9CA3AF', fontSize: '0.875rem', fontWeight: '500' }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.75rem' }}>
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );

  const tabs = [
    { id: 'users', label: 'User Management', icon: <Users size={20} /> },
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={20} /> }
  ];

  const getTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <StatCard 
              icon={<Users />} 
              title="Total Users" 
              value={stats.totalUsers} 
              subtitle="Registered accounts"
              trend={8}
            />
            <StatCard 
              icon={<CheckCircle />} 
              title="Active Users" 
              value={stats.activeUsers} 
              subtitle="Currently active"
              color="#10B981" 
              trend={12}
            />
            <StatCard 
              icon={<Shield />} 
              title="Administrators" 
              value={stats.adminUsers}
              subtitle="Admin accounts" 
              color="#F59E0B" 
            />
            <StatCard 
              icon={<CheckCircle />} 
              title="Verified Users" 
              value={stats.verifiedUsers}
              subtitle="Email verified" 
              color="#3B82F6"
              trend={5}
            />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              backgroundColor: '#1F2937', 
              padding: '2rem', 
              borderRadius: '1rem', 
              border: '1px solid #374151',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#F9FAFB', fontSize: '1.25rem', fontWeight: '600' }}>
                Recent Registrations
              </h3>
              <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                Last 5 users
              </span>
            </div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {users.slice(0, 5).map((u, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '1rem', 
                    backgroundColor: '#111827', 
                    borderRadius: '0.75rem',
                    border: '1px solid #374151'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '0.875rem'
                    }}>
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div>
                      <p style={{ margin: 0, color: '#F9FAFB', fontWeight: '500' }}>{u.firstName} {u.lastName}</p>
                      <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.875rem' }}>{u.email}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: u.role === 'admin' ? '#7C3AED20' : '#3B82F620',
                      color: u.role === 'admin' ? '#7C3AED' : '#3B82F6',
                      display: 'inline-block',
                      marginBottom: '0.25rem'
                    }}>
                      {u.role}
                    </span>
                    <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.75rem' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: '#1F2937',
          padding: '1.5rem',
          borderRadius: '1rem',
          border: '1px solid #374151',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
            <Search size={20} style={{ 
              position: 'absolute', 
              left: '1rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#9CA3AF' 
            }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.875rem 1rem 0.875rem 3rem', 
                backgroundColor: '#111827', 
                border: '1px solid #374151',
                borderRadius: '0.75rem', 
                color: 'white', 
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <Filter size={18} style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF',
              pointerEvents: 'none',
              zIndex: 1
            }} />
            <ChevronRight size={18} style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%) rotate(90deg)',
              color: '#9CA3AF',
              pointerEvents: 'none',
              zIndex: 1
            }} />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ 
                padding: '0.875rem 2.5rem 0.875rem 2.5rem', 
                backgroundColor: '#111827', 
                border: '1px solid #374151',
                borderRadius: '0.75rem', 
                color: 'white', 
                cursor: 'pointer', 
                outline: 'none',
                fontSize: '0.9rem',
                fontWeight: '500',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            >
              <option value="all" style={{ backgroundColor: '#111827', color: 'white', padding: '0.5rem' }}>All Roles</option>
              <option value="user" style={{ backgroundColor: '#111827', color: 'white', padding: '0.5rem' }}>Users</option>
              <option value="admin" style={{ backgroundColor: '#111827', color: 'white', padding: '0.5rem' }}>Admins</option>
            </select>
          </div>

          <div style={{ 
            marginLeft: 'auto',
            color: '#9CA3AF',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#1F2937', 
          borderRadius: '1rem', 
          border: '1px solid #374151', 
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#111827', borderBottom: '2px solid #374151' }}>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'left', color: '#9CA3AF', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    User
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'left', color: '#9CA3AF', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Email
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'left', color: '#9CA3AF', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Role
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'left', color: '#9CA3AF', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'left', color: '#9CA3AF', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Joined
                  </th>
                  <th style={{ padding: '1.25rem 1rem', textAlign: 'center', color: '#9CA3AF', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, index) => (
                  <motion.tr 
                    key={u.id} 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: index * 0.05 }}
                    style={{ 
                      borderBottom: '1px solid #374151',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#111827'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '12px', 
                          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: 'white', 
                          fontWeight: '700',
                          fontSize: '1rem',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                        }}>
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span style={{ color: '#F9FAFB', fontWeight: '500', fontSize: '0.9rem' }}>
                          {u.firstName} {u.lastName}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', color: '#9CA3AF', fontSize: '0.9rem' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.email === 'admn.skillora@gmail.com'}
                        style={{ 
                          padding: '0.5rem 0.75rem', 
                          background: u.role === 'admin' ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '0.5rem', 
                          cursor: u.email === 'admn.skillora@gmail.com' ? 'not-allowed' : 'pointer', 
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          boxShadow: u.role === 'admin' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 4px 12px rgba(59, 130, 246, 0.3)',
                          opacity: u.email === 'admn.skillora@gmail.com' ? 0.6 : 1,
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none'
                        }}
                      >
                        <option value="user" style={{ backgroundColor: '#1F2937', color: 'white', padding: '0.5rem' }}>User</option>
                        <option value="admin" style={{ backgroundColor: '#1F2937', color: 'white', padding: '0.5rem' }}>Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span style={{ 
                        padding: '0.5rem 1rem', 
                        borderRadius: '0.5rem', 
                        fontSize: '0.875rem',
                        backgroundColor: u.isVerified ? '#10B98120' : '#F59E0B20',
                        color: u.isVerified ? '#10B981' : '#F59E0B', 
                        fontWeight: '600',
                        border: `1px solid ${u.isVerified ? '#10B98140' : '#F59E0B40'}`
                      }}>
                        {u.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', color: '#9CA3AF', fontSize: '0.9rem' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                      {u.email !== 'admn.skillora@gmail.com' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setDeleteConfirm(u)}
                          style={{ 
                            padding: '0.5rem 1rem', 
                            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                            color: 'white',
                            border: 'none', 
                            borderRadius: '0.5rem', 
                            cursor: 'pointer', 
                            display: 'inline-flex',
                            alignItems: 'center', 
                            gap: '0.5rem',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          <Trash2 size={16} /> Delete
                        </motion.button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #111827 0%, #0F172A 100%)', color: 'white', padding: '110px 1.5rem 2rem' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <AnimatePresence>
          {message.text && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              style={{ 
                position: 'fixed', 
                top: '90px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                zIndex: 1000,
                background: message.type === 'success' 
                  ? 'linear-gradient(135deg, #10B981, #059669)' 
                  : 'linear-gradient(135deg, #EF4444, #DC2626)', 
                color: 'white',
                padding: '1rem 2rem', 
                borderRadius: '0.75rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                boxShadow: message.type === 'success' 
                  ? '0 8px 24px rgba(16, 185, 129, 0.4)' 
                  : '0 8px 24px rgba(239, 68, 68, 0.4)',
                border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`,
                fontWeight: '500'
              }}
            >
              {message.type === 'success' ? <CheckCircle size={24} /> : <XCircle size={24} />}
              <span style={{ fontSize: '0.95rem' }}>{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          style={{ marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  padding: '0.75rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)'
                }}
              >
                <Shield size={36} style={{ color: 'white' }} />
              </motion.div>
              <div>
                <h1 style={{ 
                  margin: '0 0 0.25rem 0', 
                  fontSize: '2rem', 
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #F9FAFB, #EF4444)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Admin Dashboard
                </h1>
                <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.875rem' }}>
                  Manage users and monitor system activity
                </p>
              </div>
            </div>
            <div style={{
              padding: '0.75rem 1.25rem',
              background: 'linear-gradient(135deg, #EF444420, #DC262620)',
              border: '1px solid #EF444440',
              borderRadius: '0.75rem',
              color: '#EF4444',
              fontWeight: '600',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Shield size={18} />
              Administrator Access
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            marginBottom: '2rem', 
            borderBottom: '1px solid #374151', 
            paddingBottom: '1rem', 
            flexWrap: 'wrap',
            overflowX: 'auto',
            scrollbarWidth: 'thin'
          }}
        >
          {tabs.map((tab) => (
            <motion.button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ 
                backgroundColor: activeTab === tab.id ? '#EF4444' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#9CA3AF', 
                border: activeTab === tab.id ? 'none' : '1px solid #374151', 
                padding: '0.875rem 1.5rem', 
                borderRadius: '0.75rem', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                transition: 'all 0.3s ease', 
                fontWeight: activeTab === tab.id ? '600' : '500',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
              }}
            >
              {tab.icon} {tab.label}
            </motion.button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab} 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {getTabContent()}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {deleteConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ 
                position: 'fixed', 
                inset: 0, 
                backgroundColor: 'rgba(0,0,0,0.75)', 
                display: 'flex',
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 2000, 
                padding: '1rem',
                backdropFilter: 'blur(4px)'
              }}
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  backgroundColor: '#1F2937', 
                  padding: '2rem', 
                  borderRadius: '1.25rem', 
                  maxWidth: '500px',
                  width: '100%', 
                  border: '1px solid #374151',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  marginBottom: '1.5rem' 
                }}>
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}>
                    <AlertCircle size={32} style={{ color: 'white' }} />
                  </div>
                  <h2 style={{ margin: 0, color: '#F9FAFB', fontSize: '1.5rem', fontWeight: '600' }}>
                    Confirm Deletion
                  </h2>
                </div>
                
                <div style={{
                  padding: '1.25rem',
                  backgroundColor: '#111827',
                  borderRadius: '0.75rem',
                  marginBottom: '1.5rem',
                  border: '1px solid #374151'
                }}>
                  <p style={{ margin: '0 0 0.75rem 0', color: '#9CA3AF', fontSize: '0.95rem' }}>
                    Are you sure you want to permanently delete this user account?
                  </p>
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#1F2937',
                    borderRadius: '0.5rem',
                    borderLeft: '3px solid #EF4444'
                  }}>
                    <p style={{ margin: '0 0 0.25rem 0', color: '#F9FAFB', fontWeight: '600' }}>
                      {deleteConfirm.firstName} {deleteConfirm.lastName}
                    </p>
                    <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.875rem' }}>
                      {deleteConfirm.email}
                    </p>
                  </div>
                  <p style={{ margin: '0.75rem 0 0 0', color: '#EF4444', fontSize: '0.875rem', fontWeight: '500' }}>
                    This action cannot be undone
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDeleteConfirm(null)}
                    style={{ 
                      padding: '0.75rem 1.5rem', 
                      backgroundColor: '#374151', 
                      color: 'white',
                      border: '1px solid #4B5563', 
                      borderRadius: '0.75rem', 
                      cursor: 'pointer', 
                      fontWeight: '600',
                      fontSize: '0.9rem'
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDeleteUser(deleteConfirm.id)}
                    style={{ 
                      padding: '0.75rem 1.5rem', 
                      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                      color: 'white',
                      border: 'none', 
                      borderRadius: '0.75rem', 
                      cursor: 'pointer', 
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Trash2 size={18} /> Delete User
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}