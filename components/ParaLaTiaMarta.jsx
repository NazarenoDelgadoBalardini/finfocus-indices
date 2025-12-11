import React, { useState, useRef, useEffect, useMemo } from 'react';

const cardsData = [
  // ===== Liquidez =====
  {
    id: 'rc',
    cat: 'liq',
    tab: 'liq',
    head: '💧 Razón Corriente (AC/PC)',
    badge: '≥ 1× deseable',
    what: '¿Qué mide? Activo corriente / Pasivo corriente.',
    how: '¿Cómo leerlo? 1×: justo; 1.5–2× cómodo; <1× tensión.',
    marta: '¿Tenés suficiente plata “rápida” para pagar lo que vence ya?',
    keys: 'razon corriente liquidez ac pc corto plazo',
  },
  {
    id: 'pa',
    cat: 'liq',
    tab: 'liq',
    head: '🧪 Prueba Ácida (Quick Ratio)',
    badge: null,
    what: '¿Qué mide? (AC − Inventarios) / Pasivo corriente.',
    how: '¿Cómo leerlo? Más estricta que RC; ≥1× suele ser saludable.',
    marta: '¿Si no vendés inventario, igual podés pagar lo inmediato?',
    keys: 'prueba acida quick ratio liquidez caja cuentas por cobrar',
  },
  {
    id: 'li',
    cat: 'liq',
    tab: 'liq',
    head: '💵 Liquidez inmediata (Caja / Deuda CP)',
    badge: null,
    what: '¿Qué mide? Caja disponible respecto a deuda de corto plazo.',
    how: '¿Cómo leerlo? ≥1× deseable; <1× alerta de caja.',
    marta: 'Si tenés $150 y debés $100 ya, vas 1.5×: bien.',
    keys: 'liquidez inmediata caja deuda cp',
  },

  // ===== Endeudamiento =====
  {
    id: 'ci',
    cat: 'end',
    tab: 'end',
    head: '📊 Cobertura de intereses (EBITDA/Intereses)',
    badge: '> 3× cómodo',
    what: '¿Qué mide? Cuántas veces el EBITDA cubre los intereses.',
    how: '¿Cómo leerlo? >3× holgura; 1–3× atención; <1× riesgo.',
    marta: 'Si ganás 5 veces los intereses, estás holgado.',
    keys: 'cobertura intereses ebitda intereses',
  },
  {
    id: 'de',
    cat: 'end',
    tab: 'end',
    head: '⏳ Deuda total / EBITDA',
    badge: null,
    what: '¿Qué mide? Años de EBITDA necesarios para pagar la deuda bruta.',
    how: '¿Cómo leerlo? <3× manejable; 3–5× exigente; >5× alto.',
    marta: '4× ≈ cuatro años de “ganancia operativa” para saldar todo.',
    keys: 'deuda ebitda total anos apalancamiento',
  },
  {
    id: 'df',
    cat: 'end',
    tab: 'end',
    head: '🏦 Deuda Financiera / Activos',
    badge: null,
    what: '¿Qué mide? % de activos financiados con deuda que paga intereses.',
    how: '¿Cómo leerlo? <40% razonable; 40–70% elevado; >70% riesgoso.',
    marta: '$70 de deuda por cada $100 en activos = dependencia alta.',
    keys: 'deuda financiera activos endeudamiento sobre activos',
  },

  // ===== Rentabilidad =====
  {
    id: 'roa',
    cat: 'rent',
    tab: 'rent',
    head: '🧮 ROA (Return on Assets)',
    badge: null,
    what: '¿Qué mide? Utilidad neta / Activos promedio.',
    how: '¿Cómo leerlo? Mejor si sube y supera a pares.',
    marta: '¿Cuánta ganancia por cada $100 en activos?',
    keys: 'roa return on assets utilidad activos',
  },
  {
    id: 'roe',
    cat: 'rent',
    tab: 'rent',
    head: '🏁 ROE (Return on Equity)',
    badge: null,
    what: '¿Qué mide? Utilidad neta / Patrimonio promedio.',
    how: '¿Cómo leerlo? Ojo: mucho apalancamiento puede inflarlo.',
    marta: '¿Qué tan bien rinde el dinero de los dueños?',
    keys: 'roe return on equity utilidad patrimonio',
  },
  {
    id: 'mn',
    cat: 'rent',
    tab: 'rent',
    head: '🧷 Margen Neto',
    badge: null,
    what: '¿Qué mide? Utilidad neta / Ventas.',
    how: '¿Cómo leerlo? Eficiencias operativas y estructura de costos lo mueven.',
    marta: 'De cada $100 vendidos, ¿cuánto queda limpio?',
    keys: 'margen neto utilidad ventas',
  },
  {
    id: 'me',
    cat: 'rent',
    tab: 'rent',
    head: '🧱 Margen EBITDA',
    badge: null,
    what: '¿Qué mide? EBITDA / Ventas.',
    how: '¿Cómo leerlo? Útil para comparar empresas del mismo sector.',
    marta: '¿Qué tan rentable es la operación antes de intereses e impuestos?',
    keys: 'margen ebitda rentabilidad operativa',
  },

  // ===== Valuación =====
  {
    id: 'pe',
    cat: 'val',
    tab: 'val',
    head: '💹 P/E (Price / Earnings)',
    badge: null,
    what: '¿Qué mide? Precio por acción / Utilidad por acción.',
    how: '¿Cómo leerlo? Útil si las utilidades son estables y positivas.',
    marta: '¿Cuántos “años de ganancias” pagás hoy?',
    keys: 'pe price earnings precio utilidad eps',
  },
  {
    id: 'pbv',
    cat: 'val',
    tab: 'val',
    head: '📘 P/BV (Price / Book Value)',
    badge: null,
    what: '¿Qué mide? Precio / Valor contable por acción.',
    how: '¿Cómo leerlo? <1×: posible descuento; >1×: premio por calidad/crecimiento.',
    marta: '¿Pagás más o menos que el “valor de libros”?',
    keys: 'pbv price book value precio valor libros',
  },
  {
    id: 'eve',
    cat: 'val',
    tab: 'val',
    head: '🏗️ EV/EBITDA',
    badge: null,
    what: '¿Qué mide? Valor empresa (cap bursátil + deuda neta) / EBITDA.',
    how: '¿Cómo leerlo? Más neutral que P/E al considerar deuda.',
    marta: 'Sirve para comparar empresas con distinta deuda.',
    keys: 'ev ebitda enterprise value valuacion',
  },
  {
    id: 'dy',
    cat: 'val',
    tab: 'val',
    head: '💰 DY (Dividend Yield)',
    badge: null,
    what: '¿Qué mide? Dividendos por acción / Precio por acción.',
    how: '¿Cómo leerlo? Alto DY con payout frágil puede no ser sostenible.',
    marta: '¿Qué % te devuelve en efectivo cada año?',
    keys: 'dividend yield dy dividendos precio',
  },
  {
    id: 'ey',
    cat: 'val',
    tab: 'val',
    head: '🔄 Earnings Yield (E/P)',
    badge: null,
    what: '¿Qué mide? Utilidad por acción / Precio por acción (= 1 / P/E).',
    how: '¿Cómo leerlo? Útil para comparar con tasas o bonos; mayor suele ser mejor si las utilidades son sostenibles.',
    marta: 'Es como una “tasa” de ganancias por cada $100 que pagás.',
    keys: 'earnings yield e p rendimiento ganancias inverso pe',
  },
  {
    id: 'peg',
    cat: 'val',
    tab: 'val',
    head: '📈 PEG (P/E / crecimiento)',
    badge: null,
    what: '¿Qué mide? Relaciona P/E con la tasa de crecimiento esperada de utilidades.',
    how: '¿Cómo leerlo? ≈1 razonable; <1 puede ser “barato” vs su crecimiento; >1 “caro”. Depende de la calidad de las estimaciones.',
    marta: '¿Lo que pagás se justifica por cuánto crecería?',
    keys: 'peg pe crecimiento growth ratio valoracion',
  },
  {
    id: 'ps',
    cat: 'val',
    tab: 'val',
    head: '📦 P/S (Price / Sales)',
    badge: null,
    what: '¿Qué mide? Precio por acción / Ventas por acción (o capitalización / ventas).',
    how: '¿Cómo leerlo? Útil cuando hay pérdidas o márgenes bajos; compará con pares. Con mucha deuda preferí EV/Ventas.',
    marta: '¿Cuánto pagás por cada $100 que vende la empresa?',
    keys: 'p s price sales precio ventas multiple',
  },
  {
    id: 'evs',
    cat: 'val',
    tab: 'val',
    head: '🧮 EV/Ventas',
    badge: null,
    what: '¿Qué mide? (Cap. bursátil + Deuda neta) / Ventas.',
    how: '¿Cómo leerlo? Neutraliza diferencias de deuda; útil con pérdidas. Sectores de alto margen toleran múltiplos mayores.',
    marta: 'Incluyendo la deuda, ¿cuánto pagás por $100 de ventas?',
    keys: 'ev ventas enterprise value sales neutral deuda multiple',
  },
  {
    id: 'evebit',
    cat: 'val',
    tab: 'val',
    head: '🏗️ EV/EBIT',
    badge: null,
    what: '¿Qué mide? Valor empresa / EBIT (ganancia operativa).',
    how: '¿Cómo leerlo? Considera depreciaciones; mejor que EV/EBITDA en negocios intensivos en activos/capex.',
    marta: 'Tiene en cuenta el “desgaste” de las máquinas.',
    keys: 'ev ebit enterprise value ganancia operativa capex',
  },
  {
    id: 'pcf',
    cat: 'val',
    tab: 'val',
    head: '💨 P/CF (Price / Cash Flow)',
    badge: null,
    what: '¿Qué mide? Precio / Flujo de caja operativo por acción.',
    how: '¿Cómo leerlo? Más robusto que utilidades contables cuando hay amortizaciones; mirá también el capital de trabajo.',
    marta: '¿Cuántos “años de caja” pagás al comprar?',
    keys: 'p cf price cash flow flujo de caja operativo',
  },
  {
    id: 'fcfy',
    cat: 'val',
    tab: 'val',
    head: '💧 FCF Yield (Rendimiento de Flujo de Caja Libre)',
    badge: null,
    what: '¿Qué mide? FCF / Capitalización bursátil.',
    how: '¿Cómo leerlo? % de “retorno de caja” sobre el precio. Más alto suele ser mejor si es sostenible.',
    marta: 'Si es 7%, por cada $100 invertidos, genera $7 de caja al año (si se mantiene).',
    keys: 'free cash flow yield fcf rendimiento caja libre market cap',
  },
];

const tourFlow = [
  'rc', 'pa', 'li',          // Liquidez
  'ci', 'de', 'df',          // Endeudamiento
  'roa', 'roe', 'mn', 'me',  // Rentabilidad
  // Valuación (orden pedagógico)
  'pe', 'ey', 'peg', 'pbv', 'eve', 'evebit', 'evs', 'ps', 'pcf', 'fcfy', 'dy',
];

export default function GuiaRatiosDidactica() {
  const [activeTab, setActiveTab] = useState('liq');
  const [searchTerm, setSearchTerm] = useState('');
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [openDetails, setOpenDetails] = useState({});
  const [focusedId, setFocusedId] = useState(null);

  const cardRefs = useRef({});

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

    // 👉 NUEVO: handler para el botón "Escuchar explicación"
  const handleListenClick = () => {
    window.open(
      'https://drive.google.com/file/d/1404QlfmqSGoMeN-tkzbCkKSyi85Q2xoX/view?usp=drive_link',
      '_blank',
      'noopener,noreferrer'
    );
  };

  const filteredCardsByTab = (tab) => {
    const term = searchTerm.trim();
    return cardsData.filter((card) => {
      if (card.tab !== tab) return false;
      if (!term) return true;
      const text =
        (card.keys || '') +
        ' ' +
        card.head +
        ' ' +
        card.what +
        ' ' +
        card.how +
        ' ' +
        (card.marta || '');
      return text.toLowerCase().includes(term);
    });
  };

  const handleExpandAll = () => {
    const visibleCards = filteredCardsByTab(activeTab);
    const newState = { ...openDetails };
    visibleCards.forEach((c) => {
      newState[c.id] = true;
    });
    setOpenDetails(newState);
  };

  const focusCard = (id) => {
    const card = cardsData.find((c) => c.id === id);
    if (!card) return;
    // Cambiar de pestaña según categoría
    setActiveTab(card.cat);
    setFocusedId(id);

    // Hacer scroll al elemento
    const el = cardRefs.current[id];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  const startTour = () => {
    setTourIndex(0);
    setTourActive(true);
    focusCard(tourFlow[0]);
  };

  const nextTour = () => {
    setTourIndex((prev) => {
      const next = Math.min(tourFlow.length - 1, prev + 1);
      focusCard(tourFlow[next]);
      return next;
    });
  };

  const prevTour = () => {
    setTourIndex((prev) => {
      const next = Math.max(0, prev - 1);
      focusCard(tourFlow[next]);
      return next;
    });
  };

  const endTour = () => {
    setTourActive(false);
    setFocusedId(null);
  };

  const sectionHint = {
    liq: 'La liquidez indica tu capacidad para pagar obligaciones de corto plazo.',
    end: 'El endeudamiento muestra dependencia del financiamiento y capacidad de pago.',
    rent: 'La rentabilidad indica qué tan bien convierte ventas o activos en ganancias.',
    val: 'La valuación relaciona precio de mercado con métricas de negocio.',
  };

  const visibleCards = useMemo(
    () => ({
      liq: filteredCardsByTab('liq'),
      end: filteredCardsByTab('end'),
      rent: filteredCardsByTab('rent'),
      val: filteredCardsByTab('val'),
    }),
    [activeTab, searchTerm]
  );

  const renderSection = (panelKey) => {
    const cards = visibleCards[panelKey];
    return (
      <section
        className={`section ${activeTab === panelKey ? '' : 'hide'}`}
        data-panel={panelKey}
      >
        <p className="hint">{sectionHint[panelKey]}</p>
        <div className="grid">
          {cards.map((card) => (
            <article
              key={card.id}
              id={card.id}
              data-cat={card.cat}
              data-key={card.keys}
              ref={(el) => (cardRefs.current[card.id] = el)}
              className={
                'card' +
                (focusedId === card.id && tourActive ? ' focus' : '')
              }
            >
              <div className="head">
                {card.head}
                {card.badge && (
                  <span className="badge">{card.badge}</span>
                )}
              </div>
              <div className="body">
                <p className="what">
                  <strong>¿Qué mide?</strong> {card.what.replace('¿Qué mide? ', '')}
                </p>
                <p className="how">
                  <strong>¿Cómo leerlo?</strong> {card.how.replace('¿Cómo leerlo? ', '')}
                </p>
                <details
                  open={!!openDetails[card.id]}
                  onToggle={(e) =>
                    setOpenDetails((prev) => ({
                      ...prev,
                      [card.id]: e.target.open,
                    }))
                  }
                >
                  <summary>Ver explicación simple</summary>
                  <div className="marta">{card.marta}</div>
                </details>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  };

  return (
    <>
      {/* CSS embebido (puedes moverlo a un .css si preferís) */}
      <style>{`
        :root{
          --azul:#0f2f4b; --cel:#5EA6D7; --gris:#f3f4f6; --gris2:#e5e7eb; --gris3:#f9fafb;
          --liq:#E7F3FF; --end:#E6FBEE; --rent:#FFF3E7; --val:#F0EAFE;
          --marta:#FFF8D8; --marta-b:#f1c94b; --muted:#6b7280;
        }
        *{ box-sizing:border-box; font-family:'Montserrat',ui-sans-serif,system-ui }
        html,body{ height:100% }
        body{ margin:0; background:#FFF; color:var(--azul) }

        .header{ position:sticky; top:0; z-index:40; background:#FFF; backdrop-filter:saturate(1.05) blur(6px); border-bottom:1px solid var(--gris2) }
        .wrap{ max-width:1400px; margin:0 auto; padding:16px 18px }
        h1{ margin:0; font-weight:700 }
        .lead{ margin:6px 0 0; color:var(--muted) }
        /* Bloque logo + texto “Tía Marta” */
.tia-intro{
  display:flex;
  align-items:center;
  gap:14px;
  padding:12px 16px;
  border-radius:18px;
  background:var(--gris3);
  border:1px solid var(--gris2);
  box-shadow:0 6px 16px rgba(15,47,75,.06);
  margin-bottom:12px;
}

.tia-intro-logo{
  width:60px;
  height:auto;
  flex-shrink:0;
  border-radius:50%;
}

.tia-intro-copy{
  display:flex;
  flex-direction:column;
  gap:4px;
}

.tia-intro-title{
  margin:0;
  font-size:1.05rem;
  font-weight:700;
  color:var(--azul);
}

.tia-intro-text{
  margin:0;
  font-size:.9rem;
  color:var(--muted);
}

/* Responsive: apilar en móviles */
@media (max-width:600px){
  .tia-intro{
    align-items:flex-start;
  }
  .tia-intro-logo{
    width:50px;
  }
}
        .toolbar{
          display:grid;
          grid-template-columns: 1fr auto auto auto;
          gap:10px;
          margin-top:10px;
        }
        @media (max-width:800px){
          .toolbar{ grid-template-columns:1fr }
        }

        .search{ display:flex; align-items:center; gap:8px; border:1px solid var(--gris2); background:#fff; padding:10px 12px; border-radius:12px }
        .search input{ border:0; outline:0; flex:1; background:transparent; color:#0f2f4b; font-size:.95rem }
        .btn{
          border:1px solid var(--gris2);
          background:#fff;
          border-radius:12px;
          padding:10px 12px;
          font-weight:600;
          cursor:pointer;
          transition:transform .15s ease, box-shadow .2s ease;
          display:flex;
          align-items:center;
          gap:6px;
          justify-content:center;
        }
        .btn:hover{
          transform:translateY(-1px);
          box-shadow:0 8px 18px rgba(0,0,0,.06);
        }

        .tabs{ max-width:1400px; margin:14px auto 0; padding:0 18px; display:flex; gap:8px; flex-wrap:wrap }
        .tab{ background:#fff; border:1px solid var(--gris2); border-radius:999px; padding:8px 12px; cursor:pointer; font-weight:700 }
        .tab[aria-selected="true"]{ background:#0f2f4b; color:#fff }

        .section{ max-width:1400px; margin:0 auto; padding:16px 18px }
        .hint{ font-size:.9rem; color:var(--muted); margin:2px 0 12px }

        .grid{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px }
        @media (max-width:1000px){ .grid{ grid-template-columns: repeat(2, minmax(0,1fr)) } }
        @media (max-width:900){ .grid{ grid-template-columns: 1fr } }
        

        .card{ border:1px solid var(--gris2); border-radius:16px; overflow:hidden; background:#fff; display:flex; flex-direction:column; transition:box-shadow .2s ease, transform .15s ease }
        .card:hover{ box-shadow:0 10px 22px rgba(0,0,0,.08); transform:translateY(-2px) }
        .card .head{ padding:12px 14px; font-weight:700; display:flex; align-items:center; gap:8px; color:#0f2f4b }
        .badge{ margin-left:auto; font-size:.72rem; padding:.1rem .5rem; border-radius:999px; border:1px solid var(--gris2); background:#fff }
        .card[data-cat="liq"] .head{ background:var(--liq) }
        .card[data-cat="end"] .head{ background:var(--end) }
        .card[data-cat="rent"] .head{ background:var(--rent) }
        .card[data-cat="val"] .head{ background:var(--val) }
        .card .body{  padding:12px 14px 20px;   /* espacio abajo para respirar */  display:flex;  flex-direction:column;  height:100%;}
        .card .body details{  margin-top:auto;}
        .what,.how,.why{ margin:.25rem 0 .4rem }
        .marta{ margin-top:8px; background:var(--marta); border:1px dashed var(--marta-b); border-left:4px solid #0f2f4b; border-radius:12px; padding:8px 10px; font-style:italic }

        .tourbar{ position:sticky; bottom:16px; z-index:30; display:flex; justify-content:center; }
        .tour{ display:flex; gap:8px; background:#fff; border:1px solid var(--gris2); border-radius:999px; padding:6px; box-shadow:0 8px 18px rgba(0,0,0,.06) }
        .tour .tbtn{ border:0; background:#fff; padding:8px 12px; border-radius:999px; font-weight:700; cursor:pointer }
        .tour .tbtn.primary{ background:#0f2f4b; color:#fff }

        .focus{ outline:3px solid #5EA6D7; outline-offset:2px; scroll-margin:100px }

        .hide{ display:none }
        .muted{ color:var(--muted) }
        /* Botón "Ver explicación simple" como chip flotante */
/* === SUMMARY ESTILO BARRA COMPLETA === */
details > summary{
  display:block;
  width:100%;
  cursor:pointer;
  user-select:none;
  padding:10px 14px;
  background:#f9fafb;
  border:1px solid var(--gris2);
  border-radius:12px;
  font-weight:600;
  color:#0f2f4b;
  list-style:none;
}

/* Oculta el triangulito original del navegador */
details > summary::-webkit-details-marker{
  display:none;
}

/* Triangulito custom a la izquierda */
details > summary::before{
  content:"▶";
  display:inline-block;
  margin-right:6px;
  transform:translateY(1px);
  transition:transform .15s ease;
}

/* Cuando está abierto, flecha gira */
details[open] > summary::before{
  transform:rotate(90deg);
}

/* Estado abierto: barra azul FINFOCUS */
details[open] > summary{
  background:#0f2f4b;
  border-color:#0f2f4b;
  color:#fff;
}

/* Recuadro Tía Marta debajo del summary */
.marta{
  margin-top:8px;
  background:var(--marta);
  border:1px dashed var(--marta-b);
  border-left:4px solid #0f2f4b;
  border-radius:12px;
  padding:8px 10px;
  font-style:italic;
}


.card .body .what,
.card .body .how{
  margin:.25rem 0 .4rem;
}
      `}</style>

      <div>
        <header className="header">
          <div className="wrap">
            {/* Bloque Tía Marta */}
            <div className="tia-intro">
              <img
                src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765224110836-5b76a9ed/tia.png"
                alt="Tía Marta FINFOCUS"
                className="tia-intro-logo"
              />
              <div className="tia-intro-copy">
                <h1 className="tia-intro-title">
                  Guía de ratios “Para la Tía Marta”
                </h1>
                <p className="tia-intro-text">
                  Aprendé los conceptos clave en cuatro bloques. 
                  Explicaciones claras + ejemplos “Para la Tía Marta”.
                </p>
              </div>
            </div>

            {/* Toolbar debajo del bloque */}
            <div className="toolbar">
              <div className="search">
                <span>🔎</span>
                <input
                  id="q"
                  placeholder="Buscar: ROE, P/E, caja, deuda…"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>

              {/* 👉 NUEVO BOTÓN: Escuchar explicación */}
              <button className="btn" onClick={handleListenClick}>
                <span role="img" aria-hidden="true">🎧</span>
                <span>Escuchar explicación</span>
              </button>

              <button className="btn" onClick={startTour}>
                📖 Aprender paso a paso
              </button>
              <button className="btn" onClick={handleExpandAll}>
                Expandir todo
              </button>
            </div>
          </div>
        </header>



        {/* Tabs */}
        <nav className="tabs" role="tablist" aria-label="Bloques de ratios">
          <button
            className="tab"
            role="tab"
            aria-selected={activeTab === 'liq'}
            data-tab="liq"
            onClick={() => setActiveTab('liq')}
          >
            💧 Liquidez
          </button>
          <button
            className="tab"
            role="tab"
            aria-selected={activeTab === 'end'}
            data-tab="end"
            onClick={() => setActiveTab('end')}
          >
            🛡️ Endeudamiento
          </button>
          <button
            className="tab"
            role="tab"
            aria-selected={activeTab === 'rent'}
            data-tab="rent"
            onClick={() => setActiveTab('rent')}
          >
            📈 Rentabilidad
          </button>
          <button
            className="tab"
            role="tab"
            aria-selected={activeTab === 'val'}
            data-tab="val"
            onClick={() => setActiveTab('val')}
          >
            🏷️ Valuación
          </button>
        </nav>

        {/* Secciones */}
        {renderSection('liq')}
        {renderSection('end')}
        {renderSection('rent')}
        {renderSection('val')}

        {/* Barra de tour (paso a paso) */}
        {tourActive && (
          <div className="tourbar" id="tourbar">
            <div className="tour" role="group" aria-label="Controles de tour">
              <button className="tbtn" onClick={prevTour}>
                ⟵ Anterior
              </button>
              <button className="tbtn primary" onClick={nextTour}>
                Siguiente ⟶
              </button>
              <button className="tbtn" onClick={endTour}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}