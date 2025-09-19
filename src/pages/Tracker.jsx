import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, LogIn, Download, Eye, Trash2, FileImage, Scan, Copy, CheckCircle } from 'lucide-react';
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

  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const authCheckIntervalRef = useRef(null);
  const progressIntervalsRef = useRef(new Map());

  const loggedInYellow = '#F59E0B';

  // Helper functions
  const sanitizeEmailForFolder = useCallback((email) => {
    return email.toLowerCase().split('@')[0].replace(/[^a-z0-9]/g, '_');
  }, []);

  const isValidFileType = useCallback((file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf',
                         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(file.type) && allowedExtensions.includes(fileExtension);
  }, []);

  const isDocumentFile = useCallback((filename) => {
    const docExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
    const fileExt = filename.split('.').pop().toLowerCase();
    return docExtensions.includes(fileExt);
  }, []);

  // Document Service Functions
  const checkDocServiceStatus = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/document/status');
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

  // Auth check
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

  // Main effect
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
      if (authCheckIntervalRef.current) {
        clearInterval(authCheckIntervalRef.current);
      }
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
      alert(`Invalid files: ${invalidFiles.map(f => f.name).join(', ')}\n\nOnly JPG, PNG, PDF, and DOC files are permitted.`);
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

  // Drag and drop
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
    const validFiles = droppedFiles.filter(file => isValidFileType(file));
    const invalidFiles = droppedFiles.filter(file => !isValidFileType(file));

    if (invalidFiles.length > 0) {
      alert(`Invalid files: ${invalidFiles.map(f => f.name).join(', ')}\n\nOnly JPG, PNG, PDF, and DOC files are permitted.`);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, [isValidFileType]);

  const removeFile = useCallback((i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[i];
      return newProgress;
    });
  }, []);

  // Document processing
  const performDocumentExtraction = useCallback(async (file = null, filename = null) => {
    if (!docServiceAvailable) {
      alert('Document processing service is not available. Please ensure the Python service is running on port 5001.');
      return;
    }

    setDocLoading(true);
    setDocResult(null);

    try {
      if (file) {
        // Process uploaded file
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:5000/api/document/extract', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        setDocResult(result);
      } else if (filename && user) {
        // Process existing file
        const response = await fetch('http://localhost:5000/api/document/extract-from-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            filename: filename
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

  // Upload function
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
        
        if (progress >= 90) clearInterval(progressInterval);
      }, 300);
      
      progressIntervalsRef.current.set('upload', progressInterval);

      const res = await fetch('http://localhost:5000/api/upload', { 
        method: 'POST', 
        body: formData
      });
      
      clearInterval(progressInterval);
      progressIntervalsRef.current.delete('upload');
      
      if (isMountedRef.current) {
        validFilesToUpload.forEach((_, i) => setUploadProgress(p => ({ ...p, [i]: 100 })));
      }

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
        progressIntervalsRef.current.forEach(interval => clearInterval(interval));
        progressIntervalsRef.current.clear();
      }
    }
  }, [files, user, uploading, fetchUserFiles, isValidFileType]);

  // Utility functions
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
        Upload and manage your documents with intelligent text extraction capabilities.
      </motion.p>
      
      {user && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.7 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
          <p style={{ color: loggedInYellow, textAlign: 'center', fontSize: '1rem', fontWeight: 500 }}>
            📁 Files saved to: <strong>{sanitizeEmailForFolder(user.email)}</strong>
          </p>
        </motion.div>
      )}
      
      {/* Service Status */}
      {!docServiceAvailable && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '2rem', maxWidth: '800px', width: '100%' }}>
          <p style={{ color: '#EF4444', textAlign: 'center', fontSize: '0.9rem' }}>
            🔵 Document processing service unavailable. To enable text extraction, start the Python service on port 5001.
          </p>
        </motion.div>
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
          <p style={{ color: '#9CA3AF', fontSize: '0.9rem', marginTop: '0.5rem' }}>Supported: JPG, PNG, PDF, DOC/DOCX (Max 10MB, 10 files)</p>
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
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {uploadedFiles.map((file, i) => (
              <div key={`${file.filename}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  {file.filename.match(/\.(jpg|jpeg|png)$/i) ? (
                    <FileImage size={24} color={loggedInYellow} />
                  ) : (
                    <FileText size={24} color={loggedInYellow} />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.25rem' }}>{file.filename}</div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>{formatFileSize(file.size)} • {formatDate(file.uploadDate)}</div>
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
                      style={{ padding: '0.5rem', background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '6px', color: '#22C55E', cursor: 'pointer' }}
                      title="Extract text from document"
                    >
                      <Scan size={16} />
                    </button>
                  )}
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

      {/* Document Processing Modal */}
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
          zIndex: 1000,
          padding: '1rem'
        }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: '#1F2937',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: loggedInYellow, margin: 0 }}>Document Text Extraction</h3>
              <button
                onClick={() => {
                  setDocModalOpen(false);
                  setDocFile(null);
                  setDocResult(null);
                  setSelectedFileForDoc(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {!selectedFileForDoc && (
              <div>
                <div style={{
                  border: '2px dashed rgba(245,158,11,0.4)',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  marginBottom: '1rem',
                  position: 'relative'
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
                  <Scan size={48} color={loggedInYellow} style={{ marginBottom: '1rem' }} />
                  <p style={{ color: '#D1D5DB' }}>Drop a document here or click to browse</p>
                  <p style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Supported: PDF, DOC, DOCX, JPG, PNG</p>
                </div>

                {docFile && (
                  <button
                    onClick={() => performDocumentExtraction(docFile)}
                    disabled={docLoading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: docLoading ? '#9CA3AF' : loggedInYellow,
                      color: '#111827',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: docLoading ? 'not-allowed' : 'pointer',
                      marginBottom: '1rem'
                    }}
                  >
                    {docLoading ? 'Processing...' : 'Extract Text'}
                  </button>
                )}
              </div>
            )}

            {docLoading && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ color: loggedInYellow, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Processing document...</div>
                <div style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>This may take a few moments</div>
              </div>
            )}

            {docResult && (
              <div>
                {selectedFileForDoc && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(245,158,11,0.1)', borderRadius: '6px' }}>
                    <p style={{ color: loggedInYellow, margin: 0, fontSize: '0.9rem' }}>
                      Processing: {selectedFileForDoc}
                    </p>
                  </div>
                )}

                {docResult.success ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ color: '#22C55E', margin: 0 }}>Extracted Text</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {docResult.extraction_type && (
                          <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>
                            Method: {docResult.extraction_type.toUpperCase()}
                          </span>
                        )}
                        <button
                          onClick={() => copyToClipboard(docResult.text)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            background: textCopied ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
                            border: `1px solid ${textCopied ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.4)'}`,
                            borderRadius: '4px',
                            color: textCopied ? '#22C55E' : loggedInYellow,
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          {textCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                          {textCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div style={{
                      background: '#374151',
                      padding: '1rem',
                      borderRadius: '6px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      color: '#E5E7EB'
                    }}>
                      {docResult.text || 'No text found in document'}
                    </div>
                    <div style={{ marginTop: '0.5rem', color: '#9CA3AF', fontSize: '0.8rem' }}>
                      {docResult.word_count && `Words: ${docResult.word_count} | `}
                      {docResult.char_count && `Characters: ${docResult.char_count} | `}
                      {docResult.page_count && `Pages: ${docResult.page_count} | `}
                      {docResult.extraction_method && `Method: ${docResult.extraction_method}`}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px' }}>
                    <p style={{ color: '#EF4444', margin: 0 }}>
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