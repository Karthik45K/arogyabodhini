import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './AppRouter.jsx';
import './styles/index.css';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { PatientProvider } from './patient/context/PatientContext.jsx';
import { DoctorProvider } from './doctor/context/DoctorContext.jsx';
import { ToastProvider } from './components/Shared/Toast.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <LanguageProvider>
          <PatientProvider>
            <DoctorProvider>
              <AppRouter />
            </DoctorProvider>
          </PatientProvider>
        </LanguageProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
