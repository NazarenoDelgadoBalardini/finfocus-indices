// src/components/TotalADepositar.jsx
import React, { useState } from 'react';

const AZUL = '#0f2f4b';

// ===== Helpers de formato (igual lógica que en tu HTML) =====

function formatCurrencyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  if (isNaN(num)) return '';
  return num.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
}

function formatPercentInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const num = parseFloat(digits) / 100;
  if (isNaN(num)) return '';
  return num.toFixed(2).replace('.', ',') + '%';
}

function parseMoney(str) {
  if (!str) return 0;
  return (
    parseFloat(
      String(str)
        .replace(/\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.')
    ) || 0
  );
}

function parsePercentage(str) {
  if (!str) return 0;
  const val = String(str).replace(/\D/g, '');
  const num = parseFloat(val) / 100;
  return isNaN(num) ? 0 : num;
}

function formatMoney(num) {
  return (
    '$' +
    new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num || 0)
  );
}

// ===== Cálculo principal =====

function calcularTotales(actores, abogados, peritos) {
  let sumAct = actores.reduce((s, a) => s + parseMoney(a.monto), 0);

  const abogadosCalc = abogados.map((d) => {
    const base = parseMoney(d.base);
    const costasPct = parsePercentage(d.costas); // ej "50,00%" => 50
    const honor = base * (costasPct / 100);
    const iva = d.responsableInscripto ? honor * 0.21 : 0;
    const aportePct = parsePercentage(d.aporte); // ej "10,00%"
    const aporte = honor * (aportePct / 100);
    const total = honor + iva + aporte;
    return {
      ...d,
      honor,
      iva,
      aporte,
      total,
    };
  });

  const peritosCalc = peritos.map((d) => {
    const base = parseMoney(d.base);
    const costasPct = parsePercentage(d.costas);
    const honor = base * (costasPct / 100);
    const iva = d.responsableInscripto ? honor * 0.21 : 0;
    const aportePct = parsePercentage(d.aporte); // puede ser 0,00%
    const aporte = honor * (aportePct / 100);
    const total = honor + iva + aporte;
    return {
      ...d,
      honor,
      iva,
      aporte,
      total,
    };
  });

  const sumProf =
    abogadosCalc.reduce((s, o) => s + o.total, 0) +
    peritosCalc.reduce((s, o) => s + o.total, 0);

  const total = sumAct + sumProf;

  return {
    sumAct,
    sumProf,
    total,
    abogadosCalc,
    peritosCalc,
  };
}

// ===== Componente principal =====

export default function OrdenesDePagoSimple() {
  const [actores, setActores] = useState([
    { nombre: '', monto: '$0,00' },
  ]);
  const [abogados, setAbogados] = useState([
    {
      nombre: '',
      base: '$0,00',
      costas: '0,00%',
      responsableInscripto: true,
      aporte: '10,00%',
    },
  ]);
  const [peritos, setPeritos] = useState([
    {
      nombre: '',
      base: '$0,00',
      costas: '0,00%',
      responsableInscripto: true,
      aporte: '0,00%',
    },
  ]);

  const [resultado, setResultado] = useState(null);

  // ===== Handlers de cambio =====

  const handleActorChange = (index, field, value) => {
    setActores((prev) =>
      prev.map((a, i) =>
        i === index
          ? {
              ...a,
              [field]:
                field === 'monto'
                  ? formatCurrencyInput(value)
                  : value,
            }
          : a
      )
    );
  };

  const handleAbogadoChange = (index, field, value) => {
    setAbogados((prev) =>
      prev.map((a, i) =>
        i === index
          ? {
              ...a,
              [field]:
                field === 'base'
                  ? formatCurrencyInput(value)
                  : field === 'costas' || field === 'aporte'
                  ? formatPercentInput(value)
                  : value,
            }
          : a
      )
    );
  };

  const handlePeritoChange = (index, field, value) => {
    setPeritos((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              [field]:
                field === 'base'
                  ? formatCurrencyInput(value)
                  : field === 'costas' || field === 'aporte'
                  ? formatPercentInput(value)
                  : value,
            }
          : p
      )
    );
  };

  const addActor = () => {
    setActores((prev) => [
      ...prev,
      { nombre: '', monto: '$0,00' },
    ]);
  };

  const addAbogado = () => {
    setAbogados((prev) => [
      ...prev,
      {
        nombre: '',
        base: '$0,00',
        costas: '0,00%',
        responsableInscripto: true,
        aporte: '10,00%',
      },
    ]);
  };

  const addPerito = () => {
    setPeritos((prev) => [
      ...prev,
      {
        nombre: '',
        base: '$0,00',
        costas: '0,00%',
        responsableInscripto: true,
        aporte: '0,00%',
      },
    ]);
  };

  const removeActor = (index) => {
    setActores((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAbogado = (index) => {
    setAbogados((prev) => prev.filter((_, i) => i !== index));
  };

  const removePerito = (index) => {
    setPeritos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCalcular = () => {
    const res = calcularTotales(actores, abogados, peritos);
    setResultado(res);
  };

  // ===== UI =====

  return (
    <div className="min-h-screen bg-slate-50 text-[#0f2f4b]">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Título */}
        <h1 className="text-center text-2xl md:text-3xl font-semibold mb-6">
        </h1>

        {/* Sección Actores */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-5">
          <h2 className="text-lg font-semibold mb-3">
            Actores
          </h2>

          <div className="space-y-3">
            {actores.map((actor, index) => (
              <div
                key={index}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4"
              >
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Nombre */}
                  <div className="relative flex-1 min-w-[140px]">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold">
                      👤 Nombre
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                      placeholder="Opcional"
                      value={actor.nombre}
                      onChange={(e) =>
                        handleActorChange(
                          index,
                          'nombre',
                          e.target.value
                        )
                      }
                    />
                  </div>

                  {/* Monto */}
                  <div className="relative flex-1 min-w-[140px]">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold">
                      💵 Monto
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                      value={actor.monto}
                      onChange={(e) =>
                        handleActorChange(
                          index,
                          'monto',
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                {actores.length > 1 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => removeActor(index)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addActor}
            className="mt-4 inline-flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-semibold bg-[#0f2f4b] text-white hover:bg-[#0c243b] shadow-sm transition-transform hover:scale-[1.02]"
          >
            + Agregar Actor
          </button>
        </section>

        {/* Sección Abogados */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-5">
          <h2 className="text-lg font-semibold mb-3">
            Abogados
          </h2>

          <div className="space-y-3">
            {abogados.map((abogado, index) => (
              <div
                key={index}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4"
              >
                {/* Fila 1 */}
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Nombre */}
                  <div className="relative flex-1 min-w-[140px]">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold">
                      👤 Nombre
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                      placeholder="Opcional"
                      value={abogado.nombre}
                      onChange={(e) =>
                        handleAbogadoChange(
                          index,
                          'nombre',
                          e.target.value
                        )
                      }
                    />
                  </div>

                  {/* Honorarios regulados */}
                  <div className="relative flex-1 min-w-[140px]">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold">
                      💼 Honorarios regulados
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                      value={abogado.base}
                      onChange={(e) =>
                        handleAbogadoChange(
                          index,
                          'base',
                          e.target.value
                        )
                      }
                    />
                  </div>

                  {/* Costas a cargo del actor */}
                  <div className="relative flex-1 min-w-[140px]">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold">
                      ⚖️ Costas a cargo del actor
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                      value={abogado.costas}
                      onChange={(e) =>
                        handleAbogadoChange(
                          index,
                          'costas',
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                {/* Fila 2 */}
                <div className="flex flex-col md:flex-row gap-3 mt-3">
                  {/* Responsable inscripto */}
                  <div className="relative flex-1 min-w-[140px]">
                    <div className="flex items-center h-full gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                      <input
                        id={`ab-ri-${index}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={abogado.responsableInscripto}
                        onChange={(e) =>
                          setAbogados((prev) =>
                            prev.map((a, i) =>
                              i === index
                                ? {
                                    ...a,
                                    responsableInscripto:
                                      e.target.checked,
                                  }
                                : a
                            )
                          )
                        }
                      />
                      <label
                        htmlFor={`ab-ri-${index}`}
                        className="text-xs font-semibold"
                      >
                        Responsable inscripto
                      </label>
                    </div>
                  </div>

                  {/* Aportes */}
                  <div className="relative flex-1 min-w-[140px]">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold">
                      🧮 Aportes (%)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                      value={abogado.aporte}
                      onChange={(e) =>
                        handleAbogadoChange(
                          index,
                          'aporte',
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                {abogados.length > 1 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => removeAbogado(index)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addAbogado}
            className="mt-4 inline-flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-semibold bg-[#0f2f4b] text-white hover:bg-[#0c243b] shadow-sm transition-transform hover:scale-[1.02]"
          >
            + Agregar Abogado
          </button>
        </section>

        {/* Sección Peritos */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-5">
          <h2 className="text-lg font-semibold mb-3">
            Peritos
          </h2>

          <div className="space-y-3">
            {peritos.map((perito, index) => (
              <div
                key={index}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4"
              >
                {/* Fila 1 */}
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Nombre */}
                  <div className="relative flex-1 min-w-[140px]">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold">
                      👤 Nombre
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                      placeholder="Opcional"
                      value={perito.nombre}
                      onChange={(e) =>
                        handlePeritoChange(
                          index,
                          'nombre',
                          e.target.value
                        )
                      }
                    />
                  </div>

                  {/* Honorarios regulados */}
                  <div className="relative flex-1 min-w-[140px]">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold">
                      💼 Honorarios regulados
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                      value={perito.base}
                      onChange={(e) =>
                        handlePeritoChange(
                          index,
                          'base',
                          e.target.value
                        )
                      }
                    />
                  </div>

                  {/* Costas a cargo */}
                  <div className="relative flex-1 min-w-[140px]">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold">
                      🔬 Costas a cargo
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                      value={perito.costas}
                      onChange={(e) =>
                        handlePeritoChange(
                          index,
                          'costas',
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                {/* Fila 2 */}
                <div className="flex flex-col md:flex-row gap-3 mt-3">
                  {/* Responsable inscripto */}
                  <div className="relative flex-1 min-w-[140px]">
                    <div className="flex items-center h-full gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                      <input
                        id={`pe-ri-${index}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={perito.responsableInscripto}
                        onChange={(e) =>
                          setPeritos((prev) =>
                            prev.map((p, i) =>
                              i === index
                                ? {
                                    ...p,
                                    responsableInscripto:
                                      e.target.checked,
                                  }
                                : p
                            )
                          )
                        }
                      />
                      <label
                        htmlFor={`pe-ri-${index}`}
                        className="text-xs font-semibold"
                      >
                        Responsable inscripto
                      </label>
                    </div>
                  </div>

                  {/* Aportes */}
                  <div className="relative flex-1 min-w-[140px]">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold">
                      🧮 Aportes (%)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                      value={perito.aporte}
                      onChange={(e) =>
                        handlePeritoChange(
                          index,
                          'aporte',
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                {peritos.length > 1 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => removePerito(index)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addPerito}
            className="mt-4 inline-flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-semibold bg-[#0f2f4b] text-white hover:bg-[#0c243b] shadow-sm transition-transform hover:scale-[1.02]"
          >
            + Agregar Perito
          </button>
        </section>

        {/* Botón Calcular */}
        <div className="flex justify-center mb-5">
          <button
            type="button"
            onClick={handleCalcular}
            className="inline-flex items-center px-5 py-3 rounded-lg text-sm md:text-base font-semibold bg-[#0f2f4b] text-white hover:bg-[#0c243b] shadow-md transition-transform hover:scale-[1.02]"
          >
            Calcular Total a Pagar
          </button>
        </div>

        {/* Resultado */}
        <section className="bg-slate-50 rounded-2xl border border-slate-200 p-4 md:p-6">
          {resultado ? (
            <>
              <h2 className="text-lg font-semibold mb-3">
                📊 Resultados. Total a depositar
              </h2>

              <p className="text-sm md:text-base">
                <strong>👥 Total Actores:</strong>{' '}
                {formatMoney(resultado.sumAct)}
              </p>

              {/* Tabla Abogados */}
              {resultado.abogadosCalc.length > 0 && (
                <>
                  <h3 className="text-base font-semibold mt-5 mb-2">
                    ⚖️ Abogados
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm border border-slate-200 mt-1">
                      <thead>
                        <tr className="bg-[#0f2f4b] text-white">
                          <th className="px-2 py-2">Nombre</th>
                          <th className="px-2 py-2">Honorarios</th>
                          <th className="px-2 py-2">IVA</th>
                          <th className="px-2 py-2">Aportes</th>
                          <th className="px-2 py-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.abogadosCalc.map((a, i) => (
                          <tr
                            key={i}
                            className="border-t border-slate-200 text-center"
                          >
                            <td className="px-2 py-1">
                              {a.nombre || '—'}
                            </td>
                            <td className="px-2 py-1">
                              {formatMoney(a.honor)}
                            </td>
                            <td className="px-2 py-1">
                              {formatMoney(a.iva)}
                            </td>
                            <td className="px-2 py-1">
                              {formatMoney(a.aporte)}
                            </td>
                            <td className="px-2 py-1">
                              {formatMoney(a.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Tabla Peritos */}
              {resultado.peritosCalc.length > 0 && (
                <>
                  <h3 className="text-base font-semibold mt-6 mb-2">
                    🔬 Peritos
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm border border-slate-200 mt-1">
                      <thead>
                        <tr className="bg-[#0f2f4b] text-white">
                          <th className="px-2 py-2">Nombre</th>
                          <th className="px-2 py-2">Honorarios</th>
                          <th className="px-2 py-2">IVA</th>
                          <th className="px-2 py-2">Aportes</th>
                          <th className="px-2 py-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.peritosCalc.map((p, i) => (
                          <tr
                            key={i}
                            className="border-t border-slate-200 text-center"
                          >
                            <td className="px-2 py-1">
                              {p.nombre || '—'}
                            </td>
                            <td className="px-2 py-1">
                              {formatMoney(p.honor)}
                            </td>
                            <td className="px-2 py-1">
                              {formatMoney(p.iva)}
                            </td>
                            <td className="px-2 py-1">
                              {formatMoney(p.aporte)}
                            </td>
                            <td className="px-2 py-1">
                              {formatMoney(p.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <p className="text-sm md:text-base mt-4">
                <strong>🧑‍💼 Total Profesionales:</strong>{' '}
                {formatMoney(resultado.sumProf)}
              </p>
              <p className="text-sm md:text-base mt-2">
                <strong>💰 Total a Pagar:</strong>{' '}
                {formatMoney(resultado.total)}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Completa los campos y presioná{' '}
              <span className="font-semibold">
                “Calcular Total a Pagar”
              </span>{' '}
              para ver el detalle.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
