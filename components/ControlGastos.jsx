import React, { useEffect, useMemo, useState } from 'react';
import { Gasto } from '@/entities/Gasto';
import { Ingreso } from '@/entities/Ingreso';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Trash2,
  Plus,
  TrendingUp,
  DollarSign,
  Calendar,
  PieChart,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as Recharts from 'recharts';
import moment from 'moment';

const AZUL = '#0f2f4b';

const COLORES_CATEGORIAS = [
  '#0f2f4b', // Azul FINFOCUS
  '#5EA6D7', // Celeste FINFOCUS
  '#7FC8A9', // Verde suave
  '#F7D488', // Amarillo suave
  '#FF9F68', // Naranja
  '#C79DEB', // Violeta
  '#F7A6B3', // Rosa
  '#D3DCE6', // Gris suave
];

const COLOR_INGRESOS = "#2ecc71"; // verde
const COLOR_GASTOS = "#e74c3c";   // rojo

// ========= Helpers formato moneda FINFOCUS ================================

// "$ 1.234,56" – separador de miles ".", coma decimal
const formatMonedaInput = (raw) => {
  const soloDigitos = String(raw || '').replace(/\D/g, '');
  if (!soloDigitos) return '';
  const numero = parseFloat(soloDigitos) / 100;
  if (isNaN(numero)) return '';
  return numero.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseMoneda = (value) => {
  if (!value) return 0;
  // "$ 1.234,56" → "1234,56" → "1234.56"
  const numericString = String(value)
    .replace(/[^\d,]/g, '') // deja dígitos y coma
    .replace(/\./g, '') // quita puntos de miles
    .replace(',', '.'); // coma decimal → punto
  const n = parseFloat(numericString);
  return isNaN(n) ? 0 : n;
};

const fmtARS = (n) =>
  (Number(n) || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtFecha = (f) => (f ? moment(f).format('DD/MM/YYYY') : '-');

// ========= Config tarjetas (solo en front) ================================

const TARJETAS_DEFAULT = [
  { id: 'visa', nombre: 'Visa Banco X', diaCierre: 20, diaVencimiento: 10 },
  { id: 'master', nombre: 'Master Banco Y', diaCierre: 15, diaVencimiento: 5 },
];

// Genera fechas de N cuotas a partir de la fecha de compra
function generarFechasCuotas(fechaCompraStr, cantidadCuotas, tarjeta) {
  const fechas = [];
  const compra = moment(fechaCompraStr, 'YYYY-MM-DD');
  if (!compra.isValid() || !tarjeta || !cantidadCuotas) return fechas;

  const cierreMes = moment(compra).date(tarjeta.diaCierre);
  let primerVencimiento;

  if (compra.isAfter(cierreMes, 'day')) {
    primerVencimiento = moment(compra)
      .add(1, 'month')
      .date(tarjeta.diaVencimiento);
  } else {
    primerVencimiento = moment(compra).date(tarjeta.diaVencimiento);
  }

  for (let i = 0; i < cantidadCuotas; i++) {
    const vto = moment(primerVencimiento).add(i, 'month');
    fechas.push(vto.format('YYYY-MM-DD'));
  }

  return fechas;
}

// ========= Categorías (compatibles con los schemas) =======================

const CATEGORIAS_GASTO = [
  'Alimentación',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Ropa',
  'Tecnología',
  'Otros',
];

const CATEGORIAS_INGRESO = [
  'Sueldo',
  'Honorarios',
  'Alquileres',
  'Ventas',
  'Intereses',
  'Otros',
];

// ========= Componente principal ===========================================

export default function ControlGastosFinfocus() {
  const hoy = moment();

  const [gastos, setGastos] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const [tarjetas] = useState(TARJETAS_DEFAULT);

  const [mesSeleccionado, setMesSeleccionado] = useState(
    (hoy.month() + 1).toString()
  );
  const [anioSeleccionado, setAnioSeleccionado] = useState(
    hoy.year().toString()
  );

    // 👇 ESTA ES LA LÍNEA NUEVA
  const [vistaFlujo, setVistaFlujo] = useState('mensual'); // 'mensual' | 'anual'

  const [tipoMovimiento, setTipoMovimiento] = useState('GASTO');

  const [formData, setFormData] = useState({
    fecha: hoy.format('YYYY-MM-DD'),
    concepto: '',
    categoria: '',
    metodoPago: '',
    montoStr: '',
    notas: '',
    esRecurrente: false,
    esCuotas: false,
    cantidadCuotas: '',
    tarjetaId: '',
  });

  // ===== Carga inicial de BD =============================================

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setErrorCarga(null);
      try {
        const [g, i] = await Promise.all([
          Gasto.list('-fecha', 1000),
          Ingreso.list('-fecha', 1000),
        ]);
        setGastos(g || []);
        setIngresos(i || []);
      } catch (err) {
        console.error(err);
        setErrorCarga('No se pudieron cargar ingresos y gastos.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ===== Form helpers =====================================================

  const handleChange = (campo) => (e) => {
    const value = e && e.target ? e.target.value : e;
    setFormData((prev) => ({ ...prev, [campo]: value }));
  };

  const toggleCheck = (campo) => () => {
    setFormData((prev) => ({ ...prev, [campo]: !prev[campo] }));
  };

  const resetForm = () => {
    setFormData({
      fecha: hoy.format('YYYY-MM-DD'),
      concepto: '',
      categoria: '',
      metodoPago: '',
      montoStr: '',
      notas: '',
      esRecurrente: false,
      esCuotas: false,
      cantidadCuotas: '',
      tarjetaId: '',
    });
  };

  // ===== Submit ===========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const montoNumber = parseMoneda(formData.montoStr);
    if (!formData.fecha || !formData.concepto || !montoNumber) {
      alert('Completá al menos fecha, concepto y monto.');
      return;
    }

    try {
      if (tipoMovimiento === 'INGRESO') {
        // ---------- INGRESO ----------
        const payloadIngreso = {
          concepto: formData.concepto,
          monto: montoNumber,
          categoria: formData.categoria || 'Otros',
          fecha: formData.fecha,
          metodoPago: formData.metodoPago || 'Otro',
          notas: formData.notas || null,
          esRecurrente: formData.esRecurrente || false,
        };
        const creado = await Ingreso.create(payloadIngreso);
        setIngresos((prev) => [creado, ...prev]);
        resetForm();
        return;
      }

      // ---------- GASTO ----------
      const esCredito = formData.metodoPago === 'Crédito';

      // Gasto simple (sin cuotas) o no es crédito
      if (!esCredito || !formData.esCuotas) {
        const payloadGasto = {
          concepto: formData.concepto,
          monto: montoNumber,
          categoria: formData.categoria || 'Otros',
          fecha: formData.fecha,
          metodoPago: formData.metodoPago || 'Efectivo',
          cuotas: null,
          esCuota: false,
          numeroCuota: null,
          totalCuotas: null,
          gastoOriginalId: null,
          notas: formData.notas || null,
          esRecurrente: formData.esRecurrente || false,
        };
        const creado = await Gasto.create(payloadGasto);
        setGastos((prev) => [creado, ...prev]);
        resetForm();
        return;
      }

      // Gasto con crédito en CUOTAS
      const tarjeta = tarjetas.find((t) => t.id === formData.tarjetaId);
      if (!tarjeta) {
        alert('Seleccioná una tarjeta de crédito.');
        return;
      }

      const cantidadCuotas = parseInt(formData.cantidadCuotas || '0', 10);
      if (!cantidadCuotas || cantidadCuotas <= 0) {
        alert('Indicá la cantidad de cuotas.');
        return;
      }

      // 1) Crear registro original del gasto (padre)
      const gastoPadrePayload = {
        concepto: formData.concepto,
        monto: montoNumber,
        categoria: formData.categoria || 'Otros',
        fecha: formData.fecha, // fecha de compra
        metodoPago: 'Crédito',
        cuotas: cantidadCuotas,
        esCuota: false,
        numeroCuota: null,
        totalCuotas: cantidadCuotas,
        gastoOriginalId: null,
        notas: formData.notas || null,
        esRecurrente: formData.esRecurrente || false,
      };

      const gastoPadre = await Gasto.create(gastoPadrePayload);

      // 2) Crear cuotas individuales (hijas)
      const fechasCuotas = generarFechasCuotas(
        formData.fecha,
        cantidadCuotas,
        tarjeta
      );
      const montoCuota = montoNumber / cantidadCuotas;

      const nuevasCuotas = [];
      for (let i = 0; i < fechasCuotas.length; i++) {
        const cuotaPayload = {
          concepto: `${formData.concepto} (cuota ${i + 1}/${cantidadCuotas})`,
          monto: montoCuota,
          categoria: formData.categoria || 'Otros',
          fecha: fechasCuotas[i],
          metodoPago: 'Crédito',
          cuotas: null, // este registro es ya la cuota, no el plan
          esCuota: true,
          numeroCuota: i + 1,
          totalCuotas: cantidadCuotas,
          gastoOriginalId: gastoPadre.id,
          notas: formData.notas || null,
          esRecurrente: formData.esRecurrente || false,
        };
        const cuotaCreada = await Gasto.create(cuotaPayload);
        nuevasCuotas.push(cuotaCreada);
      }

      setGastos((prev) => [gastoPadre, ...nuevasCuotas, ...prev]);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al guardar el movimiento.');
    }
  };

  const handleDeleteGasto = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    try {
      await Gasto.delete(id);
      setGastos((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el gasto.');
    }
  };

  const handleDeleteIngreso = async (id) => {
    if (!window.confirm('¿Eliminar este ingreso?')) return;
    try {
      await Ingreso.delete(id);
      setIngresos((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el ingreso.');
    }
  };

  // ===== Filtrado por período ============================================

  const inicioMes = useMemo(
    () =>
      moment(
        `${anioSeleccionado}-${mesSeleccionado}-01`,
        'YYYY-MM-DD'
      ).startOf('day'),
    [anioSeleccionado, mesSeleccionado]
  );
  const finMes = useMemo(
    () => moment(inicioMes).endOf('month'),
    [inicioMes]
  );

  const gastosPeriodo = useMemo(
    () =>
      (gastos || []).filter((g) => {
        if (!g.fecha) return false;
        const f = moment(g.fecha);
        return f.isBetween(inicioMes, finMes, 'day', '[]');
      }),
    [gastos, inicioMes, finMes]
  );

  const ingresosPeriodo = useMemo(
    () =>
      (ingresos || []).filter((i) => {
        if (!i.fecha) return false;
        const f = moment(i.fecha);
        return f.isBetween(inicioMes, finMes, 'day', '[]');
      }),
    [ingresos, inicioMes, finMes]
  );

  // Para el flujo de caja usamos:
  // - todos los ingresos
  // - gastos SIN cuotas (cuotas == null) + cuotas individuales (esCuota === true)
  const gastosErogacionPeriodo = useMemo(
    () =>
      gastosPeriodo.filter(
        (g) => !g.cuotas || g.esCuota === true
      ),
    [gastosPeriodo]
  );

  // ===== Resumen mensual ==================================================

  const resumen = useMemo(() => {
    const totalIngresos = ingresosPeriodo.reduce(
      (acc, i) => acc + (i.monto || 0),
      0
    );
    const totalGastos = gastosErogacionPeriodo.reduce(
      (acc, g) => acc + (g.monto || 0),
      0
    );
    const balance = totalIngresos - totalGastos;
    const diasMes = inicioMes.daysInMonth();
    const promedioDiarioGasto = diasMes ? totalGastos / diasMes : totalGastos;

    return {
      totalIngresos,
      totalGastos,
      balance,
      promedioDiarioGasto,
    };
  }, [ingresosPeriodo, gastosErogacionPeriodo, inicioMes]);

  // ===== Flujo diario =====================================================

// ================================
// 📊 Flujo mensual (por día)
// ================================
const dataFlujoFondos = useMemo(() => {
  const dias = inicioMes.daysInMonth();
  const data = [];

  for (let d = 1; d <= dias; d++) {
    const fecha = moment(inicioMes).date(d);
    const fechaStr = fecha.format('YYYY-MM-DD');

    const ingresosDia = ingresosPeriodo
      .filter((i) => moment(i.fecha).format('YYYY-MM-DD') === fechaStr)
      .reduce((acc, i) => acc + (i.monto || 0), 0);

    const gastosDia = gastosErogacionPeriodo
      .filter((g) => moment(g.fecha).format('YYYY-MM-DD') === fechaStr)
      .reduce((acc, g) => acc + (g.monto || 0), 0);

    const saldoDia = ingresosDia - gastosDia; // 👉 saldo del día, NO acumulado

    data.push({
      fechaLabel: fecha.format('DD'),
      ingresosDia,
      gastosDia,
      saldoDia,
    });
  }

  return data;
}, [inicioMes, ingresosPeriodo, gastosErogacionPeriodo]);

// ================================
// 📊 Flujo ANUAL (agrupado por mes)
// ================================
const dataFlujoAnual = useMemo(() => {
  const year = parseInt(anioSeleccionado, 10);

  if (!year || !Array.isArray(ingresos) || !Array.isArray(gastos)) {
    return [];
  }

  const filas = [];

  for (let month = 0; month < 12; month++) {
    const inicio = moment({ year, month, day: 1 }).startOf('day');
    const fin = moment(inicio).endOf('month');

    const ingresosMes = ingresos
      .filter(
        (i) =>
          i.fecha &&
          moment(i.fecha).isBetween(inicio, fin, 'day', '[]')
      )
      .reduce((acc, i) => acc + (i.monto || 0), 0);

    const gastosMes = gastos
      .filter((g) => {
        if (!g.fecha) return false;
        const f = moment(g.fecha);
        const enMes = f.isBetween(inicio, fin, 'day', '[]');
        if (!enMes) return false;

        // misma lógica que en el flujo mensual:
        return !g.cuotas || g.esCuota === true;
      })
      .reduce((acc, g) => acc + (g.monto || 0), 0);

    const saldoMes = ingresosMes - gastosMes; // 👉 saldo del mes, NO acumulado

    filas.push({
      mesLabel: moment().month(month).format('MMM'), // "ene", "feb", ...
      ingresosMes,
      gastosMes,
      saldoMes,
    });
  }

  return filas;
}, [anioSeleccionado, ingresos, gastos]);


  // ===== Gastos por categoría ============================================

  const dataGastosPorCategoria = useMemo(() => {
    const mapa = new Map();
    gastosErogacionPeriodo.forEach((g) => {
      const cat = g.categoria || 'Otros';
      mapa.set(cat, (mapa.get(cat) || 0) + (g.monto || 0));
    });
    return Array.from(mapa.entries()).map(([categoria, total]) => ({
      categoria,
      total,
    }));
  }, [gastosErogacionPeriodo]);

  // ===== Cuotas (tab tarjetas) ===========================================

  const cuotasTodas = useMemo(
    () =>
      (gastos || [])
        .filter((g) => g.esCuota)
        .sort((a, b) => moment(a.fecha).diff(moment(b.fecha), 'day')),
    [gastos]
  );

  const resumenTarjeta = (tarjetaNombre) => {
    const ahora = moment();
    const mesActual = ahora.month() + 1;
    const anioActual = ahora.year();

    let totalMes = 0;
    let totalFuturo = 0;

    cuotasTodas.forEach((c) => {
      if (!c.fecha || c.metodoPago !== 'Crédito') return;
      // No tenemos el nombre de tarjeta en el schema; agrupamos por concepto si quisieras,
      // pero acá asumimos todas las cuotas de crédito se muestran juntas.
      const f = moment(c.fecha);
      const esMesActual =
        f.month() + 1 === mesActual && f.year() === anioActual;
      if (esMesActual) totalMes += c.monto || 0;
      if (f.isAfter(ahora, 'month')) totalFuturo += c.monto || 0;
    });

    const proximoVencimiento = ahora.format('DD/MM/YYYY');

    return {
      totalMes,
      totalFuturo,
      proximoVencimiento,
      tarjetaNombre,
    };
  };

  // ===== Años disponibles selects ========================================

  const aniosDisponibles = useMemo(() => {
    const set = new Set();
    gastos.forEach((g) => {
      if (!g.fecha) return;
      set.add(moment(g.fecha).year());
    });
    ingresos.forEach((i) => {
      if (!i.fecha) return;
      set.add(moment(i.fecha).year());
    });
    const arr = Array.from(set).sort((a, b) => a - b);
    if (arr.length === 0) return [hoy.year()];
    return arr;
  }, [gastos, ingresos]);

  // ===== Movimientos combinados para tabla ===============================

  const movimientosPeriodo = useMemo(() => {
    const movIng = ingresosPeriodo.map((i) => ({
      id: `ing-${i.id}`,
      tipo: 'Ingreso',
      concepto: i.concepto,
      categoria: i.categoria,
      metodoPago: i.metodoPago,
      fecha: i.fecha,
      monto: i.monto,
      origen: 'INGRESO',
      raw: i,
    }));
    const movGas = gastosErogacionPeriodo.map((g) => ({
      id: `gas-${g.id}`,
      tipo: 'Gasto',
      concepto: g.concepto,
      categoria: g.categoria,
      metodoPago: g.metodoPago,
      fecha: g.fecha,
      monto: g.monto,
      origen: 'GASTO',
      raw: g,
    }));

    return [...movIng, ...movGas].sort((a, b) =>
      moment(b.fecha).diff(moment(a.fecha), 'day')
    );
  }, [ingresosPeriodo, gastosErogacionPeriodo]);

  // ===== Render ===========================================================

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      {/* HERO */}

      {errorCarga && (
        <Alert variant="destructive">
          <AlertDescription>{errorCarga}</AlertDescription>
        </Alert>
      )}

      {/* RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Ingresos del mes
            </CardDescription>
            <CardTitle className="text-lg">
              {fmtARS(resumen.totalIngresos)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1">
              <Wallet className="w-4 h-4" />
              Gastos del mes
            </CardDescription>
            <CardTitle className="text-lg">
              {fmtARS(resumen.totalGastos)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Balance</CardDescription>
            <CardTitle
              className={`text-lg ${
                resumen.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {fmtARS(resumen.balance)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">
              Promedio diario de gasto
            </CardDescription>
            <CardTitle className="text-lg">
              {fmtARS(resumen.promedioDiarioGasto)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* SELECTOR PERÍODO */}
      <Card>
        <CardContent className="pt-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>Período para el resumen y los gráficos</span>
          </div>
          <div className="flex gap-2">
            <Select
              value={mesSeleccionado}
              onValueChange={setMesSeleccionado}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {moment.months().map((m, idx) => (
                  <SelectItem key={m} value={(idx + 1).toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={anioSeleccionado}
              onValueChange={setAnioSeleccionado}
            >
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aniosDisponibles.map((a) => (
                  <SelectItem key={a} value={a.toString()}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* TABS */}
      <Tabs defaultValue="registrar" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-3 bg-slate-100">
          <TabsTrigger
            value="registrar"
            className="text-xs md:text-sm data-[state=active]:bg-[#0f2f4b] data-[state=active]:text-white"
          >
            Registrar
          </TabsTrigger>
          <TabsTrigger
            value="resumen"
            className="text-xs md:text-sm data-[state=active]:bg-[#0f2f4b] data-[state=active]:text-white"
          >
            Resumen & flujo
          </TabsTrigger>
          <TabsTrigger
            value="tarjetas"
            className="text-xs md:text-sm data-[state=active]:bg-[#0f2f4b] data-[state=active]:text-white"
          >
            Tarjetas
          </TabsTrigger>
        </TabsList>

        {/* TAB REGISTRAR */}
        <TabsContent value="registrar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: AZUL }}>
                Registrar ingreso o gasto
              </CardTitle>
              <CardDescription className="text-xs">
                Montos con formato FINFOCUS (miles con punto, coma decimal).
                Para gastos en cuotas con crédito, se generan las cuotas
                automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo de movimiento */}
              <div className="flex gap-2 text-xs">
                <Button
                  type="button"
                  size="sm"
                  variant={tipoMovimiento === 'GASTO' ? 'default' : 'outline'}
                  onClick={() => setTipoMovimiento('GASTO')}
                  className={
                    tipoMovimiento === 'GASTO'
                      ? 'bg-[#0f2f4b] hover:bg-[#0d263c]'
                      : ''
                  }
                >
                  Gasto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={tipoMovimiento === 'INGRESO' ? 'default' : 'outline'}
                  onClick={() => setTipoMovimiento('INGRESO')}
                  className={
                    tipoMovimiento === 'INGRESO'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : ''
                  }
                >
                  Ingreso
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Fecha + concepto */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha</Label>
                    <Input
                      type="date"
                      value={formData.fecha}
                      onChange={handleChange('fecha')}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Concepto</Label>
                    <Input
                      value={formData.concepto}
                      onChange={handleChange('concepto')}
                      placeholder="Ej: Sueldo, supermercado, nafta..."
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Categoría + método pago */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Categoría</Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={handleChange('categoria')}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Seleccioná" />
                      </SelectTrigger>
                      <SelectContent>
                        {(tipoMovimiento === 'GASTO'
                          ? CATEGORIAS_GASTO
                          : CATEGORIAS_INGRESO
                        ).map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">
                      {tipoMovimiento === 'GASTO'
                        ? 'Método de pago'
                        : 'Método de cobro'}
                    </Label>
                    <Select
                      value={formData.metodoPago}
                      onValueChange={handleChange('metodoPago')}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Seleccioná" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoMovimiento === 'GASTO' ? (
                          <>
                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                            <SelectItem value="Débito">Débito</SelectItem>
                            <SelectItem value="Crédito">Crédito</SelectItem>
                            <SelectItem value="Transferencia">
                              Transferencia
                            </SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                            <SelectItem value="Transferencia">
                              Transferencia
                            </SelectItem>
                            <SelectItem value="Depósito">Depósito</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Recurrente</Label>
                    <div className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.esRecurrente}
                        onChange={toggleCheck('esRecurrente')}
                      />
                      <span>Solo informativo</span>
                    </div>
                  </div>
                </div>

                {/* Cuotas (solo gasto + crédito) */}
                {tipoMovimiento === 'GASTO' &&
                  formData.metodoPago === 'Crédito' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border rounded-lg p-3 bg-slate-50/70">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          Compra en cuotas
                        </Label>
                        <div className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={formData.esCuotas}
                            onChange={toggleCheck('esCuotas')}
                          />
                          <span>Sí, financiar</span>
                        </div>
                      </div>

                      {formData.esCuotas && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">Cantidad de cuotas</Label>
                            <Input
                              type="number"
                              min={1}
                              value={formData.cantidadCuotas}
                              onChange={handleChange('cantidadCuotas')}
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Tarjeta</Label>
                            <Select
                              value={formData.tarjetaId}
                              onValueChange={handleChange('tarjetaId')}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Seleccioná tarjeta" />
                              </SelectTrigger>
                              <SelectContent>
                                {tarjetas.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                {/* Monto + notas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {tipoMovimiento === 'GASTO'
                        ? 'Monto del gasto'
                        : 'Monto del ingreso'}
                    </Label>
                    <Input
                      value={formData.montoStr}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          montoStr: formatMonedaInput(e.target.value),
                        }))
                      }
                      placeholder="$ 0,00"
                      className="h-9 text-xs text-left"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notas</Label>
                  <Textarea
                    value={formData.notas}
                    onChange={handleChange('notas')}
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={resetForm}
                    className="text-xs"
                  >
                    Limpiar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs bg-[#0f2f4b] hover:bg-[#0d263c] text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Guardar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Últimos movimientos (mini tabla) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: AZUL }}>
                Últimos movimientos
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="text-xs text-slate-500">Cargando...</div>
              ) : movimientosPeriodo.length === 0 ? (
                <div className="text-xs text-slate-500">
                  No hay movimientos en el período seleccionado.
                </div>
              ) : (
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientosPeriodo.slice(0, 10).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{fmtFecha(m.fecha)}</TableCell>
                        <TableCell>{m.tipo}</TableCell>
                        <TableCell>{m.concepto}</TableCell>
                        <TableCell>{m.categoria}</TableCell>
                        <TableCell className="text-right">
                          {fmtARS(m.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

{/* TAB RESUMEN & FLUJO */}
<TabsContent value="resumen" className="space-y-6">
  {/* ============================
      GRÁFICOS UNO DEBAJO DEL OTRO
      ============================ */}
  <div className="grid grid-cols-1 gap-6">
    {/* Card 1: Ingresos vs Gastos */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Ingresos vs Gastos
            </CardTitle>
            <CardDescription className="text-xs">
              {vistaFlujo === 'mensual'
                ? 'Comparación diaria del mes seleccionado.'
                : 'Comparación mensual del año seleccionado.'}
            </CardDescription>
          </div>

          <div className="flex gap-1 text-[11px] bg-slate-100 rounded-full p-1">
            <button
              type="button"
              onClick={() => setVistaFlujo('mensual')}
              className={`px-2 py-0.5 rounded-full ${
                vistaFlujo === 'mensual'
                  ? 'bg-white shadow text-[#0f2f4b]'
                  : 'text-slate-500'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setVistaFlujo('anual')}
              className={`px-2 py-0.5 rounded-full ${
                vistaFlujo === 'anual'
                  ? 'bg-white shadow text-[#0f2f4b]'
                  : 'text-slate-500'
              }`}
            >
              Anual
            </button>
          </div>
        </div>
      </CardHeader>

      {/* 🔥 Altura aumentada */}
      <CardContent style={{ height: 330 }}>
        <Recharts.ResponsiveContainer width="100%" height="100%">
          <Recharts.BarChart
            data={vistaFlujo === 'mensual' ? dataFlujoFondos : dataFlujoAnual}
          >
            <Recharts.CartesianGrid strokeDasharray="3 3" />
            <Recharts.XAxis
              dataKey={vistaFlujo === 'mensual' ? 'fechaLabel' : 'mesLabel'}
            />
            <Recharts.YAxis />
            <Recharts.Tooltip
              formatter={(value) => fmtARS(value)}
              labelFormatter={(label) =>
                vistaFlujo === 'mensual' ? `Día ${label}` : label
              }
            />
            <Recharts.Legend />
            <Recharts.Bar
              dataKey={vistaFlujo === 'mensual' ? 'ingresosDia' : 'ingresosMes'}
              name="Ingresos"
              fill={COLOR_INGRESOS}
            />
            <Recharts.Bar
              dataKey={vistaFlujo === 'mensual' ? 'gastosDia' : 'gastosMes'}
              name="Gastos"
              fill={COLOR_GASTOS}
            />
          </Recharts.BarChart>
        </Recharts.ResponsiveContainer>
      </CardContent>
    </Card>

    {/* Card 2: Flujo / Saldo */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PieChart className="w-4 h-4" />
          Flujo de fondos (saldo)
        </CardTitle>
        <CardDescription className="text-xs">
          {vistaFlujo === 'mensual'
            ? 'Saldo diario (ingresos - gastos) en el mes.'
            : 'Saldo mensual (ingresos - gastos) en el año.'}
        </CardDescription>
      </CardHeader>

      {/* 🔥 Altura aumentada */}
      <CardContent style={{ height: 330 }}>
        <Recharts.ResponsiveContainer width="100%" height="100%">
          <Recharts.BarChart
            data={vistaFlujo === 'mensual' ? dataFlujoFondos : dataFlujoAnual}
          >
            <Recharts.CartesianGrid strokeDasharray="3 3" />
            <Recharts.XAxis
              dataKey={vistaFlujo === 'mensual' ? 'fechaLabel' : 'mesLabel'}
            />
            <Recharts.YAxis />
            <Recharts.Tooltip
              formatter={(value) => fmtARS(value)}
              labelFormatter={(label) =>
                vistaFlujo === 'mensual' ? `Día ${label}` : label
              }
            />

            <Recharts.Bar
              dataKey={vistaFlujo === 'mensual' ? 'saldoDia' : 'saldoMes'}
              name="Saldo"
            >
              {(vistaFlujo === 'mensual'
                ? dataFlujoFondos
                : dataFlujoAnual
              ).map((entry, index) => (
                <Recharts.Cell
                  key={`saldo-${index}`}
                  fill={
                    (vistaFlujo === 'mensual'
                      ? entry.saldoDia
                      : entry.saldoMes) >= 0
                      ? COLOR_INGRESOS
                      : COLOR_GASTOS
                  }
                />
              ))}
            </Recharts.Bar>
          </Recharts.BarChart>
        </Recharts.ResponsiveContainer>
      </CardContent>
    </Card>
  </div>

  {/* ======================================================
      TABLA DE MOVIMIENTOS — ESTA PARTE QUEDA COMO ESTABA
     ====================================================== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: AZUL }}>
                Historial de movimientos del período
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {movimientosPeriodo.length === 0 ? (
                <div className="text-xs text-slate-500">
                  No hay movimientos registrados en este período.
                </div>
              ) : (
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientosPeriodo.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{fmtFecha(m.fecha)}</TableCell>
                        <TableCell>{m.tipo}</TableCell>
                        <TableCell>{m.concepto}</TableCell>
                        <TableCell>{m.categoria}</TableCell>
                        <TableCell>{m.metodoPago}</TableCell>
                        <TableCell className="text-right">
                          {fmtARS(m.monto)}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.origen === 'GASTO' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteGasto(m.raw.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteIngreso(m.raw.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB TARJETAS */}
        <TabsContent value="tarjetas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Resumen de cuotas con crédito
              </CardTitle>
              <CardDescription className="text-xs">
                Total a pagar este mes y cuotas futuras de todas las compras en
                crédito.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Como no tenemos tarjetaNombre en schema, hacemos un solo resumen global */}
              {(() => {
                const r = resumenTarjeta('Tarjetas de crédito');
                return (
                  <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {r.tarjetaNombre}
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Próximo vencimiento aprox.: {r.proximoVencimiento}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Este mes</span>
                        <strong>{fmtARS(r.totalMes)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Cuotas futuras</span>
                        <strong>{fmtARS(r.totalFuturo)}</strong>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: AZUL }}>
                Cuotas registradas
              </CardTitle>
              <CardDescription className="text-xs">
                Todas las cuotas generadas (pasadas y futuras).
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {cuotasTodas.length === 0 ? (
                <div className="text-xs text-slate-500">
                  No hay cuotas registradas.
                </div>
              ) : (
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Cuota</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuotasTodas.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{fmtFecha(c.fecha)}</TableCell>
                        <TableCell>{c.concepto}</TableCell>
                        <TableCell>
                          {c.numeroCuota && c.totalCuotas
                            ? `${c.numeroCuota}/${c.totalCuotas}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtARS(c.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
