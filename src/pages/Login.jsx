import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const messageRef = useRef(null);

  useEffect(() => {
    const hideNavbar = () => {
      ['nav', 'header', '.navbar', '.nav-bar', '.navigation', '.header', '.top-nav', '.navbar-nav', '.nav', '.app-header', '.site-header', '.main-nav', '[role="navigation"]', '[class*="nav"]', '[class*="header"]'].forEach(s => 
        document.querySelectorAll(s).forEach(e => 
          ['display', 'visibility', 'opacity', 'height', 'overflow'].forEach(p => 
            e.style.setProperty(p, p === 'display' ? 'none' : p === 'visibility' ? 'hidden' : '0', 'important'))));
    };

    hideNavbar();
    const timeoutId = setTimeout(hideNavbar, 100);
    const observer = new MutationObserver(hideNavbar);
    observer.observe(document.body, { childList: true, subtree: true });

    document.body.style.cssText = 'margin:0;padding:0';
    const style = document.createElement('style');
    style.id = 'login-page-styles';
    style.innerHTML = `@keyframes fadeInUp{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}input.login-placeholder::placeholder{color:#f5f5f5!important;opacity:1!important}.login-container{animation:fadeInUp 1s ease-out}.btn{transition:all .3s ease}.btn:hover{opacity:.9;transform:translateY(-1px)}input:focus{outline:none;border-color:#ffc107;box-shadow:0 0 0 2px rgba(255,193,7,.25)}.error-message{color:#ff6b6b;font-size:.85rem;margin-top:5px}.success-message{color:#51cf66}.message-container{animation:fadeInUp .3s ease-out}nav,header,.navbar,.nav-bar,.navigation,.header,.top-nav,.navbar-nav,.nav,.app-header,.site-header,.main-nav,[role="navigation"],[class*="nav"],[class*="header"]{display:none!important;visibility:hidden!important;opacity:0!important;height:0!important;overflow:hidden!important;position:absolute!important;top:-9999px!important}body{padding-top:0!important;margin-top:0!important}`;
    document.head.appendChild(style);

    return () => {
      ['nav', 'header', '.navbar', '.nav-bar', '.navigation', '.header', '.top-nav', '.navbar-nav', '.nav', '.app-header', '.site-header', '.main-nav', '[role="navigation"]', '[class*="nav"]', '[class*="header"]'].forEach(s => 
        document.querySelectorAll(s).forEach(e => 
          ['display', 'visibility', 'opacity', 'height', 'overflow', 'position', 'top'].forEach(p => e.style.removeProperty(p))));
      document.getElementById('login-page-styles')?.remove();
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => { 
    if (message && messageRef.current) {
      setTimeout(() => messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); 
    }
  }, [message]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
    if (message) setMessage('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateNavbar = (userData) => {
    try {
      localStorage.setItem('skillora_user', JSON.stringify(userData));
      localStorage.setItem('skillora_auth_token', 'authenticated_' + Date.now());
      // Dispatch auth state change event to notify App.jsx
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { 
          isAuthenticated: true, 
          user: userData 
        } 
      }));
    } catch { 
      window.userData = userData; 
      window.isLoggedIn = true; 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!validateForm()) { 
      setMessage('Please fix the errors above'); 
      setLoading(false); 
      return; 
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim(), password: formData.password }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Login successful! Redirecting...');
        
        // Update authentication state and let App.jsx handle the navigation
        if (data.user) {
          updateNavbar(data.user);
        }
        
        // Don't navigate here - let App.jsx handle it through the auth state change
        // The auth state change will trigger the redirect in App.jsx
        
      } else {
        setMessage(`${data.message || 'Login failed. Please try again.'}`);
        if (data.message?.includes('Invalid email or password')) {
          setFormData(prev => ({ ...prev, password: '' }));
        }
      }
    } catch (error) {
      setMessage(error.name === 'TypeError' && error.message.includes('fetch') 
        ? 'Cannot connect to server. Please ensure the server is running on port 5000.' 
        : 'Network error. Please check your connection and try again.');
    }
    setLoading(false);
  };

  const inputStyle = { 
    width: '100%', 
    padding: '10px', 
    borderRadius: '8px', 
    border: '1px solid rgba(255,255,255,0.3)', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    color: '#fff', 
    transition: 'border-color 0.3s ease', 
    fontSize: '0.9rem' 
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      paddingTop: '50px', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <div className="login-container" style={{ 
        background: 'rgba(255, 255, 255, 0.1)', 
        border: '1px solid rgba(255, 255, 255, 0.2)', 
        backdropFilter: 'blur(16px)', 
        WebkitBackdropFilter: 'blur(16px)', 
        padding: '30px', 
        borderRadius: '16px', 
        maxWidth: '350px', 
        width: '100%', 
        color: '#fff', 
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.25)' 
      }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h1 style={{ fontWeight: 'bold', fontSize: '1.6rem', marginBottom: '8px' }}>Welcome Back</h1>
          <p style={{ color: '#eee', fontSize: '0.9rem' }}>Sign in to your Skillora account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ marginBottom: '6px', fontWeight: '500', display: 'block', fontSize: '0.9rem' }}>
              Email Address
            </label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleInputChange} 
              onKeyDown={(e) => e.key === 'Enter' && !loading && (e.preventDefault(), handleSubmit(e))} 
              placeholder="Enter your email" 
              required 
              style={{ 
                ...inputStyle, 
                borderColor: errors.email ? '#ff6b6b' : 'rgba(255,255,255,0.3)' 
              }} 
              className="login-placeholder" 
            />
            {errors.email && <div className="error-message">{errors.email}</div>}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ marginBottom: '6px', fontWeight: '500', display: 'block', fontSize: '0.9rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password" 
                value={formData.password} 
                onChange={handleInputChange} 
                onKeyDown={(e) => e.key === 'Enter' && !loading && (e.preventDefault(), handleSubmit(e))} 
                placeholder="Enter your password" 
                required 
                style={{ 
                  ...inputStyle, 
                  paddingRight: '35px', 
                  borderColor: errors.password ? '#ff6b6b' : 'rgba(255,255,255,0.3)' 
                }} 
                className="login-placeholder" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  right: '8px', 
                  transform: 'translateY(-50%)', 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#fff', 
                  fontSize: '1rem', 
                  cursor: 'pointer', 
                  opacity: 0.8, 
                  transition: 'opacity 0.3s ease' 
                }} 
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && <div className="error-message">{errors.password}</div>}
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '18px' 
          }}>
            <label style={{ 
              fontSize: '0.85rem', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center' 
            }}>
              <input type="checkbox" style={{ marginRight: '6px', transform: 'scale(1.1)' }} />
              Remember me
            </label>
            <a 
              href="#" 
              onClick={(e) => (e.preventDefault(), alert('Please contact support, and we will get you back into your account promptly'))} 
              style={{ 
                color: '#ffc107', 
                fontSize: '0.85rem', 
                textDecoration: 'none', 
                fontWeight: '500' 
              }}
            >
              Forgot Password?
            </a>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              borderRadius: '24px', 
              padding: '10px 0', 
              backgroundColor: 'transparent', 
              color: '#ffc107', 
              border: '2px solid #ffc107', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontSize: '0.95rem', 
              fontWeight: '600', 
              opacity: loading ? 0.7 : 1, 
              width: '100%', 
              transition: 'all 0.3s ease' 
            }}
          >
            {loading ? (
              <>
                <span style={{ marginRight: '6px', fontSize: '0.9rem' }}>🔄</span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {message && (
          <div 
            ref={messageRef} 
            className="message-container" 
            style={{ 
              textAlign: 'center', 
              marginTop: '12px', 
              padding: '10px', 
              borderRadius: '8px', 
              backgroundColor: message.includes('successful') || message.includes('Redirecting') 
                ? 'rgba(81, 207, 102, 0.2)' 
                : 'rgba(255, 107, 107, 0.2)', 
              border: message.includes('successful') || message.includes('Redirecting') 
                ? '1px solid #51cf66' 
                : '1px solid #ff6b6b', 
              fontSize: '0.9rem', 
              fontWeight: '500' 
            }}
          >
            <div className={
              message.includes('successful') || message.includes('Redirecting') 
                ? 'success-message' 
                : 'error-message'
            }>
              {message}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '18px', color: '#ccc' }}>
          <p style={{ fontSize: '0.9rem' }}>
            Don't have an account?{' '}
            <a 
              href="/signup" 
              onClick={(e) => (e.preventDefault(), navigate('/signup'))} 
              style={{ 
                color: '#ffc107', 
                textDecoration: 'underline', 
                fontWeight: '600' 
              }}
            >
              Sign up here
            </a>
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '10px', color: '#ccc' }}>
          <p style={{ fontSize: '0.9rem' }}>
            <a 
              href="/" 
              style={{ 
                color: '#ffc107', 
                textDecoration: 'underline', 
                fontWeight: '600' 
              }}
            >
              ⬅ Back to Home
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}