import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import PatientApp from './App';
import DoctorApp from './DoctorApp';
import AdminApp from './AdminApp';
import DoctorRegistration from './doctor/components/DoctorRegistration/DoctorRegistration';
import Navbar from './components/Navbar/Navbar';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      
      {/* Hero Section */}
      <main style={{ flex: 1 }}>
        <section style={{ padding: '80px 24px', textAlign: 'center', background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)', color: 'white' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '24px', lineHeight: 1.2 }}>
              AI-Powered Multilingual Healthcare for Every Citizen
            </h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '40px' }}>
              Voice-first symptom triage in Indian languages, connected directly to certified medical practitioners via HD video.
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/patient')} style={{ padding: '16px 32px', fontSize: '1.1rem', background: '#4caf50', color: 'white', borderRadius: '8px', fontWeight: 700, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                Check Symptoms with AI
              </button>
              <button onClick={() => navigate('/doctor')} style={{ padding: '16px 32px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '8px', fontWeight: 700 }}>
                Doctor Consultation Portal
              </button>
            </div>
            
            <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', opacity: 0.8, fontSize: '0.9rem', fontWeight: 600 }}>
              <span>✓ 15+ Languages</span>
              <span>✓ Verified Specialists</span>
              <span>✓ Encrypted Video</span>
              <span>✓ Govt Health Compliant</span>
            </div>
          </div>
        </section>

        {/* Portal Gateway */}
        <section style={{ padding: '80px 24px', maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '48px', color: '#0f172a' }}>Select Your Portal</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div onClick={() => navigate('/patient')} style={{ cursor: 'pointer', background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', transition: 'transform 0.2s' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧑🏽‍⚕️</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>Patient Care Portal</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Voice symptom assessment, AI disease prediction, and instant doctor appointment & video consultation.</p>
            </div>
            <div onClick={() => navigate('/doctor')} style={{ cursor: 'pointer', background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', transition: 'transform 0.2s' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🩺</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>Doctor Workstation</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Dedicated clinical portal to review queues, start video consultations, and issue digital prescriptions.</p>
            </div>
            <div onClick={() => navigate('/doctor/register')} style={{ cursor: 'pointer', background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', transition: 'transform 0.2s' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>Doctor Onboarding</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Streamlined onboarding registration form for doctors to apply with credentials and license.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Enterprise Footer */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '60px 24px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '40px' }}>
          <div>
            <h4 style={{ color: 'white', marginBottom: '16px', fontWeight: 600 }}>Platform</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><button onClick={() => navigate('/patient')} style={{ color: '#94a3b8' }}>AI Symptom Checker</button></li>
              <li><button onClick={() => navigate('/patient')} style={{ color: '#94a3b8' }}>Video Consultation</button></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'white', marginBottom: '16px', fontWeight: 600 }}>Professionals</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><button onClick={() => navigate('/doctor')} style={{ color: '#94a3b8' }}>Doctor Login</button></li>
              <li><button onClick={() => navigate('/doctor/register')} style={{ color: '#94a3b8' }}>Register Practice</button></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'white', marginBottom: '16px', fontWeight: 600 }}>Governance</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><button style={{ color: '#94a3b8' }}>Privacy Policy</button></li>
              <li><button onClick={() => navigate('/admin')} style={{ color: '#94a3b8' }}>Admin Console</button></li>
            </ul>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '24px', textAlign: 'center', fontSize: '0.85rem' }}>
          <p style={{ color: '#ef4444', fontWeight: 700, marginBottom: '12px' }}>
            ⚠️ Arogyabodhini is an assistive telemedicine tool. In case of life-threatening emergencies, please dial 112 or visit the nearest emergency room immediately.
          </p>
          <p>© 2026 Arogyabodhini Healthcare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/patient/*" element={<PatientApp />} />
      <Route path="/doctor/register" element={<DoctorRegistration />} />
      <Route path="/doctor/*" element={<DoctorApp />} />
      <Route path="/admin/*" element={<AdminApp />} />
    </Routes>
  );
}
