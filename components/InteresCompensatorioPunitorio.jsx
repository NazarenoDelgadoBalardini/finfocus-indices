import React, { useRef, useState } from "react";

const AZUL = "#0f2f4b";

// ====== Helpers de formato ======
const formatMonedaInput = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const numero = parseFloat(digits) / 100;
  if (isNaN(numero)) return "";
  return numero.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });
};

const parseCurrency = (value) => {
  if (!value) return 0;
  const numericString = String(value)
    .replace(/[^\d,]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(numericString) || 0;
};

const formatCurrencyValue = (value) =>
  value
    .toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace("ARS", "")
    .trim();

const formatPercentValue = (value) =>
  value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "%";

// ====== Componente principal ======
export default function CalculadoraInteresAnual() {
  const [monto, setMonto] = useState("");
  const [periodos, setPeriodos] = useState([
    { id: 0, fechaInicio: "", fechaFin: "", tasa: "" },
  ]);
  const [resultado, setResultado] = useState(null); // null | {monto, totalInteres, tasaEfectiva, total, detalles[]}
  const printRef = useRef(null);
  const nextIdRef = useRef(1);

  // Cargar html2pdf desde CDN (si no existe todavía)


  // ====== Handlers inputs ======
  const handleMontoChange = (e) => {
    setMonto(formatMonedaInput(e.target.value));
  };

  const handlePeriodoChange = (id, field, value) => {
    setPeriodos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]:
                field === "tasa"
                  ? formatPorcentajeInput(value)
                  : value,
            }
          : p
      )
    );
  };

  const agregarPeriodo = () => {
    const id = nextIdRef.current++;
    setPeriodos((prev) => [
      ...prev,
      { id, fechaInicio: "", fechaFin: "", tasa: "" },
    ]);
  };

  // igual que formatearPorcentaje() de tu HTML
  const formatPorcentajeInput = (raw) => {
    const soloDigitos = String(raw || "").replace(/\D/g, "");
    if (!soloDigitos) return "";
    const numero = parseFloat(soloDigitos) / 100;
    return (
      numero.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + "%"
    );
  };

  // ====== Cálculo principal ======
  const calcularInteres = () => {
    const capitalNum = parseCurrency(monto);
    if (capitalNum <= 0) {
      alert("Por favor, ingrese un monto válido.");
      return;
    }

    if (!periodos.length) {
      alert("Por favor, ingrese al menos un período.");
      return;
    }

    let totalInteres = 0;
    const detalles = [];
    let huboError = false;

    for (let i = 0; i < periodos.length; i++) {
      const p = periodos[i];
      const idx = i + 1;

      if (!p.fechaInicio || !p.fechaFin) {
        alert(`Complete las fechas para el período ${idx}`);
        huboError = true;
        break;
      }

      const inicio = new Date(p.fechaInicio);
      const fin = new Date(p.fechaFin);

      if (fin < inicio) {
        alert(
          `En el período ${idx}, la fecha fin debe ser posterior a la fecha de inicio.`
        );
        huboError = true;
        break;
      }

      const dias = Math.ceil(
        (fin - inicio) / (1000 * 60 * 60 * 24)
      );

      const tasaAnual = parseCurrency(p.tasa);
      if (tasaAnual <= 0) {
        alert(
          `En el período ${idx}, ingrese una tasa de interés válida.`
        );
        huboError = true;
        break;
      }

      const interesPeriodo =
        capitalNum * (tasaAnual / 100) * (dias / 365);

      totalInteres += interesPeriodo;

      detalles.push({
        periodo: idx,
        inicio,
        fin,
        dias,
        tasaAnual,
        interesPeriodo,
      });
    }

    if (huboError) return;

    const tasaEfectiva = (totalInteres / capitalNum) * 100;
    const total = capitalNum + totalInteres;

    setResultado({
      monto: capitalNum,
      totalInteres,
      tasaEfectiva,
      total,
      detalles,
    });
  };

return (
  <div
    ref={printRef}
    id="printableArea"
    style={{
      minHeight: "100vh",
      padding: "24px 12px",
      boxSizing: "border-box",
    }}
  >
    {/* === BLOQUE PRINCIPAL HERO FINFOCUS === */}
    <div
      className="container"
      style={{
        maxWidth: 720,
        margin: "0 auto 20px auto",
        borderRadius: 24,
        padding: 2,
        background:
          "linear-gradient(135deg,#0f2f4b 0%,#173d5f 40%,#5EA6D7 100%)",
        boxShadow: "0 18px 45px rgba(15,47,75,0.35)",
      }}
    >
      {/* Card interna (blanca, donde van los inputs) */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: 24,
        }}
      >
        {/* Título HERO dentro del bloque */}
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 800,
            color: "#0f2f4b",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "#475569",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Ingresá un capital y uno o varios períodos con su tasa anual
          para conocer el interés total y la tasa efectiva del tramo
          completo.
        </p>

        {/* === CAPITAL === */}
        <div className="input-group" style={{ position: "relative", marginTop: 20 }}>
          <label
            htmlFor="monto"
            style={{
              position: "absolute",
              top: -10,
              left: 12,
              backgroundColor: "#fff",
              padding: "0 6px",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: AZUL,
            }}
          >
            Monto (Capital)
          </label>

          <input
            id="monto"
            type="text"
            placeholder="$ 0,00"
            value={monto}
            onChange={handleMontoChange}
            style={{
              width: "100%",
              padding: "16px 12px 12px",
              border: "1px solid #ccc",
              borderRadius: 8,
              fontSize: "1rem",
              transition: "border-color 0.3s",
            }}
          />
        </div>

        {/* === PERÍODOS === */}
        <div id="periodos" style={{ marginTop: 10 }}>
          {periodos.map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px dashed #ccc",
                padding: 10,
                marginBottom: 10,
                borderRadius: 6,
              }}
            >
              {/* Fecha inicio */}
              <div className="input-group" style={{ position: "relative", marginTop: 10 }}>
                <label
                  style={{
                    position: "absolute",
                    top: -10,
                    left: 12,
                    backgroundColor: "#fff",
                    padding: "0 6px",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: AZUL,
                  }}
                >
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={p.fechaInicio}
                  onChange={(e) =>
                    handlePeriodoChange(p.id, "fechaInicio", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "16px 12px 12px",
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    fontSize: "1rem",
                  }}
                />
              </div>

              {/* Fecha fin */}
              <div className="input-group" style={{ position: "relative", marginTop: 10 }}>
                <label
                  style={{
                    position: "absolute",
                    top: -10,
                    left: 12,
                    backgroundColor: "#fff",
                    padding: "0 6px",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: AZUL,
                  }}
                >
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={p.fechaFin}
                  onChange={(e) =>
                    handlePeriodoChange(p.id, "fechaFin", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "16px 12px 12px",
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    fontSize: "1rem",
                  }}
                />
              </div>

              {/* Tasa */}
              <div className="input-group" style={{ position: "relative", marginTop: 10 }}>
                <label
                  style={{
                    position: "absolute",
                    top: -10,
                    left: 12,
                    backgroundColor: "#fff",
                    padding: "0 6px",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: AZUL,
                  }}
                >
                  Tasa de interés anual
                </label>
                <input
                  type="text"
                  value={p.tasa}
                  onChange={(e) =>
                    handlePeriodoChange(p.id, "tasa", e.target.value)
                  }
                  placeholder="0,00%"
                  style={{
                    width: "100%",
                    padding: "16px 12px 12px",
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    fontSize: "1rem",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Botones */}
        <button
          type="button"
          onClick={agregarPeriodo}
          style={{
            padding: "10px 20px",
            borderRadius: 6,
            background: AZUL,
            color: "#fff",
            marginRight: 8,
            marginTop: 10,
          }}
        >
          Agregar período
        </button>

        <button
          type="button"
          onClick={calcularInteres}
          style={{
            padding: "10px 20px",
            borderRadius: 6,
            background: AZUL,
            color: "#fff",
            marginTop: 10,
          }}
        >
          Calcular interés
        </button>
      </div>
    </div>

    {/* === RESULTADO === */}
    {resultado && (
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto 20px auto",
          borderRadius: 24,
          padding: 2,
          background:
            "linear-gradient(135deg,#0f2f4b 0%,#173d5f 40%,#5EA6D7 100%)",
          boxShadow: "0 18px 45px rgba(15,47,75,0.35)",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: 24,
          }}
        >
          {/* tus textos de resultado */}
          <p>
            Capital: <strong>{formatCurrencyValue(resultado.monto)}</strong>
          </p>
          <p>
            Intereses: <strong>{formatCurrencyValue(resultado.totalInteres)}</strong>
          </p>
          <p>
            Tasa efectiva: <strong>{formatPercentValue(resultado.tasaEfectiva)}</strong>
          </p>
          <p
            style={{
              marginTop: 15,
              fontWeight: 700,
              paddingTop: 10,
              borderTop: "1px solid #eee",
            }}
          >
            Total actualizado:{" "}
            <strong>{formatCurrencyValue(resultado.total)}</strong>
          </p>

          {/* Detalle por período */}
          {resultado.detalles.map((d) => (
            <div
              key={d.periodo}
              style={{
                marginTop: 15,
                padding: 10,
                background: "#f8f9fa",
                borderRadius: 6,
              }}
            >
              <strong>Período {d.periodo}:</strong>
              <p>
                {d.inicio.toLocaleDateString("es-AR")} →{" "}
                {d.fin.toLocaleDateString("es-AR")}
              </p>
              <p>Días: {d.dias}</p>
              <p>Tasa: {formatPercentValue(d.tasaAnual)}</p>
              <p>
                Interés: {formatCurrencyValue(d.interesPeriodo)}
              </p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
}
