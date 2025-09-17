import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, LogIn, Download, Eye, Trash2 } from 'lucide-react';
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
  const navigate = useNavigate();

  // Refs to prevent memory leaks
  const authCheckIntervalRef = useRef(null);
  const progressIntervalsRef = useRef(new Map());
  const isMountedRef = useRef(true);

  const loggedInYellow = '#F59E0B';

  // Helper function to sanitize email for folder naming (matches server logic)
  const sanitizeEmailForFolder = useCallback((email) => {
    const username = email.toLowerCase().split('@')[0];
    return username.replace(/[^a-z0-9]/g, '_');
  }, []);

  // File type validation - memoized to prevent recreating on every render
  const isValidFileType = useCallback((file) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    return allowedTypes.includes(file.type) && allowedExtensions.includes(fileExtension);
  }, []);

  // Optimized file fetching with abort controller and optional loading state
  const fetchUserFiles = useCallback(async (userData, showLoading = false) => {
    if (!userData || fetchingFiles) return;
    
    if (showLoading) {
      setFetchingFiles(true);
    }
    const controller = new AbortController();
    
    try {
      const res = await fetch(`http://localhost:5000/api/files/${encodeURIComponent(userData.email)}`, {
        signal: controller.signal,
        timeout: 10000 // 10 second timeout
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (isMountedRef.current) {
        setUploadedFiles(data.success ? data.files : []);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error('Error fetching files:', err);
        setUploadedFiles([]);
      }
    } finally {
      if (isMountedRef.current && showLoading) {
        setFetchingFiles(false);
      }
    }

    return () => controller.abort();
  }, [fetchingFiles]);

  // Optimized auth check with cleanup
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
        // Initial load - don't show loading spinner for seamless UX
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
        if (!loading) {
          navigate('/login');
        }
      }
    }
  }, [navigate, fetchUserFiles, loading]);

  // Main effect with proper cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    checkAuthStatus();
    
    const handleAuthChange = (e) => {
      if (!isMountedRef.current) return;
      setIsAuthenticated(e.detail.isAuthenticated);
      setUser(e.detail.user);
      if (!e.detail.isAuthenticated) navigate('/login');
    };

    window.addEventListener('authStateChanged', handleAuthChange);
    
    // Reduce interval frequency to prevent excessive checking
    authCheckIntervalRef.current = setInterval(checkAuthStatus, 5000); // Changed from 2000 to 5000

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('authStateChanged', handleAuthChange);
      if (authCheckIntervalRef.current) {
        clearInterval(authCheckIntervalRef.current);
      }
      // Clear all progress intervals
      progressIntervalsRef.current.forEach(interval => clearInterval(interval));
      progressIntervalsRef.current.clear();
    };
  }, [navigate, checkAuthStatus]);

  // Debounced file change handler
  const handleFileChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = [];
    const invalidFiles = [];

    selectedFiles.forEach(file => {
      if (isValidFileType(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      alert(`The following files are not allowed: ${invalidFiles.join(', ')}\n\nOnly JPG, PNG, PDF, and DOC files are permitted.`);
    }

    // Only update files state if we have valid files
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
    
    // Reset input value to allow re-selecting the same file
    e.target.value = '';
  }, [isValidFileType]);

  // Optimized drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = loggedInYellow;
    e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
  }, [loggedInYellow]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)';
    e.currentTarget.style.backgroundColor = 'transparent';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)';
    e.currentTarget.style.backgroundColor = 'transparent';
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = [];
    const invalidFiles = [];

    droppedFiles.forEach(file => {
      if (isValidFileType(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      alert(`The following files are not allowed: ${invalidFiles.join(', ')}\n\nOnly JPG, PNG, PDF, and DOC files are permitted.`);
    }

    // Only update files state if we have valid files
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, [isValidFileType]);

  const removeFile = useCallback((i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    // Clear progress for removed file
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[i];
      return newProgress;
    });
  }, []);

  // Optimized upload with better error handling
  const handleUpload = useCallback(async () => {
    if (!files.length || !user || uploading) return;
    
    // Double-check file validation before upload
    const validFilesToUpload = files.filter(file => isValidFileType(file));
    if (validFilesToUpload.length === 0) {
      alert('No valid files to upload. Only JPG, PNG, PDF, and DOC files are allowed.');
      return;
    }
    
    if (validFilesToUpload.length !== files.length) {
      alert('Some files were removed due to invalid format. Only valid files will be uploaded.');
      setFiles(validFilesToUpload);
    }
    
    setUploading(true);
    setUploadProgress({});
    
    // Clear any existing intervals
    progressIntervalsRef.current.forEach(interval => clearInterval(interval));
    progressIntervalsRef.current.clear();
    
    try {
      const formData = new FormData();
      formData.append('email', user.email);
      validFilesToUpload.forEach(file => formData.append('files', file));

      // Optimized progress simulation
      let progress = 0;
      const progressInterval = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(progressInterval);
          return;
        }
        
        progress += 10;
        setUploadProgress(prev =>
          validFilesToUpload.reduce((acc, _, i) => ({ ...acc, [i]: Math.min(progress, 90) }), prev)
        );
        
        if (progress >= 90) {
          clearInterval(progressInterval);
        }
      }, 300); // Slightly slower progress updates
      
      progressIntervalsRef.current.set('upload', progressInterval);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const res = await fetch('http://localhost:5000/api/upload', { 
        method: 'POST', 
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      progressIntervalsRef.current.delete('upload');
      
      if (isMountedRef.current) {
        validFilesToUpload.forEach((_, i) => setUploadProgress(p => ({ ...p, [i]: 100 })));
      }

      const result = await res.json();
      
      if (!isMountedRef.current) return;
      
      if (result.success) {
        alert(`✅ ${result.files.length} file(s) uploaded successfully to folder: ${result.userFolder}`);
        setFiles([]);
        setUploadProgress({});
        // Only fetch user files after successful upload with loading indicator
        await fetchUserFiles(user, true);
      } else {
        alert(`❌ Upload failed: ${result.message}`);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        alert('❌ Upload timed out. Please try again.');
      } else {
        console.error('Upload error:', err);
        alert('❌ Error uploading files. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
        // Clear all progress intervals
        progressIntervalsRef.current.forEach(interval => clearInterval(interval));
        progressIntervalsRef.current.clear();
      }
    }
  }, [files, user, uploading, fetchUserFiles, isValidFileType]);

  // Memoized utility functions
  const formatFileSize = useCallback((b) => {
    if (!b) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }, []);

  const formatDate = useCallback((d) =>
    new Date(d).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }), []);

  const deleteFile = useCallback(async (name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(`http://localhost:5000/api/delete/${encodeURIComponent(user.email)}/${encodeURIComponent(name)}`, { 
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const result = await res.json();
      
      if (result.success) {
        alert('File deleted');
        // Show loading when refreshing after deletion
        fetchUserFiles(user, true);
      } else {
        alert(`Delete failed: ${result.message}`);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        alert('Delete operation timed out. Please try again.');
      } else {
        console.error('Delete error:', err);
        alert('Error deleting file');
      }
    }
  }, [user, fetchUserFiles]);

  // Add this function for deleting all files
  const deleteAllFiles = useCallback(async () => {
    if (!user || uploadedFiles.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ALL ${uploadedFiles.length} files? This action cannot be undone.`)) return;
    
    setDeletingAll(true);
    
    try {
      // Delete files one by one
      for (const file of uploadedFiles) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch(`http://localhost:5000/api/delete/${encodeURIComponent(user.email)}/${encodeURIComponent(file.filename)}`, { 
          method: 'DELETE',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const result = await res.json();
        
        if (!result.success) {
          throw new Error(`Failed to delete ${file.filename}: ${result.message}`);
        }
      }
      
      alert(`Successfully deleted ${uploadedFiles.length} files`);
      setUploadedFiles([]);
    } catch (err) {
      console.error('Error deleting all files:', err);
      alert(`Error deleting files: ${err.message}`);
      // Refresh the file list to show current state
      fetchUserFiles(user, true);
    } finally {
      setDeletingAll(false);
    }
  }, [user, uploadedFiles, fetchUserFiles]);

  // Helper function to generate file URLs
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: loggedInYellow, fontSize: '1.2rem' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#111827', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(15px)', borderRadius: '1rem', padding: '2.5rem', textAlign: 'center', maxWidth: '500px', width: '100%', boxShadow: '0 8px 25px rgba(0,0,0,0.6)' }}>
          <LogIn size={48} color={loggedInYellow} style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ color: loggedInYellow, marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: '#D1D5DB', marginBottom: '2rem' }}>Please sign in to upload and track your files.</p>
          <button onClick={() => navigate('/login')} style={{ padding: '0.75rem 1.5rem', background: loggedInYellow, color: '#111827', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>
            Sign In
          </button>
          <p style={{ color: '#9CA3AF', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            Don't have an account?{' '}
            <a href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup'); }} style={{ color: loggedInYellow, textDecoration: 'underline' }}>
              Sign up here
            </a>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111827', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', paddingTop: '90px' }}>
      <motion.h1 initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
        Document <span style={{ color: loggedInYellow }}>Tracker</span>
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.7 }} style={{ color: '#9CA3AF', marginBottom: '1rem', textAlign: 'center', fontSize: '1.1rem', maxWidth: '600px' }}>
        Upload and track your academic documents, certificates, and career materials.
      </motion.p>
      {user && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.7 }} style={{ color: loggedInYellow, marginBottom: '2rem', textAlign: 'center', fontSize: '1rem', fontWeight: 500 }}>
          📁 Files will be saved to: <strong>{sanitizeEmailForFolder(user.email)}</strong>
        </motion.p>
      )}
      
      {/* Upload Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }} style={{ width: '100%', maxWidth: '800px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(15px)', borderRadius: '1rem', padding: '2rem', boxShadow: '0 8px 25px rgba(0,0,0,0.6)', marginBottom: '2rem' }}>
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ border: '2px dashed rgba(245, 158, 11, 0.4)', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem', cursor: 'pointer', position: 'relative' }}
        >
          <input 
            type="file" 
            multiple 
            onChange={handleFileChange} 
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
            disabled={uploading}
          />
          <Upload size={48} color={loggedInYellow} style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: loggedInYellow, marginBottom: '0.5rem' }}>Upload Files</h3>
          <p style={{ color: '#D1D5DB' }}>Drag & drop files here or click to browse</p>
          <p style={{ color: '#9CA3AF', fontSize: '0.9rem', marginTop: '0.5rem' }}>Supported: JPG, PNG, PDF, DOC/DOCX only (Max 10MB, 10 files)</p>
        </div>
        
        {files.length > 0 && (
          <div>
            <h4 style={{ color: loggedInYellow, marginBottom: '1rem' }}>Selected Files ({files.length})</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {files.map((file, i) => (
                <div key={`${file.name}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <FileText size={20} color={loggedInYellow} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                      <div style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {uploadProgress[i] !== undefined && (
                      <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px' }}>
                        <div style={{ width: `${uploadProgress[i]}%`, height: '100%', background: loggedInYellow, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                      </div>
                    )}
                    <button onClick={() => removeFile(i)} disabled={uploading} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: uploading ? 'not-allowed' : 'pointer', padding: '0.25rem', borderRadius: '4px', opacity: uploading ? 0.5 : 1 }}>
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={handleUpload} 
              disabled={uploading} 
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                background: uploading ? '#9CA3AF' : loggedInYellow, 
                color: '#111827', 
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
      
      {/* Documents Section */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.7 }} style={{ width: '100%', maxWidth: '800px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(15px)', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 8px 25px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: loggedInYellow }}>
            📂 Your Documents ({uploadedFiles.length}) {fetchingFiles && <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Loading...</span>}
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
                color: '#EF4444', 
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
          <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '2rem' }}>
            {fetchingFiles ? 'Loading documents...' : 'No documents uploaded yet. Upload your first file above to get started!'}
          </p>
        ) : (
          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: `${loggedInYellow} rgba(0,0,0,0.2)`,
          }}>
            {/* Custom scrollbar styling for Webkit browsers */}
            <style>
              {`
                div::-webkit-scrollbar {
                  width: 8px;
                }
                div::-webkit-scrollbar-track {
                  background: rgba(0,0,0,0.2);
                  border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb {
                  background: ${loggedInYellow};
                  border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: #D97706;
                }
              `}
            </style>
            
            {uploadedFiles.map((file, i) => (
              <div key={`${file.filename}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  <FileText size={24} color={loggedInYellow} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.25rem' }}>{file.filename}</div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>{formatFileSize(file.size)} • {formatDate(file.uploadDate)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleViewFile(file.filename)} style={{ padding: '0.5rem', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '6px', color: loggedInYellow, cursor: 'pointer' }}>
                    <Eye size={16} />
                  </button>
                  <button onClick={() => handleDownloadFile(file.filename)} style={{ padding: '0.5rem', background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '6px', color: '#22C55E', cursor: 'pointer' }}>
                    <Download size={16} />
                  </button>
                  <button onClick={() => deleteFile(file.filename)} style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '6px', color: '#EF4444', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Tracker;