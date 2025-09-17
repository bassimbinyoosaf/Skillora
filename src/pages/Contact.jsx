import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, MessageCircle, Clock, Users } from 'lucide-react';

// Create a separate component for form fields to prevent unnecessary re-renders
const FormField = React.memo(({ 
  label, 
  name, 
  type = "text", 
  rows, 
  error, 
  value, 
  onChange, 
  isSubmitting,
  isAuthenticated 
}) => {
  return (
    <div className={type !== "text" && type !== "email" ? "mb-3" : ""}>
      <label htmlFor={name} className={isAuthenticated ? "form-label" : "form-label text-white"} 
        style={isAuthenticated ? {display: "block", marginBottom: "0.5rem", color: "#F3F4F6", fontSize: "0.9rem"} : {}}>
        {label}
      </label>
      {rows ? (
        <textarea
          id={name} 
          name={name} 
          rows={rows}
          className={!isAuthenticated ? `form-control bg-transparent text-white border-white ${error ? 'is-invalid' : ''}` : ""}
          style={isAuthenticated ? {
            width: "100%", padding: "0.75rem", borderRadius: "0.5rem", 
            border: error ? "1px solid #F59E0B" : "1px solid #374151",
            backgroundColor: "#111827", color: "#F3F4F6", fontSize: "1rem", resize: "vertical", minHeight: "100px"
          } : {}}
          value={value}
          onChange={onChange}
          disabled={isSubmitting}
        />
      ) : (
        <input
          type={type} 
          id={name} 
          name={name}
          className={!isAuthenticated ? `form-control bg-transparent text-white border-white ${error ? 'is-invalid' : ''}` : ""}
          style={isAuthenticated ? {
            width: "100%", padding: "0.75rem", borderRadius: "0.5rem",
            border: error ? "1px solid #F59E0B" : "1px solid #374151",
            backgroundColor: "#111827", color: "#F3F4F6", fontSize: "1rem"
          } : {}}
          value={value}
          onChange={onChange}
          disabled={isSubmitting}
        />
      )}
      {error && <div className={isAuthenticated ? "" : "invalid-feedback text-warning"} 
        style={isAuthenticated ? {color: "#F59E0B", fontSize: "0.8rem", marginTop: "0.25rem"} : {}}>
        {error}
      </div>}
    </div>
  );
});

FormField.displayName = 'FormField';

export const Contact = () => {
  const [state, setState] = useState({ isAuthenticated: false, user: null });
  const [formData, setFormData] = useState({name: '', email: '', subject: '', message: ''});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use useCallback to memoize functions and prevent unnecessary re-renders
  const checkAuth = useCallback(() => {
    try {
      const userData = localStorage.getItem('skillora_user');
      const authToken = localStorage.getItem('skillora_auth_token');
      const isAuth = !!(userData && authToken);
      setState({ isAuthenticated: isAuth, user: isAuth ? JSON.parse(userData) : null });
    } catch { 
      setState({ isAuthenticated: false, user: null }); 
    }
  }, []);

  useEffect(() => {
    checkAuth();
    const handleAuthChange = (event) => setState(event.detail);
    window.addEventListener('authStateChanged', handleAuthChange);
    
    // Only check auth every 5 seconds instead of 2 to reduce re-renders
    const interval = setInterval(checkAuth, 5000);
    
    return () => { 
      window.removeEventListener('authStateChanged', handleAuthChange); 
      clearInterval(interval); 
    };
  }, [checkAuth]);

  // Memoize the input change handler
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required.';
    if (!formData.email.trim()) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address.';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required.';
    if (!formData.message.trim()) newErrors.message = 'Message is required.';
    return newErrors;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { 
      setErrors(validationErrors); 
      return; 
    }
    
    setIsSubmitting(true);
    
    try {
      // Get user ID if authenticated
      const userId = state.isAuthenticated && state.user ? state.user.id : null;
      
      // Use absolute URL for API call to ensure it works in all environments
      const apiUrl = window.location.origin.includes('localhost') 
        ? 'http://localhost:5000/api/contact' 
        : '/api/contact';
      
      console.log('Sending contact form to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId
        }),
      });
      
      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        alert("Thank you for your message! We'll get back to you soon.");
        setFormData({name: '', email: '', subject: '', message: ''});
        setErrors({});
      } else {
        alert(`Failed to send message: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to send message. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, state, validate]);

  if (!state.isAuthenticated) {
    return (
      <div className="min-vh-100 position-relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', paddingTop: '60px',
      }}>
        <div className="position-absolute w-100 h-100" style={{
          background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          animation: 'float 6s ease-in-out infinite', zIndex: 0
        }}></div>

        <section className="position-relative d-flex align-items-center justify-content-center"
          style={{ minHeight: 'calc(100vh - 80px)', paddingTop: '2rem', paddingBottom: '3rem', zIndex: 1 }}>
          <div className="container">
            <div className="row justify-content-center text-center text-white mb-5">
              <div className="col-lg-8">
                <h1 className="display-4 fw-bold mb-4" style={{ animation: 'fadeInUp 1s ease-out' }}>
                  Contact <span className="text-warning">Skillora</span>
                </h1>
                <p className="fs-5 text-white-50" style={{ maxWidth: '600px', margin: '0 auto', animation: 'fadeInUp 1s ease-out 0.2s both' }}>
                  We'd love to hear from you. Send us a message and we'll get back to you as soon as possible.
                </p>
              </div>
            </div>

            <div className="row g-5 justify-content-center" style={{ animation: 'fadeInUp 1s ease-out 0.4s both' }}>
              <div className="col-lg-5 text-white">
                <h3>Contact Information</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Email: <strong style={{ color: '#fff' }}>info@skillora.com</strong></p>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Phone: <strong style={{ color: '#fff' }}>+1 (555) 123-4567</strong></p>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  Address:<br /><span style={{ color: '#fff' }}>123 Learning Street<br />Education City, EC 12345</span>
                </p>
              </div>

              <div className="col-lg-6 shadow p-4 text-white" style={{
                background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
                border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '30px', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              }}>
                <h4 className="mb-4">Send Us a Message</h4>
                <form onSubmit={handleSubmit} noValidate>
                  <div className="form-group mb-3">
                    <FormField 
                      label="Name" 
                      name="name" 
                      error={errors.name} 
                      value={formData.name}
                      onChange={handleInputChange}
                      isSubmitting={isSubmitting}
                      isAuthenticated={state.isAuthenticated}
                    />
                  </div>
                  <div className="form-group mb-3">
                    <FormField 
                      label="Email" 
                      name="email" 
                      type="email" 
                      error={errors.email} 
                      value={formData.email}
                      onChange={handleInputChange}
                      isSubmitting={isSubmitting}
                      isAuthenticated={state.isAuthenticated}
                    />
                  </div>
                  <div className="form-group mb-3">
                    <FormField 
                      label="Subject" 
                      name="subject" 
                      error={errors.subject} 
                      value={formData.subject}
                      onChange={handleInputChange}
                      isSubmitting={isSubmitting}
                      isAuthenticated={state.isAuthenticated}
                    />
                  </div>
                  <div className="form-group mb-4">
                    <FormField 
                      label="Message" 
                      name="message" 
                      rows="5" 
                      error={errors.message} 
                      value={formData.message}
                      onChange={handleInputChange}
                      isSubmitting={isSubmitting}
                      isAuthenticated={state.isAuthenticated}
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-warning btn-lg px-5 py-2 fw-semibold shadow-lg"
                    style={{ borderRadius: '50px', transition: 'all 0.3s ease', transform: 'translateY(0)' }}
                    onMouseEnter={(e) => { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxShadow = '0 15px 35px rgba(255, 193, 7, 0.4)'; }}
                    onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'; }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <style jsx="true">{`
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
          input::placeholder, textarea::placeholder { color: rgba(255, 255, 255, 0.6); }
          input, textarea { background-color: rgba(255, 255, 255, 0.05) !important; color: white !important; border: 1px solid rgba(255, 255, 255, 0.3); }
          label { color: white !important; }
          .is-invalid { border-color: #ffc107 !important; box-shadow: 0 0 5px #ffc107 !important; }
          .invalid-feedback { font-size: 0.875em; margin-top: 0.25rem; }
        `}</style>
      </div>
    );
  }

  const contactOptions = [
    { icon: <Mail size={32} />, title: "Email Support", desc: "Get help with technical issues or account questions", contact: "support@skillora.com" },
    { icon: <MessageCircle size={32} />, title: "Academic Guidance", desc: "Connect with our education counselors", contact: "academic@skillora.com" },
    { icon: <Users size={32} />, title: "Career Services", desc: "Get assistance with career planning and placement", contact: "careers@skillora.com" }
  ];

  const schedules = [
    { title: "Monday - Friday", time: "9:00 AM - 6:00 PM EST" },
    { title: "Weekend", time: "10:00 AM - 4:00 PM EST" },
    { title: "Emergency", time: "24/7 Technical Support" }
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111827", color: "white", display: "flex", flexDirection: "column", 
      alignItems: "center", justifyContent: "center", padding: "1.5rem", paddingTop: "90px" }}>
      
      <motion.h1 initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
        style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem", textAlign: "center" }}>
        Get in <span style={{ color: "#F59E0B" }}>Touch</span>
      </motion.h1>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.7 }}
        style={{ color: "#9CA3AF", marginBottom: "2rem", textAlign: "center", fontSize: "1.1rem", maxWidth: "600px" }}>
        Need help with your academic journey? Have questions about our platform? We're here to support you every step of the way.
      </motion.p>

      <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.2 } } }}
        style={{ marginBottom: "3rem", display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          maxWidth: "1024px", width: "100%" }}>
        {contactOptions.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ backgroundColor: "#1F2937", borderRadius: "1rem", padding: "2rem", textAlign: "center", border: "1px solid #374151" }}>
            <div style={{ marginBottom: "1rem", color: "#F59E0B" }}>{item.icon}</div>
            <h3 style={{ marginBottom: "1rem", color: "#F3F4F6", fontSize: "1.2rem" }}>{item.title}</h3>
            <p style={{ color: "#9CA3AF", lineHeight: "1.6", marginBottom: "1rem" }}>{item.desc}</p>
            <p style={{ color: "#F59E0B", fontWeight: "600" }}>{item.contact}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Form and Support Hours Side by Side - Now Equal Sizes */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, delay: 0.4 }}
        style={{ 
          maxWidth: "1024px", 
          width: "100%", 
          marginBottom: "3rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          alignItems: "stretch"
        }}
      >
        {/* Contact Form - Made Compact */}
        <div style={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: "1rem", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <MessageCircle size={20} style={{ color: "#F59E0B", marginRight: "0.5rem" }} />
            <h3 style={{ margin: 0, color: "#F59E0B", fontSize: "1.2rem" }}>Send Us a Message</h3>
          </div>
          <p style={{ color: "#D1D5DB", marginBottom: "1.2rem", fontSize: "0.9rem", textAlign: "center" }}>
            Quick contact form for inquiries:
          </p>
          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <FormField 
              label="Name" 
              name="name" 
              error={errors.name} 
              value={formData.name}
              onChange={handleInputChange}
              isSubmitting={isSubmitting}
              isAuthenticated={state.isAuthenticated}
            />
            <FormField 
              label="Email" 
              name="email" 
              type="email" 
              error={errors.email} 
              value={formData.email}
              onChange={handleInputChange}
              isSubmitting={isSubmitting}
              isAuthenticated={state.isAuthenticated}
            />
            <FormField 
              label="Subject" 
              name="subject" 
              error={errors.subject} 
              value={formData.subject}
              onChange={handleInputChange}
              isSubmitting={isSubmitting}
              isAuthenticated={state.isAuthenticated}
            />
            <FormField 
              label="Message" 
              name="message" 
              rows="3" 
              error={errors.message} 
              value={formData.message}
              onChange={handleInputChange}
              isSubmitting={isSubmitting}
              isAuthenticated={state.isAuthenticated}
            />
            <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
              <button 
                type="submit" 
                style={{ 
                  backgroundColor: "#F59E0B", 
                  color: "#111827", 
                  border: "none", 
                  padding: "0.6rem 1.5rem", 
                  borderRadius: "0.5rem", 
                  fontWeight: "600", 
                  fontSize: "0.9rem", 
                  cursor: "pointer", 
                  transition: "all 0.3s ease",
                  opacity: isSubmitting ? 0.7 : 1
                }}
                onMouseEnter={(e) => !isSubmitting && (e.target.style.backgroundColor = "#D97706")}
                onMouseLeave={(e) => !isSubmitting && (e.target.style.backgroundColor = "#F59E0B")}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>

        {/* Support Hours - Updated with flex to fill space */}
        <div style={{ 
          backgroundColor: "#1F2937", 
          border: "1px solid #374151", 
          borderRadius: "1rem", 
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <Clock size={20} style={{ color: "#F59E0B", marginRight: "0.5rem" }} />
            <h3 style={{ margin: 0, color: "#F59E0B", fontSize: "1.2rem" }}>Support Hours</h3>
          </div>
          <p style={{ color: "#D1D5DB", marginBottom: "1.2rem", fontSize: "0.9rem", textAlign: "center" }}>
            Our support team is available to help you:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: "1" }}>
            {schedules.map((schedule, i) => (
              <div key={i} style={{ 
                textAlign: "center", 
                padding: "1.2rem 0.8rem", 
                backgroundColor: "#111827", 
                borderRadius: "0.5rem",
                flex: "1",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center"
              }}>
                <h4 style={{ color: "#F3F4F6", fontSize: "0.9rem", marginBottom: "0.5rem", fontWeight: "600" }}>
                  {schedule.title}
                </h4>
                <p style={{ color: "#9CA3AF", fontSize: "0.8rem", margin: 0 }}>{schedule.time}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};