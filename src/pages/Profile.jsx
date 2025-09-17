import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Edit3, Save, X, Mail, Phone, MapPin, Globe, Github, Linkedin, BookOpen, Briefcase, Award, ArrowLeft, Shield, Calendar, Activity } from 'lucide-react';

export function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [profileData, setProfileData] = useState({
    firstName: '', lastName: '', email: '', phone: '', location: '', bio: '',
    skills: '', experience: '', education: '', linkedIn: '', github: '', website: ''
  });

  useEffect(() => { loadProfileData(); }, []);

  const loadProfileData = async () => {
    try {
      setFetchLoading(true);
      const storedUser = localStorage.getItem('skillora_user');
      if (!storedUser) { navigate('/login'); return; }

      const user = JSON.parse(storedUser);
      setUserData(user);

      const response = await fetch(`http://localhost:5000/api/student/${user.id}`, {
        method: 'GET', headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      if (data.success) {
        const student = data.student;
        setStudentData(student);
        setProfileData({
          firstName: student.firstName || '', lastName: student.lastName || '', email: student.email || '',
          phone: student.phone || '', location: student.location || '', bio: student.bio || '',
          skills: student.skills || '', experience: student.experience || '', education: student.education || '',
          linkedIn: student.linkedIn || '', github: student.github || '', website: student.website || ''
        });
      } else throw new Error(data.message || 'Failed to load profile');
      
    } catch (error) {
      console.error('Error loading profile data:', error);
      setMessage(`Error loading profile: ${error.message}`);
      
      const storedUser = localStorage.getItem('skillora_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setProfileData(prev => ({ ...prev, firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '' }));
      }
    } finally { setFetchLoading(false); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (message) setMessage('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault(); e.stopPropagation();
    console.log('handleSaveProfile called');
    
    if (!isEditing) { console.log('Not in editing mode, ignoring save attempt'); return; }
    
    setLoading(true); setMessage('');

    try {
      if (!userData?.id) throw new Error('User ID not found. Please log in again.');

      const response = await fetch(`http://localhost:5000/api/student/${userData.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `HTTP error! status: ${response.status}`);

      if (data.success) {
        setStudentData(data.student); setIsEditing(false); setMessage('Profile updated successfully!');
        
        const updatedUser = { ...userData, firstName: profileData.firstName, lastName: profileData.lastName, email: profileData.email };
        localStorage.setItem('skillora_user', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        
        window.dispatchEvent(new CustomEvent('authStateChanged', {
          detail: { isAuthenticated: true, user: updatedUser }
        }));
      } else throw new Error(data.message || 'Failed to update profile');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage(error.message || 'Failed to update profile. Please try again.');
    } finally { setLoading(false); }
  };

  const handleCancel = () => {
    console.log('Cancel button clicked');
    if (studentData) {
      setProfileData({
        firstName: studentData.firstName || '', lastName: studentData.lastName || '', email: studentData.email || '',
        phone: studentData.phone || '', location: studentData.location || '', bio: studentData.bio || '',
        skills: studentData.skills || '', experience: studentData.experience || '', education: studentData.education || '',
        linkedIn: studentData.linkedIn || '', github: studentData.github || '', website: studentData.website || ''
      });
    }
    setIsEditing(false); setMessage(''); setLoading(false);
  };

  const styles = {
    container: { minHeight: '100vh', backgroundColor: '#0F172A', color: '#F1F5F9', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", paddingTop: '100px' },
    main: { maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem 3rem' },
    profileHeader: { background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', border: '1px solid #475569', borderRadius: '1rem', padding: '2rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden' },
    profileHeaderOverlay: { position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)', borderRadius: '50%', transform: 'translate(50%, -50%)' },
    profileContent: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '2rem' },
    avatar: { width: '120px', height: '120px', borderRadius: '1rem', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: '700', color: '#1F2937', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)', border: '3px solid rgba(245, 158, 11, 0.2)' },
    profileInfo: { flex: 1 },
    profileName: { fontSize: '2rem', fontWeight: '700', color: '#F1F5F9', margin: '0 0 0.5rem', letterSpacing: '-0.02em' },
    profileEmail: { color: '#94A3B8', fontSize: '1.1rem', margin: '0 0 1rem' },
    adminBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', border: '1px solid rgba(245, 158, 11, 0.3)' },
    actionBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem 0' },
    buttonGroup: { display: 'flex', gap: '0.75rem' },
    button: { border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s ease' },
    primaryButton: { background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#1F2937', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' },
    secondaryButton: { background: '#475569', color: '#F1F5F9' },
    backButton: { background: 'transparent', border: '1px solid #475569', color: '#CBD5E1' },
    card: { background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', border: '1px solid #475569', borderRadius: '1rem', padding: '2rem', marginBottom: '2rem' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #475569' },
    cardTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#F1F5F9', margin: 0 },
    cardIcon: { color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.2)' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' },
    formGroup: { marginBottom: '1.5rem' },
    label: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: '#CBD5E1' },
    input: { width: '100%', padding: '0.875rem 1rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: '#1E293B', color: '#F1F5F9', fontSize: '0.95rem', transition: 'all 0.2s ease', outline: 'none', boxSizing: 'border-box' },
    inputDisabled: { backgroundColor: '#334155', color: '#94A3B8', cursor: 'default', pointerEvents: 'none' },
    textarea: { width: '100%', padding: '0.875rem 1rem', borderRadius: '0.5rem', border: '1px solid #475569', backgroundColor: '#1E293B', color: '#F1F5F9', fontSize: '0.95rem', transition: 'all 0.2s ease', outline: 'none', resize: 'vertical', minHeight: '100px', boxSizing: 'border-box' },
    helpText: { fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' },
    accountInfo: { background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', border: '1px solid #475569', borderRadius: '1rem', padding: '2rem', borderTop: '3px solid #F59E0B' },
    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmin(250px, 1fr))', gap: '1rem' },
    infoItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#0F172A', borderRadius: '0.5rem', border: '1px solid #334155' },
    infoLabel: { color: '#94A3B8', fontSize: '0.85rem', fontWeight: '500' },
    infoValue: { color: '#F1F5F9', fontSize: '0.9rem', fontWeight: '600' },
    profileId: { marginTop: '1.5rem', padding: '1rem', backgroundColor: '#0F172A', borderRadius: '0.5rem', border: '1px solid #334155' },
    message: { padding: '1rem 1.25rem', borderRadius: '0.5rem', marginBottom: '2rem', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    messageSuccess: { background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', border: '1px solid rgba(34, 197, 94, 0.3)' },
    messageError: { background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' },
    loadingSpinner: { width: '20px', height: '20px', border: '2px solid #475569', borderTop: '2px solid #F59E0B', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    centerLoading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1.5rem', paddingTop: '80px' }
  };

  if (fetchLoading) {
    return (
      <div style={styles.container}>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .input-focus:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1); }
          .button-hover:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); }
          .secondary-hover:hover { background-color: #64748B; }
          .back-hover:hover { background-color: #334155; border-color: #64748B; }
        `}</style>
        <div style={styles.centerLoading}>
          <div style={styles.loadingSpinner}></div>
          <div style={{ fontSize: '1.1rem', color: '#94A3B8' }}>Loading your profile...</div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div style={styles.container}>
        <div style={styles.centerLoading}>
          <div style={{ fontSize: '1.2rem', color: '#94A3B8', textAlign: 'center' }}>Please log in to view your profile</div>
          <button onClick={() => navigate('/login')} style={{ ...styles.button, ...styles.primaryButton }} className="button-hover">Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .input-focus:focus { border-color: #F59E0B !important; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1) !important; }
        .button-hover:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); }
        .secondary-hover:hover { background-color: #64748B !important; }
        .back-hover:hover { background-color: #334155 !important; border-color: #64748B !important; }
      `}</style>

      <main style={styles.main}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={styles.profileHeader}>
          <div style={styles.profileHeaderOverlay}></div>
          <div style={styles.profileContent}>
            <div style={styles.avatar}>{profileData.firstName?.charAt(0)}{profileData.lastName?.charAt(0)}</div>
            <div style={styles.profileInfo}>
              <h2 style={styles.profileName}>{profileData.firstName} {profileData.lastName}</h2>
              <p style={styles.profileEmail}>{profileData.email}</p>
              {userData.isAdmin && (
                <div style={styles.adminBadge}>
                  <Shield size={16} />Administrator
                </div>
              )}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={() => navigate('/dashboard')} style={{ ...styles.button, ...styles.backButton }} className="back-hover">
                <ArrowLeft size={18} />Dashboard
              </button>
            </div>
          </div>
        </motion.div>

        <div style={styles.actionBar}>
          <div style={styles.buttonGroup}>
            {!isEditing ? (
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('Edit button clicked, setting isEditing to true'); setIsEditing(true); setMessage(''); }} style={{ ...styles.button, ...styles.primaryButton }} className="button-hover">
                <Edit3 size={16} />Edit Profile
              </button>
            ) : (
              <>
                <button type="submit" form="profile-form" disabled={loading} onClick={() => console.log('Save button clicked')} style={{ ...styles.button, ...styles.primaryButton, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }} className={!loading ? "button-hover" : ""}>
                  {loading ? <div style={styles.loadingSpinner}></div> : <Save size={16} />}
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={handleCancel} disabled={loading} style={{ ...styles.button, ...styles.secondaryButton, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }} className={!loading ? "secondary-hover" : ""}>
                  <X size={16} />Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ ...styles.message, ...(message.includes('successfully') ? styles.messageSuccess : styles.messageError) }}>
            {message.includes('successfully') ? <Activity size={16} /> : <X size={16} />}
            {message}
          </motion.div>
        )}

        <form id="profile-form" onSubmit={handleSaveProfile}>
          {/* Basic Information */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon}><User size={20} /></div>
              <h3 style={styles.cardTitle}>Basic Information</h3>
            </div>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={profileData.firstName || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                  style={{ ...styles.input, ...(isEditing ? {} : styles.inputDisabled) }}
                  className="input-focus"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={profileData.lastName || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                  style={{ ...styles.input, ...(isEditing ? {} : styles.inputDisabled) }}
                  className="input-focus"
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}><Mail size={16} />Email Address *</label>
              <input
                type="email"
                name="email"
                value={profileData.email || ''}
                onChange={handleInputChange}
                disabled={true}
                required
                style={{ ...styles.input, ...styles.inputDisabled }}
              />
              <div style={styles.helpText}>Email cannot be changed</div>
            </div>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}><Phone size={16} />Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your phone number"
                  style={{ ...styles.input, ...(isEditing ? {} : styles.inputDisabled) }}
                  className="input-focus"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}><MapPin size={16} />Location</label>
                <input
                  type="text"
                  name="location"
                  value={profileData.location || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="City, Country"
                  style={{ ...styles.input, ...(isEditing ? {} : styles.inputDisabled) }}
                  className="input-focus"
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon}><Briefcase size={20} /></div>
              <h3 style={styles.cardTitle}>Professional Information</h3>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Bio</label>
              <textarea
                name="bio"
                value={profileData.bio || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Tell us about yourself..."
                style={{ ...styles.textarea, ...(isEditing ? {} : styles.inputDisabled) }}
                className="input-focus"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}><Award size={16} />Skills</label>
              <input
                type="text"
                name="skills"
                value={profileData.skills || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="e.g., JavaScript, React, Node.js, Python"
                style={{ ...styles.input, ...(isEditing ? {} : styles.inputDisabled) }}
                className="input-focus"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Experience</label>
              <textarea
                name="experience"
                value={profileData.experience || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Describe your work experience..."
                style={{ ...styles.textarea, ...(isEditing ? {} : styles.inputDisabled) }}
                className="input-focus"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}><BookOpen size={16} />Education</label>
              <textarea
                name="education"
                value={profileData.education || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Your educational background..."
                style={{ ...styles.textarea, ...(isEditing ? {} : styles.inputDisabled) }}
                className="input-focus"
              />
            </div>
          </div>

          {/* Social Links */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon}><Globe size={20} /></div>
              <h3 style={styles.cardTitle}>Social Links</h3>
            </div>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}><Linkedin size={16} />LinkedIn</label>
                <input
                  type="url"
                  name="linkedIn"
                  value={profileData.linkedIn || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="https://linkedin.com/in/yourprofile"
                  style={{ ...styles.input, ...(isEditing ? {} : styles.inputDisabled) }}
                  className="input-focus"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}><Github size={16} />GitHub</label>
                <input
                  type="url"
                  name="github"
                  value={profileData.github || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="https://github.com/yourusername"
                  style={{ ...styles.input, ...(isEditing ? {} : styles.inputDisabled) }}
                  className="input-focus"
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}><Globe size={16} />Personal Website</label>
              <input
                type="url"
                name="website"
                value={profileData.website || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="https://yourwebsite.com"
                style={{ ...styles.input, ...(isEditing ? {} : styles.inputDisabled) }}
                className="input-focus"
              />
            </div>
          </div>
        </form>

        {/* Account Information */}
        <div style={styles.accountInfo}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}><Activity size={20} /></div>
            <h3 style={styles.cardTitle}>Account Information</h3>
          </div>
          
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <Calendar size={16} style={{ color: '#94A3B8', minWidth: '16px' }} />
              <div>
                <div style={styles.infoLabel}>Member Since</div>
                <div style={styles.infoValue}>
                  {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  }) : 'N/A'}
                </div>
              </div>
            </div>
            
            <div style={styles.infoItem}>
              <Shield size={16} style={{ color: '#94A3B8', minWidth: '16px' }} />
              <div>
                <div style={styles.infoLabel}>Role</div>
                <div style={styles.infoValue}>
                  {userData.role === 'admin' || userData.isAdmin ? 'Administrator' : 'Student'}
                </div>
              </div>
            </div>
            
            <div style={styles.infoItem}>
              <Activity size={16} style={{ color: '#94A3B8', minWidth: '16px' }} />
              <div>
                <div style={styles.infoLabel}>Last Login</div>
                <div style={styles.infoValue}>
                  {userData.lastLogin ? new Date(userData.lastLogin).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  }) : 'N/A'}
                </div>
              </div>
            </div>
            
            <div style={styles.infoItem}>
              <User size={16} style={{ color: '#94A3B8', minWidth: '16px' }} />
              <div>
                <div style={styles.infoLabel}>Status</div>
                <div style={{
                  ...styles.infoValue,
                  color: studentData ? '#22C55E' : '#F59E0B'
                }}>
                  {studentData ? 'Active' : 'Incomplete'}
                </div>
              </div>
            </div>
          </div>
          
          {studentData && (
            <div style={styles.profileId}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem',
                color: '#94A3B8', fontSize: '0.85rem', fontWeight: '500'
              }}>
                <Activity size={14} />Profile ID
              </div>
              <code style={{ 
                color: '#64748B', fontSize: '0.8rem', 
                fontFamily: 'Monaco, Consolas, monospace', wordBreak: 'break-all'
              }}>
                {studentData._id}
              </code>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}