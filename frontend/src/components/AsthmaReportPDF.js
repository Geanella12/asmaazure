import React, { useRef, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
//import CardPdf from "./pdf/cardPdf";

/*              <>
                <CardPdf />
              </>*/

const AsthmaReportPDF = ({ patient }) => {
  const reportRef = useRef();
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState(null);

  //const raw = ;
  const raw = JSON.parse(localStorage.getItem(`patientData_${user.id}`));
  /*console.log('AsthmaReportPDF - patient prop:', patient);
  console.log('AsthmaReportPDF - user.id:', user.id);
  console.log('AsthmaReportPDF - raw:', typeof raw);
  console.log('AsthmaReportPDF - raw:', raw);
  console.log('AsthmaReportPDF - prediccion:', raw.pred);
  console.log('AsthmaReportPDF - probabilidad:', raw.proba);*/

  // Convertir base64 a Blob y crear URL de objeto

  useEffect(() => {
  if (!raw?.archivo) {
    // Si no hay archivo, limpiar url (si existiera)
    setPdfUrl(null);
    return;
  }

  let objectUrl = null;

  try {
    const base64Data = raw.archivo.includes('base64,') ? raw.archivo.split('base64,')[1] : raw.archivo;
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
    objectUrl = URL.createObjectURL(pdfBlob);
    setPdfUrl(objectUrl);
  } catch (err) {
    console.error('AsthmaReportPDF - error converting base64 to PDF Blob:', err);
    setPdfUrl(null);
  }

  // cleanup: revoke object URL cuando el componente se desmonte o cambie archivo
  return () => {
    if (objectUrl) {
      try { URL.revokeObjectURL(objectUrl); } catch (e) {}
    }
  };
}, [raw?.archivo]); // efecto se ejecuta solo cuando raw.archivo cambie


  const downloadPDF = async () => {
    /*if (!pdfUrl) {
    // Fallback: si no hay pdfUrl, puedes llamar a generatePDF() o mostrar mensaje
    generatePDF();
    return;
  }*/
  // Crear enlace temporal y forzar descarga
  const link = document.createElement('a');
  link.href = pdfUrl;
  // nombre sugerido; puedes usar patient info si existe
  const filename = `reporte-asma-${patient?.dni || 'sin-dni'}-${(patient?.paciente || 'paciente').replace(/\s+/g,'-')}.pdf`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

  const calculateAsthmaRisk = () => {
    let riskScore = raw.pred;

    if (riskScore === "Asma") return { level: "ASMA", color: "#dc3545", description: `${raw.proba} %` };
    return { level: "NO ASMA", color: "#28a745", description: `${raw.proba} %`};
  };

  const risk = calculateAsthmaRisk();

  return (
    <div className="asthma-report">
      

      <div ref={reportRef} className="report-content">
        <div className="report-header">
          <h1>Centro Médico del ASMA</h1>
          <h2>Reporte de Evaluación de Asma</h2>
          <div className="report-info">
            <p><strong>Fecha de Generación:</strong> {new Date().toLocaleDateString('es-PE')}</p>
            <p><strong>Generado por:</strong> Sistema de Gestión Médica</p>
          </div>
        </div>

        <div className="report-section">
          <h3>Predicción</h3>
            <div className="risk-level" style={{ backgroundColor: risk.color }}>
              <h4>Predicción: {risk.level}</h4>
              <p>Probabilidad de predicción: {risk.description}</p>
          </div>
        </div>

        <div className="report-section">
          <h3>Informe Médico</h3>
          <div className="diagnosis-info" style={{ height: '600px' }}>
            <iframe
              src={pdfUrl}
              title="Visor de Documento PDF"
              width="100%"
              height="100%"
              // Permite la descarga y otras acciones del vision nativo del navegador
              allowFullScreen
            >
                Tu navegador no soporta la visualización de PDF incrustados.
            </iframe>
          </div>
        </div>

        

      <div className="report-actions">
        <button onClick={downloadPDF} className="btn-primary">
          📄 Descargar PDF
        </button>
      </div>

        <div className="report-footer">
          <p><strong>Nota:</strong> Este reporte es generado automáticamente basado en la información proporcionada por el paciente. Para un diagnóstico preciso, se recomienda una evaluación médica presencial.</p>
          <p><strong>Centro Médico del ASMA</strong> - Sistema de Gestión Médica</p>
        </div>
      </div>
    </div>
  );
};

export default AsthmaReportPDF;
