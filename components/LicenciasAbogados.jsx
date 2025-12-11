import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FinancialData } from '@/entities/FinancialData';
import { Calendar as CalendarIcon, RefreshCw, Search } from 'lucide-react';

/* ================== Helpers de fechas y texto ================== */

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const fromISO = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const parseDMY = (s) => {
  const clean = String(s || '').replace(/\u00A0/g, ' ').trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1]); // local
};

// normalizador de texto (búsqueda y encabezados)
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca acentos
    .replace(/\u00a0/g, ' ') // NBSP -> espacio
    .replace(/[^\w]+/g, ' ') // no alfanumérico -> espacio
    .trim();

const isConfirmada = (v) => {
  const t = String(v || '').toUpperCase().replace(/\u00A0/g, ' ').trim();
  return t === 'CONFIRMADA';
};

const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const monthRange = (d) => ({
  first: new Date(d.getFullYear(), d.getMonth(), 1),
  last: new Date(d.getFullYear(), d.getMonth() + 1, 0),
});

const startMonday = (d) => {
  const k = (d.getDay() + 6) % 7; // 0 = lunes
  const x = new Date(d);
  x.setDate(d.getDate() - k);
  return x;
};

const endSunday = (d) => {
  const k = (d.getDay() + 6) % 7;
  const x = new Date(d);
  x.setDate(d.getDate() + (6 - k));
  return x;
};

const TODAY_ISO = toISO(new Date());

/* Pequeño ícono de persona (igual que el HTML original) */
const PersonIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-3 h-3"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 12c2.8 0 5-2.7 5-6s-2.2-6-5-6-5 2.7-5 6 2.2 6 5 6zm0 2c-4.4 0-8 2.2-8 5v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1c0-2.8-3.6-5-8-5z" />
  </svg>
);

/* ================== Componente principal ================== */

export default function CalendarioLicencias({ toolName }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]); // licencias crudas (desde/hasta)
  const [daysMap, setDaysMap] = useState({}); // { iso: { matricula: record } }
  const [error, setError] = useState(null);

  // filtros
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fQuery, setFQuery] = useState('');

  // mes/año actual del calendario
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [selectedIso, setSelectedIso] = useState(TODAY_ISO);

  /* ========== Carga desde FinancialData: licencias_abogados ========== */

  useEffect(() => {
    const loadLicencias = async () => {
      setLoading(true);
      setError(null);
      try {
        const allData = await FinancialData.filter(
          {
            category: 'licencias_abogados',
            isActive: true,
          },
          '-lastSync',
          1
        );

        if (!allData || allData.length === 0) {
          setRecords([]);
          setError('No hay datos de licencias disponibles.');
          return;
        }

        const licRecord = allData[0];
        const headers = licRecord.headers || [];
        const headersNorm = headers.map((h) => norm(h));
        const idx = (pat) => headersNorm.findIndex((h) => h.includes(pat));

        const iMat = idx('matric');
        const iNom = idx('apell') !== -1 ? idx('apell') : idx('nombre');
        const iDesde = idx('desde');
        const iHasta = idx('hasta');
        const iTipo = idx('tipo');
        const iEst = idx('estado');
        const iMot = idx('motivo');

        const safe = (i, def) => (i !== -1 ? i : def);

        const MAT = safe(iMat, 0);
        const NOM = safe(iNom, 1);
        const DESDE = safe(iDesde, 2);
        const HASTA = safe(iHasta, 3);
        const TIPO = safe(iTipo, 4);
        const EST = safe(iEst, 5);
        const MOT = safe(iMot, 6);

        const nombrePorMat = new Map();
        const nuevos = [];

        for (const row of licRecord.data || []) {
          const c = row || [];
          const estado = (c[EST] || '').replace(/\u00A0/g, ' ').trim();
          if (!isConfirmada(estado)) continue;

          let m = String(c[MAT] || '').trim();
          m = m.replace(/^#\s*/, ''); // quita "#"
          if (!m) continue;

          const nombreRaw = String(c[NOM] || '').trim();
          if (!nombrePorMat.has(m) && nombreRaw) {
            nombrePorMat.set(m, nombreRaw);
          }

          const desde = String(c[DESDE] || '').trim();
          const hasta = String(c[HASTA] || '').trim();
          const tipo = String(c[TIPO] || '').trim();
          const motivo = String(c[MOT] || '').trim();

          nuevos.push({
            matricula: m,
            nombre: nombrePorMat.get(m) || nombreRaw || '',
            desde,
            hasta,
            tipo,
            estado,
            motivo,
          });
        }

        setRecords(nuevos);

        // inicializar filtros al mes actual
        const { first, last } = monthRange(currentMonth);
        setFDesde(toISO(first));
        setFHasta(toISO(last));
      } catch (e) {
        console.error('Error cargando licencias_abogados:', e);
        setError('Error al cargar las licencias. Verificá la sincronización.');
      } finally {
        setLoading(false);
      }
    };

    loadLicencias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ========== Construir daysMap con los filtros ========== */

  useEffect(() => {
    if (!records.length || !fDesde || !fHasta) {
      setDaysMap({});
      return;
    }

    const from = fromISO(fDesde);
    const to = fromISO(fHasta);
    if (!from || !to || to < from) {
      setDaysMap({});
      return;
    }

    const qTokens = norm(fQuery)
      .split(/\s+/)
      .filter(Boolean);

    const newDays = {};

    for (const r of records) {
      const d0 = parseDMY(r.desde);
      const d1 = parseDMY(r.hasta);
      if (!d0 || !d1) continue;

      // filtro por texto (matrícula o apellido/nombre)
      const hayQ = qTokens.length > 0;
      if (hayQ) {
        const target = norm(`${r.matricula} ${r.nombre}`);
        const match = qTokens.every((t) => target.includes(t));
        if (!match) continue;
      }

      const start = d0 > from ? d0 : from;
      const end = d1 < to ? d1 : to;
      if (end < start) continue;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = toISO(d);
        if (!newDays[iso]) newDays[iso] = {};
        if (!newDays[iso][r.matricula]) {
          newDays[iso][r.matricula] = r; // único por matrícula
        }
      }
    }

    setDaysMap(newDays);
  }, [records, fDesde, fHasta, fQuery]);

  /* ========== Datos derivados para el calendario ========== */

  const { first: firstMonthDay, last: lastMonthDay } = useMemo(
    () => monthRange(currentMonth),
    [currentMonth]
  );

  const gridStart = useMemo(() => startMonday(firstMonthDay), [firstMonthDay]);
  const gridEnd = useMemo(() => endSunday(lastMonthDay), [lastMonthDay]);

  // Celdas del calendario
  const calendarCells = useMemo(() => {
    const cells = [];
    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      const iso = toISO(d);
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isMuted = d.getMonth() !== currentMonth.getMonth();
      const isToday = iso === TODAY_ISO;
      const isSelected = iso === selectedIso;
      const count = daysMap[iso] ? Object.keys(daysMap[iso]).length : 0;

      cells.push({
        iso,
        date: new Date(d),
        isWeekend,
        isMuted,
        isToday,
        isSelected,
        count,
      });
    }
    return cells;
  }, [gridStart, gridEnd, currentMonth, daysMap, selectedIso]);

  // Licencias del día seleccionado
  const selectedLicencias = useMemo(() => {
    if (!selectedIso || !daysMap[selectedIso]) return [];
    return Object.values(daysMap[selectedIso]);
  }, [selectedIso, daysMap]);

  /* ========== Handlers UI ========== */

  const handlePrevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    setCurrentMonth(d);

    const { first, last } = monthRange(d);
    setFDesde(toISO(first));
    setFHasta(toISO(last));
  };

  const handleNextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    setCurrentMonth(d);

    const { first, last } = monthRange(d);
    setFDesde(toISO(first));
    setFHasta(toISO(last));
  };

  const handleMonthChange = (e) => {
    const newMonth = Number(e.target.value);
    const d = new Date(currentMonth);
    d.setMonth(newMonth);
    d.setDate(1);
    setCurrentMonth(d);

    const { first, last } = monthRange(d);
    setFDesde(toISO(first));
    setFHasta(toISO(last));
  };

  const handleYearChange = (e) => {
    const newYear = Number(e.target.value);
    const d = new Date(currentMonth);
    d.setFullYear(newYear);
    d.setDate(1);
    setCurrentMonth(d);

    const { first, last } = monthRange(d);
    setFDesde(toISO(first));
    setFHasta(toISO(last));
  };

  const handleHoy = () => {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentMonth(d);

    const { first, last } = monthRange(d);
    setFDesde(toISO(first));
    setFHasta(toISO(last));

    setSelectedIso(TODAY_ISO);
  };

  const handleFiltrarClick = () => {
    // En esta versión los filters ya disparan el efecto; el botón
    // existe solo para replicar la UX del HTML.
  };

  const handleSearchChange = (e) => {
    setFQuery(e.target.value);
  };

  const handleSelectDay = (iso) => {
    setSelectedIso(iso);
  };

  const thisYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = thisYear - 5; y <= thisYear + 5; y++) {
    yearOptions.push(y);
  }

  const dayTitleText =
    selectedIso && fromISO(selectedIso)
      ? fromISO(selectedIso).toLocaleDateString('es-AR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : 'Seleccioná un día';

  /* ========== Render ========== */

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Cargando licencias...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || records.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600 font-semibold mb-2">
            {error || 'No hay licencias confirmadas para mostrar.'}
          </p>
          <Button onClick={handleHoy} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Volver a hoy
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Título principal opcional */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[#0f2f4b]">
            <CalendarIcon className="h-5 w-5 text-[#0f2f4b]" />
            {toolName || 'Calendario de Licencias'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros superiores */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="fDesde">Desde</Label>
              <Input
                id="fDesde"
                type="date"
                value={fDesde}
                onChange={(e) => setFDesde(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fHasta">Hasta</Label>
              <Input
                id="fHasta"
                type="date"
                value={fHasta}
                onChange={(e) => setFHasta(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fQuery">Matrícula o Apellido y nombres</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="fQuery"
                  placeholder="Ej: 12345 o PEREZ JUAN"
                  value={fQuery}
                  onChange={handleSearchChange}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button className="w-full" onClick={handleFiltrarClick}>
                Filtrar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full text-[#0f2f4b] border-[#5EA6D7]"
                onClick={handleHoy}
              >
                Hoy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout principal: calendario + detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendario (2/3) */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-4 space-y-3">
            {/* NAV superior: flechas + mes */}
            <div className="flex items-center gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-xl"
                onClick={handlePrevMonth}
                aria-label="Mes anterior"
              >
                ◀
              </Button>
              <select
                value={currentMonth.getMonth()}
                onChange={handleMonthChange}
                className="flex-1 max-w-xl border rounded-xl px-3 py-2 text-sm"
              >
                {monthNames.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-xl"
                onClick={handleNextMonth}
                aria-label="Mes siguiente"
              >
                ▶
              </Button>
            </div>

            {/* NAV inferior: año */}
            <div className="flex justify-center">
              <select
                value={currentMonth.getFullYear()}
                onChange={handleYearChange}
                className="w-full max-w-xl border-2 border-[#0f2f4b] rounded-xl px-3 py-2 text-sm bg-[#eef6ff] font-semibold text-[#0f2f4b]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 mt-1">
              {DOW.map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] text-slate-500 font-medium"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Grid calendario */}
            <div className="grid grid-cols-7 gap-1 mt-1">
              {calendarCells.map((cell) => {
                const { iso, date, isMuted, isWeekend, isToday, isSelected, count } =
                  cell;

                const baseClasses =
                  'relative min-h-[70px] rounded-xl border text-left px-2 pt-1 pb-2 text-xs cursor-pointer transition-all';
                const colorClasses = [
                  isWeekend ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-200',
                  isMuted && 'text-slate-400',
                  isToday && !isSelected && 'border-[#5EA6D7]',
                  isSelected &&
                    'outline outline-2 outline-[#5EA6D7] bg-[#eef6ff] shadow-inner',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => handleSelectDay(iso)}
                    className={`${baseClasses} ${colorClasses}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-[11px]">
                        {date.getDate()}
                      </span>
                      {count > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0f2f4b] text-white text-[10px] font-semibold">
                          <PersonIcon />
                          <span>{count}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detalle del día */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0f2f4b]">
              {dayTitleText}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedIso && (
              <p className="text-xs text-slate-500">Sin selección</p>
            )}

            {selectedIso && selectedLicencias.length === 0 && (
              <p className="text-xs text-slate-500">
                Sin licencias para este día
              </p>
            )}

            {selectedLicencias.length > 0 && (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {selectedLicencias.map((it, idx) => (
                  <div
                    key={`${it.matricula}-${idx}`}
                    className="border-b border-slate-200 pb-2 last:border-b-0"
                  >
                    <div className="text-xs font-semibold text-[#0f2f4b]">
                      <span className="font-bold">#{it.matricula}</span> —{' '}
                      {it.nombre}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Del {it.desde} al {it.hasta}
                      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border border-slate-200 ml-2">
                        {it.tipo}
                      </span>
                      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border border-slate-200 ml-1">
                        {it.estado}
                      </span>
                    </div>
                    {it.motivo && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Motivo: {it.motivo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
