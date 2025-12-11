import React, { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "finfocus_prorrateo_v1";

const monedaAR = (n) =>
  (n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const parseMoneda = (s) =>
  parseFloat(
    String(s || "")
      .replace(/[^0-9,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  ) || 0;

// formateo tipo "formato números FINFOCUS"
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

export default function CalculadoraProrrateo() {
  const [capital, setCapital] = useState("");
  const [personas, setPersonas] = useState([]); // {id, nombre, monto (string formateado)}
  const [resultado, setResultado] = useState(null); // {rows, capital, totalDeudas, cobertura, remanente, faltante}
  const [autoRecalcular, setAutoRecalcular] = useState(false);
  const nextIdRef = useRef(0);

  // ---------- cargar desde localStorage ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { capital: capNum, personas: per } = JSON.parse(raw);

      if (capNum) {
        setCapital(
          capNum.toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
          })
        );
      }

      if (Array.isArray(per)) {
        const loaded = per.map((p, idx) => ({
          id: p.id ?? idx,
          nombre: p.nombre || "",
          monto:
            p.monto != null && p.monto !== ""
              ? monedaAR(p.monto)
              : "",
        }));
        setPersonas(loaded);
        const maxId = loaded.reduce((m, p) => Math.max(m, p.id), 0);
        nextIdRef.current = maxId + 1;
      }
    } catch (e) {
      console.warn("No se pudo leer estado guardado", e);
    }
  }, []);

  // ---------- guardar en localStorage ----------
  useEffect(() => {
    try {
      const capNum = parseMoneda(capital);
      const perToSave = personas
        .map((p) => ({
          id: p.id,
          nombre: p.nombre,
          monto: parseMoneda(p.monto),
        }))
        .filter((p) => p.monto > 0 || p.nombre.trim());

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ capital: capNum, personas: perToSave })
      );
    } catch (e) {
      console.warn("No se pudo guardar estado", e);
    }
  }, [capital, personas]);

  // ---------- helpers UI ----------
  const handleCapitalChange = (e) => {
    const formatted = formatMonedaInput(e.target.value);
    setCapital(formatted);
  };

  const handlePersonaNombreChange = (id, nombre) => {
    setPersonas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, nombre } : p))
    );
  };

  const handlePersonaMontoChange = (id, raw) => {
    const formatted = formatMonedaInput(raw);
    setPersonas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, monto: formatted } : p))
    );
  };

  const agregarPersona = (nombre = "", montoNum = 0) => {
    const id = nextIdRef.current++;
    setPersonas((prev) => [
      ...prev,
      {
        id,
        nombre,
        monto: montoNum ? monedaAR(montoNum) : "",
      },
    ]);
  };

  const eliminarPersona = (id) => {
    setPersonas((prev) => prev.filter((p) => p.id !== id));
  };

  // ---------- cálculo principal ----------
  const calcularProrrateo = () => {
    const capitalNum = parseMoneda(capital);
    const personasValidas = personas
      .map((p) => ({
        id: p.id,
        nombre: p.nombre.trim() || `Persona ${p.id}`,
        montoNum: parseMoneda(p.monto),
      }))
      .filter((p) => p.montoNum > 0);

    if (!capitalNum || !personasValidas.length) {
      alert("Ingresá el capital y al menos una persona.");
      return;
    }

    const totalDeudas = personasValidas.reduce(
      (acc, p) => acc + p.montoNum,
      0
    );
    const cobertura = Math.min(1, capitalNum / totalDeudas);
    const esSuficiente = capitalNum >= totalDeudas;

    const rows = personasValidas.map((p) => {
      const prorrateado = esSuficiente ? p.montoNum : p.montoNum * cobertura;
      const cubiertoPct = p.montoNum
        ? (prorrateado / p.montoNum) * 100
        : 0;
      return {
        id: p.id,
        nombre: p.nombre,
        monto: p.montoNum,
        prorrateado,
        cubiertoPct,
      };
    });

    const remanente = Math.max(0, capitalNum - totalDeudas);
    const faltante = Math.max(0, totalDeudas - capitalNum);

    setResultado({
      rows,
      capital: capitalNum,
      totalDeudas,
      cobertura,
      remanente,
      faltante,
    });
    setAutoRecalcular(true);
  };

  // auto recalcular si ya hubo un cálculo
  useEffect(() => {
    if (autoRecalcular) {
      calcularProrrateo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capital, personas]);

  // atajo Enter sobre capital o montos
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      calcularProrrateo();
    }
  };

  // ---------- render ----------
  const coberturaPct =
    resultado && (resultado.cobertura * 100).toFixed(2) + "%";

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#0f2f4b] text-center mb-1">
        </h1>
      <p className="text-sm text-gray-600 text-center mb-5">
        Distribuí un capital disponible entre varias personas respetando la
        proporción de sus créditos.
      </p>

      {/* Capital */}
      <div className="relative mt-6">
        <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-bold text-[#0f2f4b]">
          💰 Capital total disponible (ARS)
        </label>
        <input
          type="text"
          className="w-full rounded-xl border border-gray-300 px-3 py-4 text-base focus:outline-none focus:border-2 focus:border-[#0f2f4b]"
          placeholder="$ 100.000,00"
          value={capital}
          onChange={handleCapitalChange}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Personas */}
      <div className="mt-4 space-y-3">
        {personas.map((p) => (
          <div
            key={p.id}
            className="persona-row flex flex-wrap items-end gap-3"
          >
            <div className="relative flex-1 min-w-[220px]">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-bold text-[#0f2f4b]">
                👤 Nombre (opcional)
              </label>
              <input
                type="text"
                name="nombre"
                placeholder="Ej: Juan"
                className="w-full rounded-xl border border-gray-300 px-3 py-4 text-base focus:outline-none focus:border-2 focus:border-[#0f2f4b]"
                value={p.nombre}
                onChange={(e) =>
                  handlePersonaNombreChange(p.id, e.target.value)
                }
              />
            </div>
            <div className="relative flex-1 min-w-[220px]">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-bold text-[#0f2f4b]">
                💸 Monto por cobrar
              </label>
              <input
                type="text"
                name="monto"
                placeholder="$ 0,00"
                className="w-full rounded-xl border border-gray-300 px-3 py-4 text-base focus:outline-none focus:border-2 focus:border-[#0f2f4b]"
                value={p.monto}
                onChange={(e) =>
                  handlePersonaMontoChange(p.id, e.target.value)
                }
                onKeyDown={handleKeyDown}
              />
            </div>
            <button
              type="button"
              title="Quitar"
              onClick={() => eliminarPersona(p.id)}
              className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-sm hover:bg-red-100 hover:border-red-200"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Botones + chip */}
      <div className="flex flex-wrap gap-3 mt-5 items-center">
        <button
          type="button"
          className="btn bg-[#0f2f4b] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#0c243b] transform hover:-translate-y-px transition"
          onClick={() => agregarPersona()}
        >
          + Agregar persona
        </button>
        <button
          type="button"
          className="btn bg-[#0f2f4b] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#0c243b] transform hover:-translate-y-px transition"
          onClick={calcularProrrateo}
        >
          Calcular
        </button>

        {resultado && (
          <span
            className="chip inline-flex items-center gap-2 text-sm bg-[#e6f0f8] text-[#0f2f4b] px-4 py-2 rounded-full font-extrabold border border-[#0f2f4b] shadow-inner"
            aria-live="polite"
          >
            <span className="dot w-2.5 h-2.5 rounded-full bg-[#0f2f4b]" />
            Cobertura: {coberturaPct}
          </span>
        )}
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="mt-6 overflow-x-auto" id="resultado">
          <div className="overflow-x-auto">
            <table className="min-w-full mt-4 text-sm border-collapse text-center">
              <thead>
                <tr className="bg-gray-100 text-[#0f2f4b]">
                  <th className="p-2 border">Nombre</th>
                  <th className="p-2 border">Monto por cobrar</th>
                  <th className="p-2 border">Asignado</th>
                  <th className="p-2 border">% Cubierto</th>
                </tr>
              </thead>
              <tbody>
                {resultado.rows.map((p) => (
                  <tr key={p.id} className="bg-white">
                    <td className="p-2 border">{p.nombre}</td>
                    <td className="p-2 border">{monedaAR(p.monto)}</td>
                    <td className="p-2 border font-bold text-[#0f2f4b]">
                      {monedaAR(p.prorrateado)}
                    </td>
                    <td className="p-2 border">
                      {p.cubiertoPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="p-2 border">Totales</td>
                  <td className="p-2 border">
                    {monedaAR(resultado.totalDeudas)}
                  </td>
                  <td className="p-2 border">
                    {monedaAR(
                      Math.min(resultado.capital, resultado.totalDeudas)
                    )}
                  </td>
                  <td className="p-2 border">
                    {(
                      Math.min(
                        resultado.capital / resultado.totalDeudas,
                        1
                      ) * 100
                    ).toFixed(2)}
                    %
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-2 border">
                    {resultado.remanente
                      ? "Remanente de capital"
                      : "Faltante"}
                  </td>
                  <td className="p-2 border" colSpan={3}>
                    {resultado.remanente
                      ? monedaAR(resultado.remanente)
                      : monedaAR(resultado.faltante)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
