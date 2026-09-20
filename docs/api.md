# API Reference

## Admin Routes
- `POST /api/auth/admin/login`: Login admin (returns JWT).
- `GET /api/admin/dashboard`: Fetch platform statistics.
- `GET /api/admin/doctor-applications`: List all doctor registrations.
- `POST /api/admin/doctor-applications/:id/approve`: Approve a doctor.
- `POST /api/admin/doctor-applications/:id/reject`: Reject a doctor.

## Doctor Routes
- `POST /api/doctors/register`: Submit a doctor registration.
- `POST /api/doctor-auth/login`: Doctor login.
- `GET /api/doctor-auth/me`: Get current doctor profile.

## Patient Routes
- `POST /api/patient-auth/login`: Patient login.
- `POST /api/patient-auth/register`: Patient registration.
- `POST /api/symptoms/analyze`: Analyze symptoms via AI.

## Consultation Routes
- `POST /api/consultations`: Book/Request a consultation.
- `GET /api/consultations/patient/:patientId`: Patient's requests.
- `GET /api/consultations/doctor/:doctorId`: Doctor's queue.
