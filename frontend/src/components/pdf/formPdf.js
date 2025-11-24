// src/pdf/formPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** ---- Etiquetas y helpers iguales al modal ---- */
const HIDE_KEYS = new Set([
  "id", "creado_por_dni", "distrito_cod", "indice_alergico",
  "created_at", "updated_at"
]);

const LABEL = {
  dni: "DNI",
  paciente: "Paciente",
  genero: "Género",
  annos: "Edad (años)",
  fecha_cita: "Fecha de cita",
  distrito: "Distrito",
  "humedad (%)": "Humedad (%)",
  "historial familiar de asma": "Historial familiar de asma",
  "familiares con asma": "Familiares con asma",
  "antecedentes de enfermedades respiratorias": "Antecedentes de enf. respiratorias",
  "tipo de enfermedades respiratorias": "Tipo de enf. respiratorias",
  "presencia de mascotas en el hogar": "Mascotas en el hogar",
  "cantidad de mascotas": "Cantidad de mascotas",
  "tipo de mascotas": "Tipo de mascotas",
  "exposicion a alergenos": "Exposición a alérgenos",
  "frecuencia de episodios de sibilancias": "Frecuencia de sibilancias",
  "presencia de rinitis alergica u otras alergias": "Rinitis alérgica / otras alergias",
  "frecuencia de actividad fisica": "Actividad física",
  target: "Predicción",
  probabilidad_riesgo: "Probabilidad",
  interpretacion: "Interpretación",
};

function humanize(key, value) {
  if (value === null || value === undefined || value === "") return "-";
  switch (key) {
    case "genero":
      return value === 0 || value === "0" ? "Masculino" :
             value === 1 || value === "1" ? "Femenino" : value;

    case "familiares con asma":
      if (value === 0 || value === "0") return "Ninguno";
      if (value === 1 || value === "1") return "Padre o madre";
      if (value === 2 || value === "2") return "Ambos";
      return value;

    case "tipo de enfermedades respiratorias":
      if (value === 0 || value === "0") return "Ninguna";
      if (value === 1 || value === "1") return "Una";
      if (value === 2 || value === "2") return "Ambas";
      return value;

    case "tipo de mascotas":
      if (value === 0 || value === "0") return "Ninguna";
      if (value === 1 || value === "1") return "Perro o gato";
      if (value === 2 || value === "2") return "Ambas";
      return value;

    case "frecuencia de episodios de sibilancias":
      if (value === 0 || value === "0") return "Ninguna";
      if (value === 1 || value === "1") return "Ocasional";
      if (value === 2 || value === "2") return "Frecuente";
      if (value === 3 || value === "3") return "Muy frecuente";
      return value;

    case "frecuencia de actividad fisica":
      if (value === 0 || value === "0") return "Ninguna";
      if (value === 1 || value === "1") return "Media";
      if (value === 2 || value === "2") return "Alta";
      return value;

    case "historial familiar de asma":
    case "antecedentes de enfermedades respiratorias":
    case "presencia de mascotas en el hogar":
    case "exposicion a alergenos":
    case "presencia de rinitis alergica u otras alergias":
      return value === 1 || value === "1" ? "Sí" :
             value === 0 || value === "0" ? "No" : value;

    case "probabilidad_riesgo":
      // si viene 0.998 -> 99.8%
      try {
        const n = Number(value);
        if (n <= 1 && n >= 0) return `${(n * 100).toFixed(1)}%`;
        return `${n.toFixed(1)}%`;
      } catch { return String(value); }

    case "target":
      return value === 1 || value === "1" ? "Asma" :
             value === 0 || value === "0" ? "Sin asma" : value;

    case "fecha_cita":
      return String(value).slice(0, 10);

    default:
      return value;
  }
}

// Orden recomendado (como en el modal)
const ORDER = [
  "paciente", "dni", "genero", "annos", "fecha_cita", "distrito", "humedad (%)",
  "historial familiar de asma", "familiares con asma",
  "antecedentes de enfermedades respiratorias", "tipo de enfermedades respiratorias",
  "presencia de mascotas en el hogar", "cantidad de mascotas", "tipo de mascotas",
  "exposicion a alergenos", "frecuencia de episodios de sibilancias",
  "presencia de rinitis alergica u otras alergias", "frecuencia de actividad fisica",
  "target", "probabilidad_riesgo", "interpretacion"
];

/**
 * Genera y descarga el PDF bonito del formulario
 * @param {object} detail fila completa obtenida de /api/forms/detail
 */
export function buildFormPdf(detail = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const marginX = 36;
  const startY = 56;

  // -------- Header decorativo ----------
  doc.setFillColor(37, 99, 235);              // #2563eb
  doc.roundedRect(0, 0, W, 90, 0, 0, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Centro Médico del ASMA", marginX, 36);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Reporte de Formulario del Paciente", marginX, 58);

  const fecha = String(detail.fecha_cita || "").slice(0, 10) || "-";
  const paciente = String(detail.paciente || "-");
  const dni = String(detail.dni || "-");

  // Datos clave en header derecho
  doc.setFontSize(11);
  const rightX = W - marginX;
  doc.text(`Fecha de cita: ${fecha}`, rightX, 30, { align: "right" });
  doc.text(`Paciente: ${paciente}`, rightX, 46, { align: "right" });
  doc.text(`DNI: ${dni}`, rightX, 62, { align: "right" });

  // -------- Título de sección ----------
  let y = startY + 54;
  doc.setTextColor(28, 30, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Detalle del formulario", marginX, y);
  y += 10;

  // -------- Data -> construir pares en 4 columnas (label|value|label|value) ----------
  const keysOrdered = [
    ...ORDER.filter((k) => detail.hasOwnProperty(k) && !HIDE_KEYS.has(k)),
    ...Object.keys(detail).filter((k) => !ORDER.includes(k) && !HIDE_KEYS.has(k)),
  ];

  // Convertimos a pares
  const pairs = keysOrdered.map((k) => ({
    label: LABEL[k] || k,
    value: humanize(k, detail[k]),
  }));

  // Unimos 2 pares por fila de tabla
  const body = [];
  for (let i = 0; i < pairs.length; i += 2) {
    const p1 = pairs[i];
    const p2 = pairs[i + 1];
    body.push([
      { content: p1.label, styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
      String(p1.value),
      p2
        ? { content: p2.label, styles: { fontStyle: "bold", textColor: [100, 116, 139] } }
        : "",
      p2 ? String(p2.value) : "",
    ]);
  }

  autoTable(doc, {
    startY: y + 8,
    head: [[
      { content: "Campo", styles: { halign: "left" } },
      { content: "Valor", styles: { halign: "left" } },
      { content: "Campo", styles: { halign: "left" } },
      { content: "Valor", styles: { halign: "left" } },
    ]],
    body,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 11,
      lineColor: [229, 231, 235],
      lineWidth: 0.6,
      cellPadding: 6,
      valign: "middle",
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      lineWidth: 0.8,
    },
    alternateRowStyles: { fillColor: [252, 253, 255] },
    theme: "grid",
  });

  // -------- Nota final ----------
  const finalY = doc.lastAutoTable.finalY + 18;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Este reporte resume la información ingresada en el formulario junto con la predicción del modelo.",
    marginX,
    finalY
  );

  // -------- Footer con numeración ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Página ${i} de ${pageCount}`, w - marginX, h - 16, { align: "right" });
  }

  // -------- Guardar ----------
  const filename = `Formulario_${paciente.replace(/\s+/g, "_")}_${dni}_${fecha}.pdf`;
  doc.save(filename);
}
