/**
 * doctorAccounts.js
 * Mock authentication accounts for doctor login.
 * Each account maps to a doctor in doctors.js by ID.
 * Replace with real API auth in production.
 */

export const DOCTOR_ACCOUNTS = [
  {
    id: 'doc-001', email: 'priya.sharma@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Priya Sharma', spec: 'Cardiologist', regNo: 'MCI-KA-2013-45672',
    hospital: 'Apollo Hospital, Bangalore', initials: 'PS', bgColor: '#1565c0',
  },
  {
    id: 'doc-002', email: 'arjun.mehta@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Arjun Mehta', spec: 'Cardiologist', regNo: 'MCI-TN-2006-38821',
    hospital: 'Fortis Hospital, Chennai', initials: 'AM', bgColor: '#3b82f6',
  },
  {
    id: 'doc-003', email: 'rajesh.kumar@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Rajesh Kumar', spec: 'Neurologist', regNo: 'MCI-TN-2011-38821',
    hospital: 'Manipal Hospital, Chennai', initials: 'RK', bgColor: '#6a1b9a',
  },
  {
    id: 'doc-004', email: 'kavitha.nair@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Kavitha Nair', spec: 'Neurologist', regNo: 'MCI-KA-2015-19876',
    hospital: 'NIMHANS, Bangalore', initials: 'KN', bgColor: '#a78bfa',
  },
  {
    id: 'doc-005', email: 'ananya.reddy@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Ananya Reddy', spec: 'General Physician', regNo: 'MCI-AP-2016-22109',
    hospital: 'Fortis Hospital, Hyderabad', initials: 'AR', bgColor: '#2e7d32',
  },
  {
    id: 'doc-006', email: 'suresh.babu@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Suresh Babu', spec: 'General Physician', regNo: 'MCI-TS-2010-51234',
    hospital: 'Care Hospital, Hyderabad', initials: 'SB', bgColor: '#34d399',
  },
  {
    id: 'doc-007', email: 'meena.krishnamurthy@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Meena Krishnamurthy', spec: 'Gastroenterologist', regNo: 'MCI-TN-2012-19876',
    hospital: 'Gleneagles Hospital, Chennai', initials: 'MK', bgColor: '#f59e0b',
  },
  {
    id: 'doc-008', email: 'vikram.singh@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Vikram Singh', spec: 'Orthopedic Surgeon', regNo: 'MCI-DL-2009-33210',
    hospital: 'Max Hospital, Delhi', initials: 'VS', bgColor: '#ef4444',
  },
  {
    id: 'doc-009', email: 'deepa.rao@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Deepa Rao', spec: 'Dermatologist', regNo: 'MCI-KA-2014-41522',
    hospital: 'Columbia Asia Hospital, Bangalore', initials: 'DR', bgColor: '#ec4899',
  },
  {
    id: 'doc-010', email: 'ramesh.iyer@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Ramesh Iyer', spec: 'Pulmonologist', regNo: 'MCI-TS-2008-18901',
    hospital: 'KIMS Hospital, Hyderabad', initials: 'RI', bgColor: '#0ea5e9',
  },
  {
    id: 'doc-011', email: 'shalini.menon@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Shalini Menon', spec: 'ENT Specialist', regNo: 'MCI-KL-2013-26711',
    hospital: 'Amrita Hospital, Kochi', initials: 'SM', bgColor: '#14b8a6',
  },
  {
    id: 'doc-012', email: 'anjali.desai@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Anjali Desai', spec: 'Psychiatrist', regNo: 'MCI-MH-2011-34219',
    hospital: 'Nimhans Affiliated, Mumbai', initials: 'AD', bgColor: '#f97316',
  },
  {
    id: 'doc-013', email: 'naresh.patel@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Naresh Patel', spec: 'Endocrinologist', regNo: 'MCI-GJ-2010-22813',
    hospital: 'Zydus Hospital, Ahmedabad', initials: 'NP', bgColor: '#6366f1',
  },
  {
    id: 'doc-014', email: 'lakshmi.nambiar@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Lakshmi Nambiar', spec: 'Ophthalmologist', regNo: 'MCI-TN-2014-19514',
    hospital: 'Aravind Eye Hospital, Madurai', initials: 'LN', bgColor: '#0891b2',
  },
  {
    id: 'doc-015', email: 'preethi.sundar@arogyabodhini.com', password: 'Doctor@123',
    name: 'Dr. Preethi Sundar', spec: 'Urologist', regNo: 'MCI-TN-2012-17615',
    hospital: 'Sri Ramachandra Hospital, Chennai', initials: 'PS', bgColor: '#7c3aed',
  },
]

export function getDemoCredentials() {
  return { email: DOCTOR_ACCOUNTS[0].email, password: DOCTOR_ACCOUNTS[0].password }
}

export default DOCTOR_ACCOUNTS
