// src/components/GuiaAccidente.jsx
import React, { useMemo, useState } from "react";

const AZUL = "#0f2f4b";
const CELESTE = "#5EA6D7";

export default function GuiaAccidente() {
  const [via, setVia] = useState("adm"); // 'adm' | 'jud'
  const [completed, setCompleted] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  // ----- Visibilidad de pasos (igual lógica que el HTML original) -----
  const visibleSteps = useMemo(() => {
    const visible = [1];
    if (completed[1]) visible.push(2);
    if (completed[2]) visible.push(3);
    if (via === "adm" && completed[3]) visible.push(4);
    return visible;
  }, [completed, via]);

  // Índice del último paso visible completado, para la barra de progreso
  const lastDoneIndex = useMemo(() => {
    let idx = -1;
    visibleSteps.forEach((step, i) => {
      if (completed[step]) idx = i;
    });
    return idx;
  }, [visibleSteps, completed]);

  const showFinal = useMemo(() => {
    if (!visibleSteps.length) return false;
    const lastStep = visibleSteps[visibleSteps.length - 1];
    return completed[lastStep];
  }, [visibleSteps, completed]);

  const handleCheckStep = (step, checked) => {
    setCompleted((prev) => ({
      ...prev,
      [step]: checked,
      // si destildo un paso, todos los siguientes se “caen”
      ...(step <= 1 ? { 2: checked && prev[2], 3: checked && prev[3], 4: checked && prev[4] } : {}),
      ...(step === 2 ? { 3: checked && prev[3], 4: checked && prev[4] } : {}),
      ...(step === 3 ? { 4: checked && prev[4] } : {}),
    }));
  };

  const handleViaChange = (value) => {
    setVia(value);
    // si paso a vía judicial, el paso 4 desaparece y se desmarca
    if (value === "jud") {
      setCompleted((prev) => ({ ...prev, 4: false }));
    }
  };

  const viaText = useMemo(() => {
    if (via === "adm") {
      return (
        <>
          <b>Vía administrativa (mala liquidación):</b> actualizar hasta la fecha
          de liquidación o <i>puesta a disposición</i> (15 días corridos desde
          la notificación del dictamen,{" "}
          <a
            href="https://servicios.infoleg.gob.ar/infolegInternet/anexos/25000-29999/27971/texact.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            art. 12 inc. 2 LRT
          </a>
          ).
        </>
      );
    }
    return (
      <>
        <b>Vía judicial:</b> si se reclaman diferencias de incapacidad o no
        existe dictamen de Comisión Médica, actualizar hasta la{" "}
        <b>fecha de interposición de demanda</b>, ya sea por{" "}
        <a
          href="https://servicios.infoleg.gob.ar/infolegInternet/anexos/270000-274999/272119/norma.htm"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          tasa activa BNA (art. 11 Ley 27.348)
        </a>
        ,{" "}
        <a
          href="https://servicios.infoleg.gob.ar/infolegInternet/anexos/325000-329999/329214/norma.htm"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          variación RIPTE (DNU 669/19)
        </a>{" "}
        o{" "}
        <a
          href="https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-332-2023-386934/texto"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          suma de variaciones RIPTE ponderadas (Res. 332/23)
        </a>
        .
      </>
    );
  }, [via]);

  const textoPaso3 = useMemo(() => {
    if (via === "adm") {
      return (
        <>
          ⚠️ <b>Vía administrativa:</b> La fórmula parte de un{" "}
          <b>IBM actualizado</b> a la fecha de puesta a disposición (15 días
          corridos desde notificación del dictamen). Se recomienda comparar con
          los <b>mínimos vigentes a la fecha del accidente/PMI ajustados</b> por
          la misma variación, o con los{" "}
          <b>mínimos vigentes a la fecha de puesta a disposición</b>.
        </>
      );
    }
    return (
      <>
        ⚠️ <b>Vía judicial:</b> La fórmula parte de un{" "}
        <b>IBM actualizado</b> a la fecha de interposición de la demanda. Se
        recomienda comparar con los{" "}
        <b>mínimos vigentes a la fecha del accidente/PMI ajustados</b> por la
        misma variación, o con los{" "}
        <b>mínimos vigentes a la fecha de la demanda</b>.
      </>
    );
  }, [via]);

  const handleReiniciar = () => {
    setVia("adm");
    setCompleted({ 1: false, 2: false, 3: false, 4: false });
  };

  const dotClass = (idx) =>
    `flex-1 h-1.5 rounded-full ${
      idx <= Math.max(lastDoneIndex, 0)
        ? "bg-[#5EA6D7]"
        : "bg-slate-300"
    }`;

  const stepCardClass = (step) =>
    [
      "bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mb-3 shadow-md transition-colors",
      completed[step] ? "bg-[#d9f7e9] border-[#b6e9d1]" : "",
    ].join(" ");

  const primaryBtnClass =
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm md:text-base text-white shadow-md hover:shadow-lg transition transform hover:scale-105 focus:outline-none";
  const primaryStyle = { backgroundColor: AZUL };

  return (
    <div className="w-full max-w-3xl mx-auto text-sm md:text-[0.9rem]">
      {/* Bloque explicativo superior */}

      {/* Encabezado guía */}
      <h1
        className="text-xl md:text-2xl font-bold mb-1 text-center"
        style={{ color: AZUL }}
      >
        Guía interactiva – Indemnización LRT
      </h1>

      {/* Barra de progreso */}
      <div className="flex gap-2 my-2" aria-hidden="true">
        {visibleSteps.map((_, i) => (
          <div key={i} className={dotClass(i)} />
        ))}
      </div>

      {/* Paso 1 */}
      {visibleSteps.includes(1) && (
        <section className={stepCardClass(1)}>
          <h2 className="flex items-center gap-2 text-base md:text-lg font-semibold" style={{ color: AZUL }}>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={completed[1]}
              onChange={(e) => handleCheckStep(1, e.target.checked)}
            />
            Paso 1 — IBM inicial a la fecha de accidente/PMI
          </h2>
          <p className="mt-2 text-slate-700 text-[0.9rem]">
            Determiná el <b>Ingreso Base Mensual (IBM)</b> con el promedio de
            remuneraciones previas al accidente/PMI y actualizalo a esa fecha
            por <b>RIPTE</b> conforme el{" "}
            <a
              href="https://servicios.infoleg.gob.ar/infolegInternet/anexos/25000-29999/27971/texact.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              art. 12 inciso 1 Ley 24.557
            </a>
            .
          </p>
        </section>
      )}

      {/* Paso 2 */}
      {visibleSteps.includes(2) && (
        <section className={stepCardClass(2)}>
          <h2 className="flex items-center gap-2 text-base md:text-lg font-semibold" style={{ color: AZUL }}>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={completed[2]}
              onChange={(e) => handleCheckStep(2, e.target.checked)}
            />
            Paso 2 — Elegí la vía y definí la{" "}
            <u>fecha objetivo</u>
          </h2>
          <p className="mt-2 text-slate-700 text-[0.9rem]">
            Esta elección cambia los pasos siguientes:
          </p>
          <div
            className="mt-3 flex flex-wrap gap-3"
            role="radiogroup"
            aria-label="Vía de tramitación"
          >
            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl cursor-pointer bg-white">
              <input
                type="radio"
                name="via"
                value="adm"
                checked={via === "adm"}
                onChange={() => handleViaChange("adm")}
              />
              Vía administrativa
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl cursor-pointer bg-white">
              <input
                type="radio"
                name="via"
                value="jud"
                checked={via === "jud"}
                onChange={() => handleViaChange("jud")}
              />
              Vía judicial
            </label>
          </div>
          <p className="mt-3 text-slate-700 text-[0.9rem]">{viaText}</p>
        </section>
      )}

      {/* Paso 3 */}
      {visibleSteps.includes(3) && (
        <section className={stepCardClass(3)}>
          <h2 className="flex items-center gap-2 text-base md:text-lg font-semibold" style={{ color: AZUL }}>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={completed[3]}
              onChange={(e) => handleCheckStep(3, e.target.checked)}
            />
            Paso 3 — Calcular la indemnización y comparar mínimos
          </h2>
          <p className="mt-2 text-slate-700 text-[0.9rem]">
            Aplicá la fórmula legal (arts. 14.2.A / 14.2.B / 15.2 LRT según
            incapacidad o fallecimiento) y compará con los mínimos vigentes.
          </p>
          <div className="mt-3 rounded-xl bg-[#e7f2fb] text-[#0f2f4b] px-3 py-2 text-[0.85rem]">
            {textoPaso3}
          </div>
        </section>
      )}

      {/* Paso 4 (solo vía administrativa) */}
      {visibleSteps.includes(4) && (
        <section className={stepCardClass(4)}>
          <h2 className="flex items-center gap-2 text-base md:text-lg font-semibold" style={{ color: AZUL }}>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={completed[4]}
              onChange={(e) => handleCheckStep(4, e.target.checked)}
            />
            Paso 4 — Verificar mora y capitalización
          </h2>
          <p className="mt-2 text-slate-700 text-[0.9rem]">
            Si existió una <b>liquidación deficiente</b> y no se puso a
            disposición en término, corresponde intereses tasa activa Banco
            Nación capitalizables cada 6 meses conforme{" "}
            <a
              href="https://servicios.infoleg.gob.ar/infolegInternet/anexos/270000-274999/272119/norma.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              art. 11 Ley 27.348
            </a>{" "}
            (sustituye art. 12 LRT).
          </p>
        </section>
      )}

      {/* Cartel final animado */}
      <div
        className={`mt-5 overflow-hidden rounded-2xl border border-[#d7e6f6] bg-gradient-to-b from-[rgba(94,166,215,0.12)] to-[rgba(15,47,75,0.06)] shadow-lg flex gap-3 items-start transform transition-all duration-500 ${
          showFinal
            ? "max-h-64 opacity-100 translate-y-0 py-4 px-4"
            : "max-h-0 opacity-0 -translate-y-1 py-0 px-4"
        }`}
        aria-live="polite"
      >
        <div className="w-12 h-12 min-w-[3rem] rounded-full border border-[#dbe7f3] bg-white grid place-items-center shadow-md text-[color:#0f2f4b]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" opacity=".15" />
            <path
              d="M7 12l3 3 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[1rem] font-bold mb-1" style={{ color: AZUL }}>
            ¡Listo! Completaste la guía ✅
          </div>
          <p className="text-[0.9rem] text-slate-700 mb-2">
            Guardá el resultado o volvé al inicio para hacer un nuevo caso.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReiniciar}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 transition"
            >
              Reiniciar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
