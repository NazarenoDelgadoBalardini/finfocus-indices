import React, { useEffect } from 'react';

export default function CalculadoraFairValueEquity() {
  useEffect(() => {
    /* =========================
       Inicializaciones y helpers
       ========================= */

    const fmtUSD = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    });

    // Chart.js global (desde CDN en window)
    const Chart = window.Chart;
    const ChartDataLabels = window.ChartDataLabels;

    // Si existe Chart, configuro defaults y plugin. PERO NO SALGO DEL EFFECT.
    if (Chart) {
      if (ChartDataLabels) {
        Chart.register(ChartDataLabels);
      }
      Chart.defaults.font.family = 'Montserrat';
      Chart.defaults.plugins.tooltip.bodyFont = { family: 'Montserrat' };
      Chart.defaults.plugins.tooltip.titleFont = { family: 'Montserrat' };
    }

    /* Tabs */
    const tabs = document.querySelectorAll('.fv-tab');
    const contents = document.querySelectorAll('.fv-tab-content');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab));
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchTab(tab);
        }
      });
    });

function switchTab(tab) {
  // 1) Resetear todos los tabs al estado "no seleccionado"
  tabs.forEach((t) => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');

    // Estado visual NO seleccionado
    t.classList.remove('bg-[#0f2f4b]', 'text-white', 'shadow-sm');
    t.classList.add('bg-white', 'text-[#0f2f4b]');
  });

  // 2) Ocultar todos los contenidos
  contents.forEach((c) => c.setAttribute('hidden', 'hidden'));

  // 3) Marcar este como seleccionado
  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');

  // Estado visual SELECCIONADO
  tab.classList.remove('bg-white', 'text-[#0f2f4b]');
  tab.classList.add('bg-[#0f2f4b]', 'text-white', 'shadow-sm');

  // 4) Mostrar el panel correspondiente
  const target = tab.getAttribute('data-target');
  const panel = document.getElementById(target);
  if (panel) {
    panel.removeAttribute('hidden');
  }
}

    /* Utilidades numéricas */
    function parseNum(inputId) {
      const el = document.getElementById(inputId);
      if (!el) return NaN;
      const v = parseFloat(String(el.value).replace(',', '.'));
      return isNaN(v) ? NaN : v;
    }

    function setHtml(id, html) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    }

    function copyTextFrom(id) {
      const el = document.getElementById(id);
      if (!el) return;
      const text = el.innerText || el.textContent;
      if (!navigator.clipboard) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } else {
        navigator.clipboard.writeText(text);
      }
    }

    function warn(id, message) {
      setHtml(
        id,
        `
        <div class="mt-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3 py-2">
          ${message}
        </div>
      `
      );
    }

    /* =========================
       1) Flujo de dividendos estable
       ========================= */

    const ds_dps = document.getElementById('ds_dps');
    const ds_r = document.getElementById('ds_r');
    const ds_g = document.getElementById('ds_g');
    const ds_h = document.getElementById('ds_h');
    const ds_gt = document.getElementById('ds_gt');
    const ds_demo = document.getElementById('ds_demo');
    const ds_calc = document.getElementById('ds_calc');
    const ds_copy = document.getElementById('ds_copy');

    function validateDividendStable(dps, r, g, h, gt) {
      const issues = [];
      if (!(dps > 0)) issues.push('DPS > 0');
      if (!(r > 0)) issues.push('r > 0');
      if (!(Math.abs(g) <= 0.2)) issues.push('|g| ≤ 20%');
      if (!(h >= 1 && h <= 30)) issues.push('Horizonte 1–30 años');
      if (!(gt < r)) issues.push('g∞ < r');
      return issues;
    }

    function computeDividendStable() {
      const dps = parseNum('ds_dps');
      const r = parseNum('ds_r') / 100;
      const g = parseNum('ds_g') / 100;
      const h = parseNum('ds_h');
      const gt = parseNum('ds_gt') / 100;

      const issues = validateDividendStable(dps, r, g, h, gt);
      if (issues.length) {
        warn('ds_result', `Revisá los supuestos: ${issues.join(' · ')}`);
        return;
      }

      const divs = [];
      for (let t = 1; t <= h; t++) {
        const div = dps * Math.pow(1 + g, t);
        const df = Math.pow(1 + r, t);
        divs.push({ t, div, pv: div / df });
      }

      const lastDiv = divs[divs.length - 1].div;
      const tv = (lastDiv * (1 + gt)) / (r - gt);
      const tvPv = tv / Math.pow(1 + r, h);

      const npv = divs.reduce((acc, d) => acc + d.pv, 0) + tvPv;

      setHtml(
        'ds_result',
        `
        <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs md:text-sm leading-relaxed">
          <h3 class="font-semibold text-slate-800 mb-1">Resultado</h3>
          <p class="mb-1">
            Valor presente estimado de la acción: 
            <strong class="font-bold">${fmtUSD.format(npv)}</strong>
          </p>
          <p class="mb-1">
            Suma de dividendos explícitos: 
            <strong>${fmtUSD.format(
              divs.reduce((acc, d) => acc + d.pv, 0)
            )}</strong><br/>
            Valor presente del valor terminal: 
            <strong>${fmtUSD.format(tvPv)}</strong>
          </p>
          <p class="mt-1 text-[0.7rem] text-slate-500">
            Este modelo supone dividendos creciendo al ritmo g durante ${h} años 
            y luego una tasa de crecimiento perpetuo g∞. Es sensible a pequeñas 
            variaciones entre r y g∞.
          </p>
        </div>
      `
      );

      const labels = divs.map((d) => `Año ${d.t}`);
      const dataDiv = divs.map((d) => d.div);
      const dataPv = divs.map((d) => d.pv);

      makeBarChart('ds_chart', labels, dataDiv, dataPv);
    }

    if (ds_demo) {
      ds_demo.addEventListener('click', () => {
        ds_dps.value = '1.20';
        ds_r.value = '12';
        ds_g.value = '4';
        ds_h.value = '10';
        ds_gt.value = '3';
        computeDividendStable();
      });
    }

    if (ds_calc) {
      ds_calc.addEventListener('click', computeDividendStable);
    }

    if (ds_copy) {
      ds_copy.addEventListener('click', () => copyTextFrom('ds_result'));
    }

    /* =========================
       2) FCFE (Flujo de caja libre al equity)
       ========================= */

    const fcfe_cashflow = document.getElementById('fcfe_cashflow');
    const fcfe_growth = document.getElementById('fcfe_growth');
    const fcfe_r = document.getElementById('fcfe_r');
    const fcfe_h = document.getElementById('fcfe_h');
    const fcfe_gt = document.getElementById('fcfe_gt');
    const fcfe_demo = document.getElementById('fcfe_demo');
    const fcfe_calc = document.getElementById('fcfe_calc');
    const fcfe_copy = document.getElementById('fcfe_copy');

    function validateFcfe(cf0, g, r, h, gt) {
      const issues = [];
      if (!(cf0 > 0)) issues.push('FCFE0 > 0');
      if (!(Math.abs(g) <= 0.3)) issues.push('|g| ≤ 30%');
      if (!(r > 0)) issues.push('r > 0');
      if (!(h >= 1 && h <= 30)) issues.push('Horizonte 1–30 años');
      if (!(gt < r)) issues.push('g∞ < r');
      return issues;
    }

    function computeFcfe() {
      const cf0 = parseNum('fcfe_cashflow');
      const g = parseNum('fcfe_growth') / 100;
      const r = parseNum('fcfe_r') / 100;
      const h = parseNum('fcfe_h');
      const gt = parseNum('fcfe_gt') / 100;

      const issues = validateFcfe(cf0, g, r, h, gt);
      if (issues.length) {
        warn('fcfe_result', `Revisá los supuestos: ${issues.join(' · ')}`);
        return;
      }

      const flows = [];
      for (let t = 1; t <= h; t++) {
        const cf = cf0 * Math.pow(1 + g, t);
        const df = Math.pow(1 + r, t);
        flows.push({ t, cf, pv: cf / df });
      }

      const lastCf = flows[flows.length - 1].cf;
      const tv = (lastCf * (1 + gt)) / (r - gt);
      const tvPv = tv / Math.pow(1 + r, h);

      const npv = flows.reduce((acc, d) => acc + d.pv, 0) + tvPv;

      setHtml(
        'fcfe_result',
        `
        <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs md:text-sm leading-relaxed">
          <h3 class="font-semibold text-slate-800 mb-1">Resultado</h3>
          <p class="mb-1">
            Fair value del equity por unidad de flujo inicial: 
            <strong class="font-bold">${fmtUSD.format(npv)}</strong>
          </p>
          <p class="mb-1">
            Suma de FCFE explícitos: 
            <strong>${fmtUSD.format(
              flows.reduce((acc, d) => acc + d.pv, 0)
            )}</strong><br/>
            Valor presente del valor terminal: 
            <strong>${fmtUSD.format(tvPv)}</strong>
          </p>
          <p class="mt-1 text-[0.7rem] text-slate-500">
            Modelo muy sensible a supuestos de crecimiento de largo plazo (g∞) y 
            costo de equity r. Recomendado usar escenarios conservadores.
          </p>
        </div>
      `
      );

      const labels = flows.map((d) => `Año ${d.t}`);
      const dataCf = flows.map((d) => d.cf);
      const dataPv = flows.map((d) => d.pv);

      makeBarChart('fcfe_chart', labels, dataCf, dataPv);
    }

    if (fcfe_demo) {
      fcfe_demo.addEventListener('click', () => {
        fcfe_cashflow.value = '100';
        fcfe_growth.value = '6';
        fcfe_r.value = '14';
        fcfe_h.value = '8';
        fcfe_gt.value = '3';
        computeFcfe();
      });
    }

    if (fcfe_calc) {
      fcfe_calc.addEventListener('click', computeFcfe);
    }

    if (fcfe_copy) {
      fcfe_copy.addEventListener('click', () => copyTextFrom('fcfe_result'));
    }

    /* =========================
       3) Modelo Residual Income
       ========================= */

    const ri_bv0 = document.getElementById('ri_bv0');
    const ri_roe = document.getElementById('ri_roe');
    const ri_r = document.getElementById('ri_r');
    const ri_h = document.getElementById('ri_h');
    const ri_gt = document.getElementById('ri_gt');
    const ri_demo = document.getElementById('ri_demo');
    const ri_calc = document.getElementById('ri_calc');
    const ri_copy = document.getElementById('ri_copy');

    function validateRI(bv0, roe, r, h, gt) {
      const issues = [];
      if (!(bv0 > 0)) issues.push('BV0 > 0');
      if (!(r > 0)) issues.push('r > 0');
      if (!(h >= 1 && h <= 30)) issues.push('Horizonte 1–30 años');
      if (!(gt < r)) issues.push('g∞ < r');
      return issues;
    }

    function computeRI() {
      const bv0 = parseNum('ri_bv0');
      const roe = parseNum('ri_roe') / 100;
      const r = parseNum('ri_r') / 100;
      const h = parseNum('ri_h');
      const gt = parseNum('ri_gt') / 100;

      const issues = validateRI(bv0, roe, r, h, gt);
      if (issues.length) {
        warn('ri_result', `Revisá los supuestos: ${issues.join(' · ')}`);
        return;
      }

      const residuals = [];
      let bv = bv0;
      for (let t = 1; t <= h; t++) {
        const income = bv * roe;
        const charge = bv * r;
        const ri = income - charge;
        const df = Math.pow(1 + r, t);
        residuals.push({ t, ri, pv: ri / df });
        bv = bv * (1 + roe);
      }

      const lastBV = bv;
      const lastIncome = lastBV * roe;
      const lastCharge = lastBV * r;
      const lastRI = lastIncome - lastCharge;
      const tv = (lastRI * (1 + gt)) / (r - gt);
      const tvPv = tv / Math.pow(1 + r, h);

      const npvResiduals = residuals.reduce((acc, d) => acc + d.pv, 0);
      const value = bv0 + npvResiduals + tvPv;

      setHtml(
        'ri_result',
        `
        <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs md:text-sm leading-relaxed">
          <h3 class="font-semibold text-slate-800 mb-1">Resultado</h3>
          <p class="mb-1">
            Valor estimado de la acción (RI): 
            <strong class="font-bold">${fmtUSD.format(value)}</strong>
          </p>
          <p class="mb-1">
            BV0 (valor libro inicial equity): 
            <strong>${fmtUSD.format(bv0)}</strong><br/>
            Valor presente de ingresos residuales explícitos: 
            <strong>${fmtUSD.format(npvResiduals)}</strong><br/>
            Valor presente del residual terminal: 
            <strong>${fmtUSD.format(tvPv)}</strong>
          </p>
          <p class="mt-1 text-[0.7rem] text-slate-500">
            Este enfoque destaca el aporte de la rentabilidad por encima del costo 
            de equity. Sensible a supuestos sobre ROE y la dinámica de BV.
          </p>
        </div>
      `
      );

      const labels = residuals.map((d) => `Año ${d.t}`);
      const dataRi = residuals.map((d) => d.ri);
      const dataPv = residuals.map((d) => d.pv);

      makeBarChart('ri_chart', labels, dataRi, dataPv);
    }

    if (ri_demo) {
      ri_demo.addEventListener('click', () => {
        ri_bv0.value = '10';
        ri_roe.value = '18';
        ri_r.value = '14';
        ri_h.value = '8';
        ri_gt.value = '3';
        computeRI();
      });
    }

    if (ri_calc) {
      ri_calc.addEventListener('click', computeRI);
    }

    if (ri_copy) {
      ri_copy.addEventListener('click', () => copyTextFrom('ri_result'));
    }

    /* =========================
       4) Comparar métodos
       ========================= */

    const cmp_price = document.getElementById('cmp_price');
    const cmp_ds = document.getElementById('cmp_ds');
    const cmp_fcfe = document.getElementById('cmp_fcfe');
    const cmp_ri = document.getElementById('cmp_ri');
    const cmp_run = document.getElementById('cmp_run');

    function compareMethods() {
      const price = parseNum('cmp_price');
      const ds = parseNum('cmp_ds');
      const fcfe = parseNum('cmp_fcfe');
      const ri = parseNum('cmp_ri');

      if (!(price > 0) || !(ds > 0) || !(fcfe > 0) || !(ri > 0)) {
        warn(
          'cmp_result',
          'Completá todos los fair values para comparar contra el precio de mercado.'
        );
        return;
      }

      const dif_ds = (ds - price) / price;
      const dif_fcfe = (fcfe - price) / price;
      const dif_ri = (ri - price) / price;

      setHtml(
        'cmp_result',
        `
        <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs md:text-sm leading-relaxed">
          <h3 class="font-semibold text-slate-800 mb-1">Comparación</h3>
          <p class="mb-2">
            Precio de mercado: <strong>${fmtUSD.format(price)}</strong>
          </p>
          <ul class="list-disc pl-5 space-y-1">
            <li>
              Dividendos estables: ${fmtUSD.format(ds)} 
              <span class="text-slate-600"> (${(dif_ds * 100).toFixed(1)}% vs precio)</span>
            </li>
            <li>
              FCFE: ${fmtUSD.format(fcfe)} 
              <span class="text-slate-600"> (${(dif_fcfe * 100).toFixed(1)}% vs precio)</span>
            </li>
            <li>
              Residual Income: ${fmtUSD.format(ri)} 
              <span class="text-slate-600"> (${(dif_ri * 100).toFixed(1)}% vs precio)</span>
            </li>
          </ul>
          <p class="mt-2 text-[0.7rem] text-slate-500">
            Observá qué modelo está más alineado con la lógica del negocio 
            (madurez, payout, estabilidad del ROE, etc.) y usalo como referencia 
            principal. El resto suma contexto.
          </p>
        </div>
      `
      );

      const labels = ['Dividendos', 'FCFE', 'Residual'];
      const vals = [ds, fcfe, ri];

      makeBarChart('cmp_chart', labels, vals);
    }

    if (cmp_run) {
      cmp_run.addEventListener('click', compareMethods);
    }

    /* =========================
       Gráficos helpers
       ========================= */

    function makeBarChart(canvasId, labels, data, auxData) {
      const ChartLocal = window.Chart;
      if (!ChartLocal) {
        console.warn('Chart.js no está disponible en window.Chart');
        return null;
      }
      const ctx = document.getElementById(canvasId);
      if (!ctx) return null;
      if (ctx._chartInstance) {
        ctx._chartInstance.destroy();
      }
      const chart = new ChartLocal(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: auxData ? 'Flujo / Dividendos' : 'Valor',
              data,
              backgroundColor: '#0f2f4b',
            },
            ...(auxData
              ? [
                  {
                    label: 'Valor presente',
                    data: auxData,
                    backgroundColor: '#5EA6D7',
                  },
                ]
              : []),
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
            },
            y: {
              grid: { color: 'rgba(148, 163, 184, 0.35)' },
              ticks: {
                callback: (value) => fmtUSD.format(value),
              },
            },
          },
          plugins: {
            legend: { display: true, position: 'bottom' },
            tooltip: {
              callbacks: {
                label: (ctx) => fmtUSD.format(ctx.parsed.y),
              },
            },
            datalabels: {
              anchor: 'end',
              align: 'end',
              formatter: (val) => fmtUSD.format(val),
              font: { size: 10 },
            },
          },
        },
      });

      ctx._chartInstance = chart;
      return chart;
    }

    // Limpieza al desmontar: solo destruyo charts, no toco los botones
    return () => {
      const canvases = ['ds_chart', 'fcfe_chart', 'ri_chart', 'cmp_chart'];
      canvases.forEach((id) => {
        const c = document.getElementById(id);
        if (c && c._chartInstance) {
          c._chartInstance.destroy();
        }
      });
    };
  }, []);

  return (
    <>
      {/* HERO FINFOCUS – Fair Value Equity */}
      <div className="max-w-5xl mx-auto mb-6 rounded-2xl bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#0f2f4b] text-white px-6 py-4 md:py-5 shadow-md flex items-center gap-4 md:gap-5">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/95 flex items-center justify-center shadow-md">
            <img
              src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765223938608-b01fac20/fair_value_renta_variable.png"
              alt="Fair Value Renta Variable – FINFOCUS"
              className="w-12 h-12 md:w-14 md:h-14 object-contain"
            />
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-base md:text-xl font-extrabold tracking-tight">
            Fair Value en Renta Variable
          </h1>
          <p className="text-xs md:text-sm leading-snug opacity-90 max-w-2xl">
            Modelos de valuación equity: dividendos, FCFE y residual income. Calculá un
            rango razonable de valor según el enfoque de tu preferencia.
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {['Dividendos', 'FCFE', 'Residual income', 'Comparador'].map((chip) => (
              <span
                key={chip}
                className="text-[0.65rem] md:text-[0.7rem] px-2 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-5xl mx-auto px-4 md:px-0 text-slate-900 text-[13px] md:text-[14px]">
        <div className="text-[0.7rem] md:text-xs text-center text-slate-500 mb-4">
          Uso educativo y de screening inicial. No constituye recomendación de inversión.
        </div>

        <div className="grid md:grid-cols-[1.8fr,1.2fr] gap-4 md:gap-6">
          {/* Columna izquierda: modelos */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-4 md:p-5">
            <h2 className="text-sm md:text-base font-bold text-[#0f2f4b] mb-2">
              1) Seleccioná el modelo
            </h2>

            <div
              className="flex flex-wrap gap-2 mb-3"
              role="tablist"
              aria-label="Modelos de valuación equity"
            >
              <button
                className="fv-tab inline-flex items-center px-3 py-1.5 rounded-full border border-[#0f2f4b] bg-[#0f2f4b] text-white text-[0.7rem] md:text-xs font-semibold shadow-sm"
                data-target="tab_dividend"
                role="tab"
                aria-selected="true"
              >
                Dividendos estables
              </button>
              <button
                className="fv-tab inline-flex items-center px-3 py-1.5 rounded-full border border-[#0f2f4b] bg-white text-[#0f2f4b] text-[0.7rem] md:text-xs font-semibold"
                data-target="tab_fcfe"
                role="tab"
                aria-selected="false"
              >
                FCFE (DCF equity)
              </button>
              <button
                className="fv-tab inline-flex items-center px-3 py-1.5 rounded-full border border-[#0f2f4b] bg-white text-[#0f2f4b] text-[0.7rem] md:text-xs font-semibold"
                data-target="tab_ri"
                role="tab"
                aria-selected="false"
              >
                Residual income
              </button>
              <button
                className="fv-tab inline-flex items-center px-3 py-1.5 rounded-full border border-[#0f2f4b] bg-white text-[#0f2f4b] text-[0.7rem] md:text-xs font-semibold"
                data-target="tab_cmp"
                role="tab"
                aria-selected="false"
              >
                Comparar métodos
              </button>
            </div>

            {/* TAB 1: Dividendos estables */}
            <div id="tab_dividend" className="fv-tab-content" role="tabpanel">
              <p className="text-xs text-slate-600 mb-3">
                Modelo de dividendos con crecimiento estable durante un período explícito y
                luego crecimiento perpetuo g∞.
              </p>

              {/* Campos en orientación vertical */}
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Dividendo por acción actual (DPS₀)
                  </label>
                  <input
                    id="ds_dps"
                    type="number"
                    step="0.01"
                    placeholder="1.20"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                  <div className="text-[0.7rem] text-slate-500 mt-1">
                    En moneda dura o ajustada.
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Costo de equity (r, %)
                  </label>
                  <input
                    id="ds_r"
                    type="number"
                    step="0.1"
                    placeholder="12"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Crecimiento dividendos (g, %)
                  </label>
                  <input
                    id="ds_g"
                    type="number"
                    step="0.1"
                    placeholder="4"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Horizonte explícito (años)
                  </label>
                  <input
                    id="ds_h"
                    type="number"
                    step="1"
                    placeholder="10"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Crecimiento perpetuo (g∞, %)
                  </label>
                  <input
                    id="ds_gt"
                    type="number"
                    step="0.1"
                    placeholder="3"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  id="ds_demo"
                  className="px-3 py-1.5 rounded-full border border-[#0f2f4b] bg-white text-[#0f2f4b] text-[0.7rem] font-semibold"
                  type="button"
                >
                  Demo
                </button>
                <button
                  id="ds_calc"
                  className="px-3 py-1.5 rounded-full bg-[#0f2f4b] text-white text-[0.7rem] font-semibold"
                  type="button"
                >
                  Calcular
                </button>
                <button
                  id="ds_copy"
                  className="px-3 py-1.5 rounded-full border border-slate-300 bg-slate-50 text-slate-700 text-[0.7rem] font-semibold"
                  type="button"
                >
                  Copiar resultado
                </button>
              </div>

              <div id="ds_result" className="mt-3" />
              <div className="mt-3 h-56">
                <canvas id="ds_chart" aria-label="Gráfico Dividendos estables" />
              </div>
            </div>

            {/* TAB 2: FCFE */}
            <div id="tab_fcfe" className="fv-tab-content" role="tabpanel" hidden>
              <p className="text-xs text-slate-600 mb-3">
                Modelo de descuento de flujo de caja libre al equity (FCFE) con horizonte
                explícito y valor terminal.
              </p>

              {/* Campos en orientación vertical */}
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    FCFE₀ (flujo de caja libre al equity inicial)
                  </label>
                  <input
                    id="fcfe_cashflow"
                    type="number"
                    step="0.01"
                    placeholder="100"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Crecimiento FCFE (g, %)
                  </label>
                  <input
                    id="fcfe_growth"
                    type="number"
                    step="0.1"
                    placeholder="6"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Costo de equity (r, %)
                  </label>
                  <input
                    id="fcfe_r"
                    type="number"
                    step="0.1"
                    placeholder="14"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Horizonte explícito (años)
                  </label>
                  <input
                    id="fcfe_h"
                    type="number"
                    step="1"
                    placeholder="8"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Crecimiento perpetuo (g∞, %)
                  </label>
                  <input
                    id="fcfe_gt"
                    type="number"
                    step="0.1"
                    placeholder="3"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  id="fcfe_demo"
                  className="px-3 py-1.5 rounded-full border border-[#0f2f4b] bg-white text-[#0f2f4b] text-[0.7rem] font-semibold"
                  type="button"
                >
                  Demo
                </button>
                <button
                  id="fcfe_calc"
                  className="px-3 py-1.5 rounded-full bg-[#0f2f4b] text-white text-[0.7rem] font-semibold"
                  type="button"
                >
                  Calcular
                </button>
                <button
                  id="fcfe_copy"
                  className="px-3 py-1.5 rounded-full border border-slate-300 bg-slate-50 text-slate-700 text-[0.7rem] font-semibold"
                  type="button"
                >
                  Copiar resultado
                </button>
              </div>

              <div id="fcfe_result" className="mt-3" />
              <div className="mt-3 h-56">
                <canvas id="fcfe_chart" aria-label="Gráfico FCFE" />
              </div>
            </div>

            {/* TAB 3: Residual Income */}
            <div id="tab_ri" className="fv-tab-content" role="tabpanel" hidden>
              <p className="text-xs text-slate-600 mb-3">
                Modelo de ingresos residuales (Residual Income), basado en valor libro del
                equity y ROE por encima del costo de equity.
              </p>

              {/* Campos en orientación vertical */}
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    BV₀ (valor libro inicial por acción)
                  </label>
                  <input
                    id="ri_bv0"
                    type="number"
                    step="0.01"
                    placeholder="10"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    ROE (% sobre BV)
                  </label>
                  <input
                    id="ri_roe"
                    type="number"
                    step="0.1"
                    placeholder="18"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Costo de equity (r, %)
                  </label>
                  <input
                    id="ri_r"
                    type="number"
                    step="0.1"
                    placeholder="14"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Horizonte explícito (años)
                  </label>
                  <input
                    id="ri_h"
                    type="number"
                    step="1"
                    placeholder="8"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Crecimiento perpetuo (g∞, %)
                  </label>
                  <input
                    id="ri_gt"
                    type="number"
                    step="0.1"
                    placeholder="3"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  id="ri_demo"
                  className="px-3 py-1.5 rounded-full border border-[#0f2f4b] bg-white text-[#0f2f4b] text-[0.7rem] font-semibold"
                  type="button"
                >
                  Demo
                </button>
                <button
                  id="ri_calc"
                  className="px-3 py-1.5 rounded-full bg-[#0f2f4b] text-white text-[0.7rem] font-semibold"
                  type="button"
                >
                  Calcular
                </button>
                <button
                  id="ri_copy"
                  className="px-3 py-1.5 rounded-full border border-slate-300 bg-slate-50 text-slate-700 text-[0.7rem] font-semibold"
                  type="button"
                >
                  Copiar resultado
                </button>
              </div>

              <div id="ri_result" className="mt-3" />
              <div className="mt-3 h-56">
                <canvas id="ri_chart" aria-label="Gráfico Residual" />
              </div>
            </div>

            {/* TAB 4: Comparar métodos */}
            <div id="tab_cmp" className="fv-tab-content" role="tabpanel" hidden>
              <p className="text-xs text-slate-600 mb-3">
                Cargá los fair values obtenidos por cada modelo y comparalos con el precio
                de mercado actual.
              </p>

              {/* Campos en orientación vertical */}
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Precio de mercado (P)
                  </label>
                  <input
                    id="cmp_price"
                    type="number"
                    step="0.01"
                    placeholder="25"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    FV Dividendos estables
                  </label>
                  <input
                    id="cmp_ds"
                    type="number"
                    step="0.01"
                    placeholder="28"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    FV FCFE
                  </label>
                  <input
                    id="cmp_fcfe"
                    type="number"
                    step="0.01"
                    placeholder="30"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    FV Residual Income
                  </label>
                  <input
                    id="cmp_ri"
                    type="number"
                    step="0.01"
                    placeholder="27"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-[#0f2f4b]"
                  />
                </div>
              </div>

              <p className="text-[0.7rem] text-slate-500 mt-2">
                Tip: si varios modelos dan un valor parecido y consistente con el negocio, 
                esa zona es un buen candidato a “valor razonable”.
              </p>

              <button
                id="cmp_run"
                className="mt-3 px-3 py-1.5 rounded-full bg-[#0f2f4b] text-white text-[0.7rem] font-semibold"
                type="button"
              >
                Calcular comparación
              </button>

              <div id="cmp_result" className="mt-3" />
              <div className="mt-3 h-56">
                <canvas id="cmp_chart" aria-label="Gráfico Comparar Métodos" />
              </div>
            </div>
          </div>

          {/* Columna derecha: explicación */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-4 md:p-5">
            <h2 className="text-sm md:text-base font-bold text-[#0f2f4b] mb-2">
              2) Cómo usar estos modelos
            </h2>
            <p className="text-xs md:text-sm text-slate-700 mb-2">
              Ningún modelo de fair value es una bola de cristal. Lo potente es
              usar varios enfoques, con supuestos razonables y consistentes con la
              historia de la empresa y el contexto macro.
            </p>
            <p className="text-xs md:text-sm text-slate-700 mb-1">
              <strong>Dividendos estables</strong> suele funcionar mejor en
              empresas maduras, con payout relativamente predecible.
            </p>
            <p className="text-xs md:text-sm text-slate-700 mb-1">
              <strong>FCFE</strong> es más general: podés aplicarlo a compañías que
              reinvierten fuerte y reparten poco, siempre que el flujo de caja sea
              razonablemente estimable.
            </p>
            <p className="text-xs md:text-sm text-slate-700 mb-1">
              <strong>Residual Income</strong> es útil cuando el valor libro del
              equity y el ROE tienen significado económico fuerte, por ejemplo en
              financieras o negocios regulados.
            </p>
            <p className="text-[0.7rem] text-slate-500 mt-3">
              ⚠️ Todo lo que sale de aquí es didáctico. No constituye recomendación
              de inversión. Ajustá supuestos, corré escenarios y combiná con
              análisis cualitativo (management, competencia, regulación, país, etc.).
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
