// src/components/doctor/DoctorDashboard.js
import React from "react";
import DoctorPatientForms from "./DoctorPatientForms";

export default function DoctorDashboard() {
  return (
    <div className="container">
      <h2>Panel del Médico</h2>
      <DoctorPatientForms />
    </div>
  );
}
