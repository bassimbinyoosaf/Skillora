import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function Signup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();
  const messageRef = useRef(null);

  // Navbar hiding logic (same as Login component)
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
    style.id = 'signup-page-styles';
    style.innerHTML = `@keyframes fadeInUp{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}input.signup-placeholder::placeholder{color:#f5f5f5!important;opacity:1!important}.signup-container{animation:fadeInUp 1s ease-out}.btn{transition:all .3s ease}.btn:hover{opacity:.9;transform:translateY(-1px)}input:focus{outline:none;border-color:#ffc107;box-shadow:0 0 0 2px rgba(255,193,7,.25)}.error-message{color:#ff6b6b;font-size:.85rem;margin-top:5px}.success-message{color:#51cf66}.message-container{animation:fadeInUp .3s ease-out}nav,header,.navbar,.nav-bar,.navigation,.header,.top-nav,.navbar-nav,.nav,.app-header,.site-header,.main-nav,[role="navigation"],[class*="nav"],[class*="header"]{display:none!important;visibility:hidden!important;opacity:0!important;height:0!important;overflow:hidden!important;position:absolute!important;top:-9999px!important}body{padding-top:0!important;margin-top:0!important}`;
    document.head.appendChild(style);

    return () => {
      ['nav', 'header', '.navbar', '.nav-bar', '.navigation', '.header', '.top-nav', '.navbar-nav', '.nav', '.app-header', '.site-header', '.main-nav', '[role="navigation"]', '[class*="nav"]', '[class*="header"]'].forEach(s => 
        document.querySelectorAll(s).forEach(e => 
          ['display', 'visibility', 'opacity', 'height', 'overflow', 'position', 'top'].forEach(p => e.style.removeProperty(p))));
      document.getElementById('signup-page-styles')?.remove();
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let timer;
    if (otpTimer > 0) {
      timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
    } else if (currentStep === 2 && otpTimer === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [otpTimer, currentStep]);

  useEffect(() => { 
    if (message && messageRef.current) {
      setTimeout(() => messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); 
    }
  }, [message]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    switch (name) {
      case 'firstName':
        if (!value.trim()) newErrors.firstName = 'First name is required';
        else if (value.trim().length < 2) newErrors.firstName = 'First name must be at least 2 characters';
        else delete newErrors.firstName;
        break;
      case 'lastName':
        if (!value.trim()) newErrors.lastName = 'Last name is required';
               else delete newErrors.lastName;
        break;
      case 'email':
        if (!value.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) newErrors.email = 'Please enter a valid email address';
        else delete newErrors.email;
        break;
      case 'password':
        if (!value) newErrors.password = 'Password is required';
        else if (value.length < 6) newErrors.password = 'Password must be at least 6 characters';
        else delete newErrors.password;
        break;
      case 'confirmPassword':
        if (!value) newErrors.confirmPassword = 'Please confirm your password';
        else if (value !== formData.password) newErrors.confirmPassword = 'Passwords do not match';
        else delete newErrors.confirmPassword;
        break;
    }
    setErrors(newErrors);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
    if (name === 'confirmPassword' || name === 'password') {
      const password = name === 'password' ? value : formData.password;
      const confirmPassword = name === 'confirmPassword' ? value : formData.confirmPassword;
      setPasswordMatch(password === confirmPassword || confirmPassword === '');
    }
    if (message) setMessage('');
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validate all fields
    validateField('email', formData.email);
    validateField('firstName', formData.firstName);
    validateField('lastName', formData.lastName);
    
    if (errors.email || errors.firstName || errors.lastName) {
      setMessage('Please fix the errors above');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setMessage('Email is required');
      setLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setMessage('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          firstName: formData.firstName.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('OTP sent to your email! Please check your inbox.');
        setCurrentStep(2);
        setOtpTimer(300);
        setCanResend(false);
      } else {
        setMessage(data.message || 'Failed to send OTP. Please check if the server is running.');
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      setMessage('Network error. Please check if the server is running on port 5000.');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!otp.trim() || otp.length !== 6) {
      setMessage('Please enter a valid 6-digit OTP');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          otp: otp.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Email verified successfully!');
        setCurrentStep(3);
      } else {
        setMessage(data.message || 'Invalid or expired OTP');
      }
    } catch (error) {
      console.error('Verify OTP Error:', error);
      setMessage('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          firstName: formData.firstName.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('New OTP sent to your email!');
        setOtpTimer(300);
        setCanResend(false);
        setOtp('');
      } else {
        setMessage(data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP Error:', error);
      setMessage('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleCompleteSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validate all fields
    ['firstName', 'lastName', 'password', 'confirmPassword'].forEach(field => 
      validateField(field, formData[field])
    );

    if (Object.keys(errors).length > 0) {
      setMessage('Please fix the errors above');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordMatch(false);
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          isVerified: true
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Account created successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        // More detailed error message
        setMessage(data.message || `Signup failed: ${response.status} ${response.statusText}`);
        console.error('Signup failed:', data);
      }
    } catch (error) {
      console.error('Signup Error:', error);
      setMessage('Network error. Please check if the server is running on port 5000.');
    }
    setLoading(false);
  };

  const handleStepChange = (step) => {
    setCurrentStep(step);
    setMessage(''); // Clear message when changing steps
  };

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    paddingTop: '50px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const signupContainerStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    padding: '30px',
    borderRadius: '16px',
    maxWidth: '400px',
    width: '100%',
    color: '#fff',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.25)'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    transition: 'border-color 0.3s ease',
    fontSize: '0.9rem',
  };

  const inputStyleWithIcon = { ...inputStyle, paddingRight: '35px' };

  const toggleStyle = {
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
  };

  return (
    <div style={containerStyle}>
      {/* Add global styles for placeholder and signup container animation */}
      <style>
        {`
          input.signup-placeholder::placeholder {
            color: rgba(255, 255, 255, 0.7) !important;
          }
          input::-webkit-input-placeholder {
            color: rgba(255, 255, 255, 0.7) !important;
          }
          input::-moz-placeholder {
            color: rgba(255, 255, 255, 0.7) !important;
          }
          input:-ms-input-placeholder {
            color: rgba(255, 255, 255, 0.7) !important;
          }
          input:-moz-placeholder {
            color: rgba(255, 255, 255, 0.7) !important;
          }
          .signup-container {
            animation: fadeInUp 1s ease-out;
          }
          .message-container {
            animation: fadeInUp 0.3s ease-out;
          }
          input:focus {
            outline: none;
            border-color: #ffc107;
            box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.25);
          }
        `}
      </style>
      
      <div className="signup-container" style={signupContainerStyle}>
        
        {/* Step Indicator */}
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}>
          <div style={{width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 10px', fontWeight: 'bold', 
            background: currentStep >= 1 ? (currentStep > 1 ? '#51cf66' : '#ffc107') : 'rgba(255,255,255,0.3)', 
            color: currentStep >= 1 ? (currentStep > 1 ? 'white' : '#333') : 'white'}}>
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <div style={{width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 10px', fontWeight: 'bold', 
            background: currentStep >= 2 ? (currentStep > 2 ? '#51cf66' : '#ffc107') : 'rgba(255,255,255,0.3)', 
            color: currentStep >= 2 ? (currentStep > 2 ? 'white' : '#333') : 'white'}}>
            {currentStep > 2 ? '✓' : '2'}
          </div>
          <div style={{width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 10px', fontWeight: 'bold', 
            background: currentStep >= 3 ? '#ffc107' : 'rgba(255,255,255,0.3)', 
            color: currentStep >= 3 ? '#333' : 'white'}}>
            3
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h1 style={{ fontWeight: 'bold', fontSize: '1.6rem', marginBottom: '8px' }}>
            {currentStep === 1 && 'Create Account'}
            {currentStep === 2 && 'Verify Email'}
            {currentStep === 3 && 'Complete Registration'}
          </h1>
          <p style={{ color: '#eee', fontSize: '0.9rem' }}>
            {currentStep === 1 && 'Enter your email to get started'}
            {currentStep === 2 && 'Enter the 6-digit code sent to your email'}
            {currentStep === 3 && 'Complete your account details'}
          </p>
        </div>

        {/* Step 1: Email Input */}
        {currentStep === 1 && (
          <form onSubmit={handleSendOTP}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ marginBottom: '6px', fontWeight: '500', display: 'block', fontSize: '0.9rem' }}>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter your email address" required
                style={{ ...inputStyle, borderColor: errors.email ? '#ff6b6b' : 'rgba(255,255,255,0.3)' }} className="signup-placeholder" />
              {errors.email && <div style={{color: '#ff6b6b', fontSize: '0.85rem', marginTop: '5px'}}>{errors.email}</div>}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ marginBottom: '6px', fontWeight: '500', display: 'block', fontSize: '0.9rem' }}>First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First name" required
                  style={{ ...inputStyle, borderColor: errors.firstName ? '#ff6b6b' : 'rgba(255,255,255,0.3)' }} className="signup-placeholder" />
                {errors.firstName && <div style={{color: '#ff6b6b', fontSize: '0.85rem', marginTop: '5px'}}>{errors.firstName}</div>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ marginBottom: '6px', fontWeight: '500', display: 'block', fontSize: '0.9rem' }}>Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last name" required
                  style={{ ...inputStyle, borderColor: errors.lastName ? '#ff6b6b' : 'rgba(255,255,255,0.3)' }} className="signup-placeholder" />
                {errors.lastName && <div style={{color: '#ff6b6b', fontSize: '0.85rem', marginTop: '5px'}}>{errors.lastName}</div>}
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ borderRadius: '24px', padding: '10px 0', marginBottom: '12px', backgroundColor: 'transparent', color: '#ffc107', border: '2px solid #ffc107', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '0.95rem', fontWeight: '600', width: '100%', transition: 'all 0.3s ease' }}>
              {loading ? <span><span style={{ marginRight: '6px', fontSize: '0.9rem' }}>🔄</span>Sending OTP...</span> : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {currentStep === 2 && (
          <form onSubmit={handleVerifyOTP}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ marginBottom: '10px', fontWeight: '500', display: 'block', fontSize: '0.9rem' }}>Enter OTP</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength="6" required
                style={{ ...inputStyle, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold' }} className="signup-placeholder" />
            </div>

            {otpTimer > 0 && (
              <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem', color: '#ffc107' }}>
                ⏰ OTP expires in {formatTime(otpTimer)}
              </div>
            )}

            <button type="submit" disabled={loading || otp.length !== 6}
              style={{ borderRadius: '24px', padding: '10px 0', marginBottom: '15px', backgroundColor: 'transparent', color: '#ffc107', border: '2px solid #ffc107', cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer', opacity: (loading || otp.length !== 6) ? 0.7 : 1, fontSize: '0.95rem', fontWeight: '600', width: '100%', transition: 'all 0.3s ease' }}>
              {loading ? <span><span style={{ marginRight: '6px', fontSize: '0.9rem' }}>🔄</span>Verifying...</span> : 'Verify OTP'}
            </button>

            {canResend && (
              <button type="button" onClick={handleResendOTP} disabled={loading}
                style={{ borderRadius: '24px', padding: '8px 0', marginBottom: '15px', backgroundColor: 'transparent', color: '#51cf66', border: '2px solid #51cf66', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '0.9rem', fontWeight: '500', width: '100%', transition: 'all 0.3s ease' }}>
                {loading ? 'Resending...' : 'Resend OTP'}
              </button>
            )}

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button type="button" onClick={() => handleStepChange(1)} style={{ background: 'transparent', border: 'none', color: '#ccc', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}>
                ← Change Email
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Complete Registration */}
        {currentStep === 3 && (
          <form onSubmit={handleCompleteSignup}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ marginBottom: '6px', fontWeight: '500', display: 'block', fontSize: '0.9rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} placeholder="Create password" required
                  style={{ ...inputStyleWithIcon, borderColor: errors.password ? '#ff6b6b' : 'rgba(255,255,255,0.3)' }} className="signup-placeholder" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={toggleStyle} title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <div style={{color: '#ff6b6b', fontSize: '0.85rem', marginTop: '5px'}}>{errors.password}</div>}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ marginBottom: '6px', fontWeight: '500', display: 'block', fontSize: '0.9rem' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="Confirm password" required
                  style={{ ...inputStyleWithIcon, borderColor: !passwordMatch || errors.confirmPassword ? '#ff6b6b' : 'rgba(255,255,255,0.3)' }} className="signup-placeholder" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={toggleStyle} title={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {(!passwordMatch || errors.confirmPassword) && <div style={{color: '#ff6b6b', fontSize: '0.85rem', marginTop: '5px'}}>{errors.confirmPassword || 'Passwords do not match'}</div>}
            </div>

            <div style={{ marginBottom: '18px', fontSize: '0.85rem' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}>
                <input type="checkbox" required style={{ marginRight: '6px', marginTop: '2px', transform: 'scale(1.1)' }} />
                <span>I agree to the <a href="#" style={{ color: '#ffc107', textDecoration: 'underline', fontWeight: '500' }}>Terms of Service</a> and <a href="#" style={{ color: '#ffc107', textDecoration: 'underline', fontWeight: '500' }}>Privacy Policy</a></span>
              </label>
            </div>

            <button type="submit" disabled={loading}
              style={{ borderRadius: '24px', padding: '10px 0', marginBottom: '12px', backgroundColor: 'transparent', color: '#ffc107', border: '2px solid #ffc107', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '0.95rem', fontWeight: '600', width: '100%', transition: 'all 0.3s ease' }}>
              {loading ? <span><span style={{ marginRight: '6px', fontSize: '0.9rem' }}>🔄</span>Creating Account...</span> : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button type="button" onClick={() => handleStepChange(2)} style={{ background: 'transparent', border: 'none', color: '#ccc', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}>
                ← Back to OTP Verification
              </button>
            </div>
          </form>
        )}

        {message && (
          <div 
            ref={messageRef}
            className="message-container"
            style={{ textAlign: 'center', marginBottom: '20px', marginTop: '15px', padding: '12px', borderRadius: '8px', 
            backgroundColor: message.includes('successfully') || message.includes('sent') || message.includes('verified') ? 'rgba(81, 207, 102, 0.2)' : 'rgba(255, 107, 107, 0.2)', 
            border: message.includes('successfully') || message.includes('sent') || message.includes('verified') ? '1px solid #51cf66' : '1px solid #ff6b6b', 
            fontSize: '0.9rem', fontWeight: '500', 
            color: message.includes('successfully') || message.includes('sent') || message.includes('verified') ? '#51cf66' : '#ff6b6b' }}>
            {message}
          </div>
        )}

        {currentStep === 1 && (
          <>
            <div style={{ textAlign: 'center', color: '#ccc' }}>
              <p style={{ fontSize: '0.9rem' }}>Already have an account? <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }} style={{ color: '#ffc107', textDecoration: 'underline', fontWeight: '600' }}>Sign in here</a></p>
            </div>

            <div style={{ textAlign: 'center', color: '#ccc', marginTop: '10px' }}>
              <p style={{ fontSize: '0.9rem' }}><a href="/" style={{ color: '#ffc107', textDecoration: 'underline', fontWeight: '600' }}>← Back to Home</a></p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}