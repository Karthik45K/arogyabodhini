# Arogyabodhini Architecture

## Monorepo Layout
- `frontend/`: React + Vite SPA. Contains all UI, routing, state, and API services.
- `backend/`: Node + Express + MongoDB REST API.
- `docs/`: Technical documentation.
- `shared/`: Shared models/types (placeholder).

## Frontend Architecture
- **React Router**: Client-side routing for `/patient`, `/doctor`, `/admin`.
- **Context API**: Handles `DoctorProvider`, `PatientProvider`, `LanguageProvider`.
- **Axios**: API interactions.

## Backend Architecture
- **Express App**: Handles CORS, JSON parsing, error boundaries.
- **Mongoose Models**: 
  - `Patient`, `Doctor`, `Consultation`, `Admin`, `DoctorApplication`
- **JWT Auth**: Role-based access control.

