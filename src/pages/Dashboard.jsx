import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import { 
  BookOpen, Target, Trophy, Calendar, TrendingUp, User, Award, Clock, CheckCircle, AlertCircle,
  BarChart3, PlusCircle, Edit3, Star
} from "lucide-react";

export function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    try {
      const userData = localStorage.getItem('skillora_user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const isAdmin = parsedUser.role === 'admin' || parsedUser.isAdmin === true || parsedUser.email === 'admin@skillora.org';
        if (isAdmin) return;
      }
    } catch (error) { console.error('Error parsing user data:', error); }
    finally { setLoading(false); }
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111827', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '3px solid #374151', borderTop: '3px solid #3B82F6', borderRadius: '50%', 
            animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role === 'admin' || user.isAdmin || user.email === 'admin@skillora.org') {
    return <Navigate to="/welcome" replace />;
  }

  const dashboardData = {
    currentSemester: "Semester 6", overallCGPA: "8.2", creditsCompleted: 120, totalCredits: 180,
    upcomingGoals: [
      { title: "Complete Java Project", deadline: "2025-01-15", priority: "high" },
      { title: "Internship Application", deadline: "2025-01-20", priority: "medium" },
      { title: "Database Assignment", deadline: "2025-01-10", priority: "high" }
    ],
    recentAchievements: [
      { title: "Data Structures Course Completed", date: "2024-12-20", type: "academic" },
      { title: "Coding Competition - 2nd Place", date: "2024-12-15", type: "achievement" },
      { title: "React Certification", date: "2024-12-10", type: "certification" }
    ],
    placementStats: { applicationsSubmitted: 5, interviewsScheduled: 2, offersReceived: 0, companiesOfInterest: 12 }
  };

  const StatCard = ({ icon, title, value, color = '#3B82F6' }) => (
    <motion.div whileHover={{ scale: 1.02 }} style={{ backgroundColor: '#1F2937', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #374151' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {React.cloneElement(icon, { size: 32, style: { color } })}
        <div>
          <h3 style={{ margin: 0, color: '#F9FAFB' }}>{title}</h3>
          <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.9rem' }}>{value}</p>
        </div>
      </div>
    </motion.div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={20} /> },
    { id: 'goals', label: 'Goals', icon: <Target size={20} /> },
    { id: 'achievements', label: 'Achievements', icon: <Trophy size={20} /> },
    { id: 'placement', label: 'Placements', icon: <CheckCircle size={20} /> }
  ];

  const getTabContent = () => {
    switch(activeTab) {
      case 'overview':
        const progressPercent = Math.round((dashboardData.creditsCompleted / dashboardData.totalCredits) * 100);
        return (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <StatCard icon={<BookOpen />} title="Current Semester" value={dashboardData.currentSemester} />
              <StatCard icon={<Trophy />} title="Overall CGPA" value={`${dashboardData.overallCGPA}/10.0`} color="#F59E0B" />
              <StatCard icon={<TrendingUp />} title="Credits Progress" value={`${dashboardData.creditsCompleted}/${dashboardData.totalCredits}`} color="#10B981" />
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ backgroundColor: '#1F2937', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #374151' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#F9FAFB' }}>Academic Progress</h3>
              <div style={{ backgroundColor: '#374151', borderRadius: '1rem', height: '12px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#3B82F6', height: '100%', width: `${progressPercent}%`, borderRadius: '1rem', transition: 'width 0.8s ease-in-out' }}></div>
              </div>
              <p style={{ margin: '0.5rem 0 0 0', color: '#9CA3AF', fontSize: '0.9rem' }}>{progressPercent}% Complete</p>
            </motion.div>
          </div>
        );

      case 'goals':
        return (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#F9FAFB' }}>Upcoming Goals</h3>
              <button style={{ backgroundColor: '#3B82F6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', 
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={18} /> Add Goal
              </button>
            </div>
            {dashboardData.upcomingGoals.map((goal, index) => (
              <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
                style={{ backgroundColor: '#1F2937', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #374151', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', 
                    backgroundColor: goal.priority === 'high' ? '#EF4444' : goal.priority === 'medium' ? '#F59E0B' : '#10B981' }}></div>
                  <div>
                    <h4 style={{ margin: 0, color: '#F9FAFB' }}>{goal.title}</h4>
                    <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.8rem' }}>Due: {new Date(goal.deadline).toLocaleDateString()}</p>
                  </div>
                </div>
                <Edit3 size={18} style={{ color: '#9CA3AF', cursor: 'pointer' }} />
              </motion.div>
            ))}
          </div>
        );

      case 'achievements':
        const achievementIcons = { academic: <BookOpen size={20} />, achievement: <Trophy size={20} />, certification: <Award size={20} /> };
        const achievementColors = { academic: '#3B82F6', achievement: '#F59E0B', certification: '#10B981' };
        return (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#F9FAFB' }}>Recent Achievements</h3>
            {dashboardData.recentAchievements.map((achievement, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                style={{ backgroundColor: '#1F2937', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #374151', 
                  display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: achievementColors[achievement.type] }}>
                  {achievementIcons[achievement.type]}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, color: '#F9FAFB' }}>{achievement.title}</h4>
                  <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.8rem' }}>{new Date(achievement.date).toLocaleDateString()}</p>
                </div>
                <Star size={20} style={{ color: '#F59E0B' }} />
              </motion.div>
            ))}
          </div>
        );

      case 'placement':
        const placementStats = [
          { value: dashboardData.placementStats.applicationsSubmitted, label: 'Applications Submitted', color: '#3B82F6' },
          { value: dashboardData.placementStats.interviewsScheduled, label: 'Interviews Scheduled', color: '#F59E0B' },
          { value: dashboardData.placementStats.offersReceived, label: 'Offers Received', color: '#10B981' },
          { value: dashboardData.placementStats.companiesOfInterest, label: 'Companies of Interest', color: '#8B5CF6' }
        ];
        return (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#F9FAFB' }}>Placement Tracker</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {placementStats.map((stat, index) => (
                <div key={index} style={{ backgroundColor: '#1F2937', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #374151', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: stat.color }}>{stat.value}</h4>
                  <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.9rem' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white', padding: '110px 1.5rem 2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <User size={32} style={{ color: '#3B82F6' }} />
            <h1 style={{ margin: 0, fontSize: '2rem' }}>Hello, {user?.firstName || 'Student'}!</h1>
          </div>
          <p style={{ margin: 0, color: '#9CA3AF' }}>Track your academic progress and career milestones</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #374151', paddingBottom: '1rem' }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ backgroundColor: activeTab === tab.id ? '#3B82F6' : 'transparent', color: activeTab === tab.id ? 'white' : '#9CA3AF',
                border: 'none', padding: '0.75rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', 
                display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.3s ease' }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </motion.div>

        <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          {getTabContent()}
        </motion.div>
      </div>

      <style>
        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}