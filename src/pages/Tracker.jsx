import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, FileText, X, LogIn, Download, Eye, Trash2, FileImage, Scan, Copy, CheckCircle,
  Tag, TrendingUp, Briefcase, AlertTriangle, ChevronDown, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Tracker = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingFiles, setFetchingFiles] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  
  // Document Processing States
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [docResult, setDocResult] = useState(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docServiceAvailable, setDocServiceAvailable] = useState(false);
  const [selectedFileForDoc, setSelectedFileForDoc] = useState(null);
  const [textCopied, setTextCopied] = useState(false);
  
  // UI Toggles
  const [showKeywords, setShowKeywords] = useState(false);
  const [showCategorizedSkills, setShowCategorizedSkills] = useState(false);
  const [showJobRecommendations, setShowJobRecommendations] = useState(false);
  const [keywordsCopied, setKeywordsCopied] = useState(false);
  
  // Keyword-specific job states
  const [selectedKeywordForJobs, setSelectedKeywordForJobs] = useState('');
  const [keywordJobRecommendations, setKeywordJobRecommendations] = useState(null);
  const [loadingKeywordJobs, setLoadingKeywordJobs] = useState(false);
  
  // Career selection states
  const [selectedCareers, setSelectedCareers] = useState([]);
  const [tempSelectedCareers, setTempSelectedCareers] = useState([]);
  
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const authCheckIntervalRef = useRef(null);
  const progressIntervalsRef = useRef(new Map());
  
  // Colors
  const primaryColor = '#3B82F6';
  const secondaryColor = '#10B981';
  const accentColor = '#F59E0B';
  const errorColor = '#EF4444';
  const warningColor = '#F59E0B';
  const primaryText = '#E5E7EB';
  const secondaryText = '#94A3B8';
  const tertiaryText = '#64748B';
  const mainBackground = 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)';
  const cardBackground = 'rgba(255, 255, 255, 0.08)';
  const secondaryBackground = 'rgba(255, 255, 255, 0.05)';

  
  // Load saved careers from backend (MongoDB)
useEffect(() => {
  if (!user?.email) return;

  async function fetchCareers() {
    try {
      const res = await fetch(`http://localhost:5000/api/overview/${user.email}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCareers(data.overview?.careers || []);
      } else {
        console.warn("No goals found in backend for this user.");
      }
    } catch (err) {
      console.error("Error fetching saved careers:", err);
    }
  }

  fetchCareers();
}, [user]);



// Save selected careers to backend (Overview + Goals)
// Save selected careers to backend (Overview + Goals)
const saveCareerSelection = useCallback(async () => {
  if (!user?.email || tempSelectedCareers.length === 0) {
    alert("⚠️ No careers selected to save.");
    return;
  }

  try {
    console.log("➡️ Saving careers for:", user.email);
    console.log("➡️ Careers to save:", tempSelectedCareers);

    // 1️⃣ Save to Overview
    const overviewRes = await fetch("http://localhost:5000/api/overview/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        careers: tempSelectedCareers
      })
    });

    if (!overviewRes.ok) {
      throw new Error(`Overview save failed: ${overviewRes.status}`);
    }

    const overviewData = await overviewRes.json();

    // 2️⃣ Save to Goals
    const goalsRes = await fetch("http://localhost:5000/api/goals/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        goals: tempSelectedCareers.map(c => ({
          careerTitle: c.title,
          description: c.description,
          relevance_score: c.relevance_score,
          required_skills: c.required_skills || [],
          sector: c.sector
        }))
      })
    });

    if (!goalsRes.ok) {
      throw new Error(`Goals save failed: ${goalsRes.status}`);
    }

    const goalsData = await goalsRes.json();

    console.log("✅ Overview response:", overviewData);
    console.log("✅ Goals response:", goalsData);

    if (overviewData.success && goalsData.success) {
      setSelectedCareers(overviewData.overview.careers);
      setTempSelectedCareers([]);
      alert(
        `✅ ${tempSelectedCareers.length} career${
          tempSelectedCareers.length > 1 ? "s" : ""
        } added to your goals!`
      );
    } else {
      console.error("Server returned unexpected data:", { overviewData, goalsData });
      alert("❌ Failed to save careers. Check backend logs.");
    }
  } catch (error) {
    console.error("🔥 Error in saveCareerSelection:", error);
    alert(`❌ Error saving to database: ${error.message}`);
  }
}, [user, tempSelectedCareers]);



  // Toggle career selection
  const toggleCareerSelection = useCallback((job) => {
    setTempSelectedCareers(prev => {
      const exists = prev.some(c => c.title === job.title);
      if (exists) {
        return prev.filter(c => c.title !== job.title);
      } else {
        return [...prev, job];
      }
    });
  }, []);

  // Check if career is selected (either temp or saved)
  const isCareerSelected = useCallback((jobTitle) => {
    return tempSelectedCareers.some(c => c.title === jobTitle) || 
           selectedCareers.some(c => c.title === jobTitle);
  }, [tempSelectedCareers, selectedCareers]);

  // Helpers
  const sanitizeEmailForFolder = useCallback((email) => {
    return email.toLowerCase().split('@')[0].replace(/[^a-z0-9]/g, '_');
  }, []);

  const isValidFileType = useCallback((file) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(file.type) && allowedExtensions.includes(fileExtension);
  }, []);

  const isDocumentFile = useCallback((filename) => {
    const docExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
    const fileExt = filename.split('.').pop().toLowerCase();
    return docExtensions.includes(fileExt);
  }, []);

  const getKeywordSpecificJobs = useCallback(async (keyword, contextSkills = []) => {
    if (!keyword || !keyword.trim()) return;
    setLoadingKeywordJobs(true);
    setKeywordJobRecommendations(null);
    try {
      const response = await fetch('http://localhost:5001/keywords/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          context_skills: contextSkills,
          top_k: 10
        })
      });
      const result = await response.json();
      if (result.success) {
        setKeywordJobRecommendations(result);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error fetching keyword-specific jobs:', error);
      alert('Failed to fetch job recommendations for keyword');
    } finally {
      setLoadingKeywordJobs(false);
    }
  }, []);

  const handleKeywordClick = useCallback((keyword, allKeywords) => {
    if (selectedKeywordForJobs === keyword) {
      setSelectedKeywordForJobs('');
      setKeywordJobRecommendations(null);
    } else {
      setSelectedKeywordForJobs(keyword);
      getKeywordSpecificJobs(keyword, allKeywords);
    }
  }, [selectedKeywordForJobs, getKeywordSpecificJobs]);

  // Document Service
  const checkDocServiceStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch('http://localhost:5001/health', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      setDocServiceAvailable(data.available);
      return data.available;
    } catch (error) {
      console.error('Error checking document service:', error);
      setDocServiceAvailable(false);
      return false;
    }
  }, []);

  // File fetching
  const fetchUserFiles = useCallback(async (userData, showLoading = false) => {
    if (!userData || fetchingFiles) return;
    if (showLoading) setFetchingFiles(true);
    try {
      const res = await fetch(`http://localhost:5000/api/files/${encodeURIComponent(userData.email)}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (isMountedRef.current) {
        setUploadedFiles(data.success ? data.files : []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error fetching files:', err);
        setUploadedFiles([]);
      }
    } finally {
      if (isMountedRef.current && showLoading) {
        setFetchingFiles(false);
      }
    }
  }, [fetchingFiles]);

  // Auth
  const checkAuthStatus = useCallback(() => {
    if (!isMountedRef.current) return;
    try {
      const userData = localStorage.getItem('skillora_user');
      const token = localStorage.getItem('skillora_auth_token');
      const isAuth = !!(userData && token);
      setIsAuthenticated(isAuth);
      const parsedUser = isAuth ? JSON.parse(userData) : null;
      setUser(parsedUser);
      if (isAuth && parsedUser) {
        fetchUserFiles(parsedUser, false);
      } else if (!loading) {
        navigate('/login');
      }
      setLoading(false);
    } catch (err) {
      console.error('Auth check error:', err);
      if (isMountedRef.current) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        if (!loading) navigate('/login');
      }
    }
  }, [navigate, fetchUserFiles, loading]);

  // Effects
  useEffect(() => {
    isMountedRef.current = true;
    checkAuthStatus();
    checkDocServiceStatus();
    const handleAuthChange = (e) => {
      if (!isMountedRef.current) return;
      setIsAuthenticated(e.detail.isAuthenticated);
      setUser(e.detail.user);
      if (!e.detail.isAuthenticated) navigate('/login');
    };
    window.addEventListener('authStateChanged', handleAuthChange);
    authCheckIntervalRef.current = setInterval(() => {
      checkAuthStatus();
      checkDocServiceStatus();
    }, 10000);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('authStateChanged', handleAuthChange);
      if (authCheckIntervalRef.current) clearInterval(authCheckIntervalRef.current);
      progressIntervalsRef.current.forEach(interval => clearInterval(interval));
      progressIntervalsRef.current.clear();
    };
  }, [navigate, checkAuthStatus, checkDocServiceStatus]);

  // File handling
  const handleFileChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => isValidFileType(file));
    const invalidFiles = selectedFiles.filter(file => !isValidFileType(file));
    if (invalidFiles.length > 0) {
      alert(`Invalid files: ${invalidFiles.map(f => f.name).join(', ')}\nOnly JPG, PNG, PDF, and DOC files are permitted.`);
    }
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
    e.target.value = '';
  }, [isValidFileType]);

  const handleDocFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && isValidFileType(selectedFile)) {
      setDocFile(selectedFile);
      setDocResult(null);
    } else {
      alert('Please select a valid file (JPG, PNG, PDF, DOC, DOCX) for text extraction.');
    }
    e.target.value = '';
  }, [isValidFileType]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = primaryColor;
    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
  }, [primaryColor]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    e.currentTarget.style.background = cardBackground;
  }, [cardBackground]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    e.currentTarget.style.background = cardBackground;
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => isValidFileType(file));
    const invalidFiles = droppedFiles.filter(file => !isValidFileType(file));
    if (invalidFiles.length > 0) {
      alert(`Invalid files: ${invalidFiles.map(f => f.name).join(', ')}\nOnly JPG, PNG, PDF, and DOC files are permitted.`);
    }
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, [isValidFileType, cardBackground]);

  const removeFile = useCallback((i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[i];
      return newProgress;
    });
  }, []);

  // Document extraction
  const performDocumentExtraction = useCallback(async (file = null, filename = null) => {
    if (!docServiceAvailable) {
      alert('Document processing service is not available. Please ensure the Python service is running on port 5001.');
      return;
    }
    setDocLoading(true);
    setDocResult(null);
    setTempSelectedCareers([]); // Reset temp selections
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('extract_keywords', 'true');
        formData.append('categorize_skills', 'true');
        formData.append('get_job_recommendations', 'true');
        formData.append('top_k', '10');
        const response = await fetch('http://localhost:5000/api/document/extract', {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        setDocResult(result);
      } else if (filename && user) {
        const response = await fetch('http://localhost:5000/api/document/extract-from-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            filename,
            extract_keywords: true,
            categorize_skills: true,
            get_job_recommendations: true,
            top_k: 10
          })
        });
        const result = await response.json();
        setDocResult(result);
      }
    } catch (error) {
      console.error('Document extraction error:', error);
      setDocResult({
        success: false,
        error: 'Failed to extract text. Please try again.'
      });
    } finally {
      setDocLoading(false);
    }
  }, [docServiceAvailable, user]);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text:', err);
      alert('Failed to copy text to clipboard');
    });
  }, []);

  const copyKeywordsToClipboard = useCallback((keywords) => {
    const keywordText = keywords.map(k => k.keyword).join(', ');
    navigator.clipboard.writeText(keywordText).then(() => {
      setKeywordsCopied(true);
      setTimeout(() => setKeywordsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy keywords:', err);
      alert('Failed to copy keywords to clipboard');
    });
  }, []);

  // Upload
  const handleUpload = useCallback(async () => {
    if (!files.length || !user || uploading) return;
    const validFilesToUpload = files.filter(file => isValidFileType(file));
    if (validFilesToUpload.length === 0) {
      alert('No valid files to upload.');
      return;
    }
    setUploading(true);
    setUploadProgress({});
    try {
      const formData = new FormData();
      formData.append('email', user.email);
      validFilesToUpload.forEach(file => formData.append('files', file));
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (!isMountedRef.current) return;
      if (result.success) {
        alert(`✅ ${result.files.length} file(s) uploaded successfully!`);
        setFiles([]);
        setUploadProgress({});
        await fetchUserFiles(user, true);
      } else {
        alert(`❌ Upload failed: ${result.message}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('❌ Error uploading files. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
      }
    }
  }, [files, user, uploading, fetchUserFiles, isValidFileType]);

  // Utils
  const formatFileSize = useCallback((b) => {
    if (!b) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }, []);

  const formatDate = useCallback((d) =>
    new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }), []);

  const deleteFile = useCallback(async (name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/delete/${encodeURIComponent(user.email)}/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (result.success) {
        alert('File deleted');
        fetchUserFiles(user, true);
      } else {
        alert(`Delete failed: ${result.message}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting file');
    }
  }, [user, fetchUserFiles]);

  const deleteAllFiles = useCallback(async () => {
    if (!user || uploadedFiles.length === 0) return;
    if (!confirm(`Delete ALL ${uploadedFiles.length} files? This cannot be undone.`)) return;
    setDeletingAll(true);
    try {
      for (const file of uploadedFiles) {
        const res = await fetch(`http://localhost:5000/api/delete/${encodeURIComponent(user.email)}/${encodeURIComponent(file.filename)}`, {
          method: 'DELETE'
        });
        const result = await res.json();
        if (!result.success) {
          throw new Error(`Failed to delete ${file.filename}`);
        }
      }
      alert(`Successfully deleted ${uploadedFiles.length} files`);
      setUploadedFiles([]);
    } catch (err) {
      console.error('Error deleting all files:', err);
      alert(`Error deleting files: ${err.message}`);
      fetchUserFiles(user, true);
    } finally {
      setDeletingAll(false);
    }
  }, [user, uploadedFiles, fetchUserFiles]);

  const getFileUrl = useCallback((action, filename) => {
    return `http://localhost:5000/api/${action}/${encodeURIComponent(user.email)}/${encodeURIComponent(filename)}`;
  }, [user]);

  const handleViewFile = useCallback((filename) => {
    const url = getFileUrl('view', filename);
    const ext = filename.split('.').pop().toLowerCase();
    const viewer = ['doc', 'docx', 'pdf', 'jpg', 'jpeg', 'png'];
    const finalUrl = viewer.includes(ext)
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
      : url;
    window.open(finalUrl, '_blank');
  }, [getFileUrl]);

  const handleDownloadFile = useCallback((filename) => {
    window.open(getFileUrl('download', filename), '_blank');
  }, [getFileUrl]);

  // Render job recommendations with selection checkboxes
  const renderJobRecommendationsWithSelection = (recommendations) => {
    if (!recommendations || !recommendations.success) {
      return (
        <p style={{ color: secondaryText, textAlign: 'center', padding: '1rem' }}>
          No job recommendations available
        </p>
      );
    }

    const { job_recommendations, target_keyword } = recommendations;
    
    if (!job_recommendations || job_recommendations.length === 0) {
      return (
        <p style={{ color: secondaryText, textAlign: 'center', padding: '1rem' }}>
          No job recommendations found for "{target_keyword}"
        </p>
      );
    }

    return (
      <div>
        {job_recommendations.length < 5 && (
          <div style={{ 
            color: warningColor, 
            fontSize: '0.9rem', 
            marginBottom: '1rem',
            background: 'rgba(245, 158, 11, 0.1)',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertTriangle size={16} />
            <span>
              ⚠️ Only {job_recommendations.length} matching job{job_recommendations.length !== 1 ? 's' : ''} found. 
              Try adding more skills to your resume for better recommendations.
            </span>
          </div>
        )}
        
        <div style={{ display: 'grid', gap: '1rem' }}>
          {job_recommendations.map((job, idx) => {
            const relevanceScore = Math.round(job.relevance_score * 100);
            const isHighMatch = relevanceScore >= 85;
            const isMediumMatch = relevanceScore >= 70;
            const isSelected = isCareerSelected(job.title);
            const isAlreadySaved = selectedCareers.some(c => c.title === job.title);
            
            return (
              <div key={idx} style={{
                padding: '1.5rem',
                background: isSelected 
                  ? `linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)`
                  : `linear-gradient(135deg, ${
                    isHighMatch ? 'rgba(34, 197, 94, 0.08)' : isMediumMatch ? 'rgba(245, 158, 11, 0.08)' : 'rgba(148, 163, 184, 0.08)'
                  } 0%, rgba(255, 255, 255, 0.02) 100%)`,
                borderRadius: '12px',
                border: isSelected 
                  ? `2px solid ${primaryColor}`
                  : `2px solid ${
                    isHighMatch ? 'rgba(34, 197, 94, 0.3)' : isMediumMatch ? 'rgba(245, 158, 11, 0.3)' : 'rgba(148, 163, 184, 0.2)'
                  }`,
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Selection Checkbox */}
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {isAlreadySaved ? (
                    <span style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '6px',
                      color: secondaryColor,
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <CheckCircle size={16} /> Already in Goals
                    </span>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleCareerSelection(job)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: isSelected ? primaryColor : 'rgba(59, 130, 246, 0.2)',
                        border: `1px solid ${isSelected ? primaryColor : 'rgba(59, 130, 246, 0.4)'}`,
                        borderRadius: '6px',
                        color: isSelected ? 'white' : primaryColor,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {isSelected ? <CheckCircle size={16} /> : <Briefcase size={16} />}
                      {isSelected ? 'Selected' : 'Select Career'}
                    </motion.button>
                  )}
                </div>

                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${relevanceScore}%`,
                  height: '4px',
                  background: `linear-gradient(90deg, ${
                    isHighMatch ? '#22C55E' : isMediumMatch ? '#F59E0B' : '#94A3B8'
                  }, ${
                    isHighMatch ? '#16A34A' : isMediumMatch ? '#D97706' : '#64748B'
                  })`
                }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingRight: '8rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h5 style={{ 
                        color: primaryText, 
                        margin: 0, 
                        fontSize: '1.4rem', 
                        fontWeight: 700 
                      }}>
                        {job.title}
                      </h5>
                      {idx === 0 && (
                        <span style={{
                          background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          TOP MATCH
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        background: isHighMatch ? '#22C55E' : isMediumMatch ? '#F59E0B' : '#94A3B8',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}>
                        {relevanceScore}% Match
                      </div>
                      <span style={{ 
                        color: secondaryColor, 
                        fontSize: '0.9rem',
                        background: 'rgba(16, 185, 129, 0.1)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px'
                      }}>
                        {job.sector}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p style={{ 
                  color: secondaryText, 
                  fontSize: '1rem', 
                  lineHeight: 1.6,
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${isHighMatch ? '#22C55E' : isMediumMatch ? '#F59E0B' : '#94A3B8'}`
                }}>
                  {job.description}
                </p>
                
                {job.required_skills && job.required_skills.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      marginBottom: '0.75rem' 
                    }}>
                      <CheckCircle size={16} color={secondaryColor} />
                      <strong style={{ color: secondaryColor, fontSize: '1rem' }}>
                        Required Skills ({job.required_skills.length})
                      </strong>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {job.required_skills.slice(0, 8).map((skill, i) => (
                        <span key={i} style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          borderRadius: '20px',
                          fontSize: '0.9rem',
                          color: secondaryColor,
                          fontWeight: 500
                        }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Career Selection Button */}
        {tempSelectedCareers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
              borderRadius: '12px',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              textAlign: 'center'
            }}
          >
            <p style={{ color: primaryText, fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>
              🎯 {tempSelectedCareers.length} career{tempSelectedCareers.length > 1 ? 's' : ''} selected
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={saveCareerSelection}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Briefcase size={20} /> Add to My Career Goals
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTempSelectedCareers([])}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: errorColor,
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                Clear Selection
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // Render keywords
  const renderKeywords = (keywords) => {
    if (!keywords || !keywords.success) return null;
    const { keywords_by_category, top_keywords } = keywords;
    const allKeywords = top_keywords.map(k => k.keyword);

    const getKeywordStyle = (keyword, isSelected) => ({
      display: 'inline-block',
      background: isSelected ? primaryColor : 'rgba(59, 130, 246, 0.2)',
      color: isSelected ? 'white' : primaryText,
      padding: '0.4rem 0.8rem',
      borderRadius: '6px',
      margin: '0.3rem',
      cursor: 'pointer',
      border: isSelected ? '2px solid white' : '1px solid rgba(59, 130, 246, 0.3)',
      transition: 'all 0.2s ease',
      fontWeight: isSelected ? 600 : 400,
      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
      boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none'
    });

    return (
      <div style={{ marginTop: '1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          <div>
            <h4 style={{
              color: secondaryColor,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '1.2rem'
            }}>
              <Tag size={22} />
              Extracted Keywords
            </h4>
            <p style={{ color: secondaryText, margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              {keywords.total_keywords_found} keywords found • {keywords.unique_keywords} unique • {keywords.categories_found.length} categories
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => copyKeywordsToClipboard(top_keywords)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: keywordsCopied ? 'rgba(34,197,94,0.2)' : secondaryColor,
                border: `1px solid ${keywordsCopied ? 'rgba(34,197,94,0.4)' : 'rgba(16, 185, 129, 0.6)'}`,
                borderRadius: '6px',
                color: keywordsCopied ? '#22C55E' : primaryText,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              {keywordsCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {keywordsCopied ? 'Copied!' : 'Copy All Keywords'}
            </button>
            <button
              onClick={() => setShowKeywords(!showKeywords)}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '6px',
                color: secondaryColor,
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {showKeywords ? 'Hide Categories' : 'Show Categories'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h5 style={{
            color: primaryText,
            fontSize: '1rem',
            marginBottom: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <TrendingUp size={18} />
            Top Keywords ({top_keywords.length}) - Click for Job Recommendations
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
            {top_keywords.map((item, index) => (
              <div
                key={index}
                style={getKeywordStyle(item.keyword, selectedKeywordForJobs === item.keyword)}
                onClick={() => handleKeywordClick(item.keyword, allKeywords)}
              >
                <div style={{ fontWeight: 600, color: selectedKeywordForJobs === item.keyword ? 'white' : secondaryColor }}>
                  {item.keyword}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: selectedKeywordForJobs === item.keyword ? 'rgba(255,255,255,0.8)' : tertiaryText, 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginTop: '0.25rem'
                }}>
                  <span>{item.category.replace('_', ' ')}</span>
                  <span>{Math.round(item.confidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedKeywordForJobs && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'rgba(59, 130, 246, 0.08)',
            borderRadius: '12px',
            border: '2px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h4 style={{
                color: primaryColor,
                margin: 0,
                fontSize: '1.3rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Briefcase size={24} />
                Jobs for "{selectedKeywordForJobs}"
              </h4>
              <button
                onClick={() => {
                  setSelectedKeywordForJobs('');
                  setKeywordJobRecommendations(null);
                }}
                style={{
                  padding: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '6px',
                  color: errorColor,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <X size={16} />
                <span style={{ fontSize: '0.9rem' }}>Clear</span>
              </button>
            </div>
            
            {loadingKeywordJobs && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  color: primaryColor,
                  fontSize: '1.1rem',
                  marginBottom: '0.5rem',
                  fontWeight: 600
                }}>
                  Finding jobs for "{selectedKeywordForJobs}"...
                </div>
                <div style={{ color: tertiaryText, fontSize: '0.9rem' }}>
                  Analyzing skill requirements and learning paths
                </div>
              </div>
            )}
            
            {!loadingKeywordJobs && keywordJobRecommendations && (
              renderJobRecommendationsWithSelection(keywordJobRecommendations)
            )}
          </div>
        )}

        {showKeywords && (
          <div style={{ padding: '1rem', background: secondaryBackground, borderRadius: '8px' }}>
            <h5 style={{ color: secondaryColor, fontSize: '1rem', marginBottom: '1rem', fontWeight: 600 }}>
              Keywords by Category
            </h5>
            {Object.entries(keywords_by_category).map(([category, items]) => (
              <div key={category} style={{ marginBottom: '1.5rem' }}>
                <h6 style={{
                  color: secondaryColor,
                  fontSize: '0.95rem',
                  marginBottom: '0.75rem',
                  textTransform: 'capitalize',
                  fontWeight: 500,
                  padding: '0.5rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '6px',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  {category.replace('_', ' ')} ({items.length} found)
                </h6>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                  {items.map((item, index) => (
                    <span
                      key={index}
                      style={getKeywordStyle(item.keyword, selectedKeywordForJobs === item.keyword)}
                      onClick={() => handleKeywordClick(item.keyword, allKeywords)}
                    >
                      {item.keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Loading & Auth UI
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: mainBackground, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          color: primaryColor,
          fontSize: '1.2rem',
          fontWeight: 600
        }}>
          Loading...
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: mainBackground, color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            background: cardBackground,
            backdropFilter: 'blur(15px)',
            borderRadius: '1rem',
            padding: '2.5rem',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{
            background: primaryColor,
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <LogIn size={32} color="white" />
          </div>
          <h2 style={{
            color: primaryColor,
            marginBottom: '1rem',
            fontSize: '1.8rem',
            fontWeight: 700
          }}>
            Authentication Required
          </h2>
          <p style={{ color: secondaryText, marginBottom: '2rem' }}>Please sign in to upload and track your files.</p>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '0.75rem 1.5rem',
              background: primaryColor,
              color: primaryText,
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
              width: '100%',
              transition: 'transform 0.2s ease'
            }}
          >
            Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: mainBackground, color: primaryText, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', paddingTop: '90px' }}>
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          textAlign: 'center',
          color: primaryColor
        }}
      >
        Document Tracker
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.7 }}
        style={{ color: secondaryText, marginBottom: '1rem', textAlign: 'center', fontSize: '1.1rem', maxWidth: '600px' }}
      >
        Upload certifications and resumes to extract skills, categorize them, and discover matching job roles.
      </motion.p>
      {user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}
        >
          <p style={{ color: primaryColor, textAlign: 'center', fontSize: '1rem', fontWeight: 500 }}>
            📁 Files saved to: <strong>{sanitizeEmailForFolder(user.email)}</strong>
          </p>
        </motion.div>
      )}
      {!docServiceAvailable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            maxWidth: '800px',
            width: '100%'
          }}
        >
          <p style={{ color: errorColor, textAlign: 'center', fontSize: '0.9rem' }}>
            🔵 Document processing service unavailable. Start the Python service on port 5001 to enable skill extraction and job matching.
          </p>
        </motion.div>
      )}
      
      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        style={{
          width: '100%',
          maxWidth: '800px',
          background: cardBackground,
          backdropFilter: 'blur(15px)',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '2.5rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
            cursor: 'pointer',
            position: 'relative',
            background: cardBackground,
            transition: 'all 0.3s ease'
          }}
        >
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
            disabled={uploading}
          />
          <div style={{
            background: primaryColor,
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Upload size={32} color="white" />
          </div>
          <h3 style={{
            color: primaryColor,
            marginBottom: '0.5rem',
            fontSize: '1.3rem',
            fontWeight: 600
          }}>
            Upload Certifications or Resumes
          </h3>
          <p style={{ color: secondaryText }}>Drag & drop files here or click to browse</p>
          <p style={{ color: tertiaryText, fontSize: '0.9rem', marginTop: '0.5rem' }}>Supported: JPG, PNG, PDF, DOC/DOCX</p>
        </div>
        
        {files.length > 0 && (
          <div>
            <h4 style={{ color: primaryColor, marginBottom: '1rem' }}>Selected Files ({files.length})</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {files.map((file, i) => (
                <div key={`${file.name}-${i}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: secondaryBackground,
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <FileText size={20} color={primaryColor} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: primaryText }}>{file.name}</div>
                      <div style={{ color: tertiaryText, fontSize: '0.8rem' }}>{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    disabled={uploading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: errorColor,
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      opacity: uploading ? 0.5 : 1
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: uploading ? tertiaryText : primaryColor,
                color: primaryText,
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                marginTop: '1.5rem',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
              }}
            >
              {uploading ? '⏳ Uploading...' : `📤 Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </motion.div>
      
      {/* Documents List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.7 }}
        style={{
          width: '100%',
          maxWidth: '800px',
          background: cardBackground,
          backdropFilter: 'blur(15px)',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: primaryColor }}>
            📂 Your Documents ({uploadedFiles.length}) {fetchingFiles && <span style={{ fontSize: '0.8rem', color: tertiaryText }}>Loading...</span>}
          </h3>
          {uploadedFiles.length > 0 && (
            <button
              onClick={deleteAllFiles}
              disabled={deletingAll || fetchingFiles}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(239,68,68,0.2)',
                color: errorColor,
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '6px',
                cursor: deletingAll || fetchingFiles ? 'not-allowed' : 'pointer',
                opacity: deletingAll || fetchingFiles ? 0.6 : 1
              }}
            >
              <Trash2 size={16} />
              {deletingAll ? 'Deleting...' : 'Delete All'}
            </button>
          )}
        </div>
        {uploadedFiles.length === 0 ? (
          <p style={{ color: tertiaryText, textAlign: 'center', padding: '2rem' }}>
            {fetchingFiles ? 'Loading documents...' : 'Upload a certification or resume to begin skill analysis!'}
          </p>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {uploadedFiles.map((file, i) => (
              <div key={`${file.filename}-${i}`} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: secondaryBackground,
                borderRadius: '8px',
                marginBottom: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  {file.filename.match(/\.(jpg|jpeg|png)$/i) ? (
                    <FileImage size={24} color={accentColor} />
                  ) : (
                    <FileText size={24} color={primaryColor} />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.25rem', color: primaryText }}>{file.filename}</div>
                    <div style={{ color: tertiaryText, fontSize: '0.85rem' }}>{formatFileSize(file.size)} • {formatDate(file.uploadDate)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {isDocumentFile(file.filename) && docServiceAvailable && (
                    <button
                      onClick={() => {
                        setSelectedFileForDoc(file.filename);
                        performDocumentExtraction(null, file.filename);
                        setDocModalOpen(true);
                      }}
                      style={{
                        padding: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '6px',
                        color: secondaryColor,
                        cursor: 'pointer'
                      }}
                      title="Analyze skills & recommend jobs"
                    >
                      <Scan size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleViewFile(file.filename)}
                    style={{
                      padding: '0.5rem',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '6px',
                      color: primaryColor,
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleDownloadFile(file.filename)}
                    style={{
                      padding: '0.5rem',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '6px',
                      color: secondaryColor,
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => deleteFile(file.filename)}
                    style={{
                      padding: '0.5rem',
                      background: 'rgba(239,68,68,0.2)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      borderRadius: '6px',
                      color: errorColor,
                      cursor: 'pointer'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      
      {/* Document Analysis Modal */}
      {docModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: '#1F2937',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{
                color: primaryColor,
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 600
              }}>
                Skill & Job Analysis
              </h3>
              <button
                onClick={() => {
                  setDocModalOpen(false);
                  setDocFile(null);
                  setDocResult(null);
                  setSelectedFileForDoc(null);
                  setShowKeywords(false);
                  setShowCategorizedSkills(false);
                  setShowJobRecommendations(false);
                  setSelectedKeywordForJobs('');
                  setKeywordJobRecommendations(null);
                  setLoadingKeywordJobs(false);
                  setTempSelectedCareers([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: tertiaryText,
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '4px'
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            {!selectedFileForDoc && (
              <div>
                <div style={{
                  border: '2px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  marginBottom: '1rem',
                  position: 'relative',
                  background: cardBackground
                }}>
                  <input
                    type="file"
                    onChange={handleDocFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{
                    background: primaryColor,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}>
                    <Scan size={24} color="white" />
                  </div>
                  <p style={{ color: secondaryText }}>Upload a certification or resume for skill analysis</p>
                </div>
                {docFile && (
                  <button
                    onClick={() => performDocumentExtraction(docFile)}
                    disabled={docLoading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: docLoading ? tertiaryText : primaryColor,
                      color: primaryText,
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: docLoading ? 'not-allowed' : 'pointer',
                      marginBottom: '1rem'
                    }}
                  >
                    {docLoading ? 'Analyzing Skills & Jobs...' : 'Analyze Document'}
                  </button>
                )}
              </div>
            )}
            
            {docLoading && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  color: primaryColor,
                  fontSize: '1.1rem',
                  marginBottom: '0.5rem',
                  fontWeight: 600
                }}>
                  Analyzing your document...
                </div>
                <div style={{ color: tertiaryText, fontSize: '0.9rem' }}>
                  Extracting skills • Categorizing • Matching jobs
                </div>
              </div>
            )}
            
            {docResult && (
              <div>
                {docResult.success ? (
                  <div>
                    {docResult.keywords && renderKeywords(docResult.keywords)}
                  </div>
                ) : (
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '6px'
                  }}>
                    <p style={{ color: errorColor, margin: 0 }}>
                      Error: {docResult.error}
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Tracker;