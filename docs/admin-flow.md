# Admin Workflow & Doctor Registration

## Doctor Registration Process
1. **Submission**: Doctors visit `/doctor/register` and submit their details (qualifications, fee, etc.).
2. **Pending State**: The application is stored in the `DoctorApplication` MongoDB collection with `status: 'pending'`. The account is NOT active.
3. **Review**: Admin logs into `/admin/login` and visits the Dashboard.
4. **Approval**: Admin reviews the application. If Approved, a new `Doctor` record is created, and the application status changes to `approved`.
5. **Rejection**: If Rejected, the application status changes to `rejected` with an optional rejection reason.

## Admin Dashboard
The dashboard provides an overview of platform health:
- Total registered doctors.
- Number of pending, approved, and rejected applications.
- Visual charts mapping the current application statuses.
