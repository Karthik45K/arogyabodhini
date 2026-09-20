import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../../styles/registration.css';
import { useToast } from '../../../components/Shared/Toast.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function DoctorRegistration() {
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', password: '',
    specialty: '', experienceYears: '', clinicName: '',
    registrationNumber: '', address: '', consultationFee: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/doctors/register`, formData);
      setSubmitted(true);
      showToast('Application submitted successfully!', 'success');
    } catch (err) {
      showToast('Failed to submit application: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  if (submitted) {
    return (
      <div className="reg-root">
        <div className="reg-container reg-success">
          <h2>Application Submitted!</h2>
          <p>Your application has been received and is pending admin approval. You will receive an email once approved.</p>
          <button className="reg-success-btn" onClick={() => navigate('/')}>Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reg-root">
      <div className="reg-container">
        <div className="reg-header">
          <h2>Doctor Registration</h2>
          <p>Join the Arogyabodhini network and help patients across regions.</p>
        </div>
        <div className="reg-body">
          <form className="reg-form-grid" onSubmit={handleSubmit}>
            <div className="reg-form-group">
              <label>Full Name</label>
              <input className="reg-input" type="text" name="fullName" placeholder="Dr. John Doe" onChange={handleChange} required />
            </div>
            <div className="reg-form-group">
              <label>Email Address</label>
              <input className="reg-input" type="email" name="email" placeholder="doctor@example.com" onChange={handleChange} required />
            </div>
            <div className="reg-form-group">
              <label>Phone Number</label>
              <input className="reg-input" type="tel" name="phone" placeholder="+91 9876543210" onChange={handleChange} required />
            </div>
            <div className="reg-form-group">
              <label>Password</label>
              <input className="reg-input" type="password" name="password" placeholder="Secure Password" onChange={handleChange} required />
            </div>
            <div className="reg-form-group">
              <label>Specialty</label>
              <input className="reg-input" type="text" name="specialty" placeholder="e.g. Cardiologist" onChange={handleChange} required />
            </div>
            <div className="reg-form-group">
              <label>Years of Experience</label>
              <input className="reg-input" type="number" name="experienceYears" placeholder="e.g. 5" onChange={handleChange} required />
            </div>
            <div className="reg-form-group">
              <label>Clinic/Hospital Name</label>
              <input className="reg-input" type="text" name="clinicName" placeholder="City Hospital" onChange={handleChange} required />
            </div>
            <div className="reg-form-group">
              <label>Registration Number</label>
              <input className="reg-input" type="text" name="registrationNumber" placeholder="Medical License No." onChange={handleChange} required />
            </div>
            <div className="reg-form-group full-width">
              <label>Clinic Address</label>
              <textarea className="reg-input" name="address" placeholder="Full address of the clinic" onChange={handleChange} required></textarea>
            </div>
            <div className="reg-form-group full-width">
              <label>Consultation Fee (in INR)</label>
              <input className="reg-input" type="number" name="consultationFee" placeholder="e.g. 500" onChange={handleChange} required />
            </div>
            <button className="reg-btn" type="submit">Submit Application</button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ color: '#666', fontSize: '0.9rem' }}>Already approved? </span>
            <button onClick={() => navigate('/doctor')} style={{ background: 'none', border: 'none', color: '#1565c0', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}>Login here</button>
          </div>
        </div>
      </div>
    </div>
  );
}
