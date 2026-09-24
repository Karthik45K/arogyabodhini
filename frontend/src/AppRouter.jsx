import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PatientApp from './App';
import DoctorApp from './DoctorApp';
import AdminApp from './AdminApp';
import DoctorRegistration from './doctor/components/DoctorRegistration/DoctorRegistration';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<PatientApp />} />
      <Route path="/patient/*" element={<PatientApp />} />
      <Route path="/doctor/register" element={<DoctorRegistration />} />
      <Route path="/doctor/*" element={<DoctorApp />} />
      <Route path="/admin/*" element={<AdminApp />} />
    </Routes>
  );
}
