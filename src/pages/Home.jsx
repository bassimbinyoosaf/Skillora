import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/signup'); // This goes to signup for new users
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-vh-100 position-relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      paddingTop: '80px', // Safe space for navbar
    }}>
      {/* Animated background elements */}
      <div className="position-absolute w-100 h-100" style={{
        background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
        animation: 'float 6s ease-in-out infinite'
      }}></div>

      {/* Hero Section */}
      <section className="position-relative pt-4 pb-5">
        <div className="container py-5">
          <div className="row justify-content-center text-center">
            <div className="col-lg-8">
              <h1 className="display-3 fw-bold text-white mb-4 lh-1" style={{
                textShadow: '0 10px 30px rgba(0,0,0,0.3)',
                animation: 'fadeInUp 1s ease-out'
              }}>
                Track Your Academic &<br />
                <span className="text-warning">Career Progress</span> with Ease
              </h1>
              <p className="fs-4 text-white-50 mb-5 mx-auto" style={{
                maxWidth: '600px',
                animation: 'fadeInUp 1s ease-out 0.2s both'
              }}>
                Stay updated on your goals, internships, placements, and more—all in one intuitive platform.
              </p>
              <div className="d-flex gap-4 justify-content-center flex-wrap" style={{
                animation: 'fadeInUp 1s ease-out 0.4s both'
              }}>
                <button
                  className="btn btn-warning btn-lg px-5 py-3 fw-semibold shadow-lg"
                  onClick={handleGetStarted}
                  style={{
                    borderRadius: '50px',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-3px)';
                    e.target.style.boxShadow = '0 15px 35px rgba(255, 193, 7, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                  }}
                >
                  Get Started
                </button>
                <button
                  className="btn btn-outline-light btn-lg px-5 py-3 fw-semibold"
                  onClick={handleLogin}
                  style={{
                    borderRadius: '50px',
                    borderWidth: '2px',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-3px)';
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        body {
          margin: 0;
          padding: 0;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        /* Responsive padding adjustments */
        @media (max-width: 768px) {
          .min-vh-100 {
            padding-top: 70px !important;
          }
        }

        @media (max-width: 576px) {
          .min-vh-100 {
            padding-top: 60px !important;
          }
        }
      `}</style>
    </div>
  );
};