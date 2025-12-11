import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Case } from '@/entities/Case';
import { CalendarEvent } from '@/entities/CalendarEvent';
import { CalculatorResult } from '@/entities/CalculatorResult';
import { 
  Briefcase, 
  ArrowLeft, 
  Calendar,
  Calculator,
  FileText,
  Edit,
  Trash2,
  Plus,
  Video,
  Clock,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// ===============================
// Helpers de formato para resultados
// ===============================
const formatARS = (value) => {
  const num = typeof value === 'number' ? value : Number(value || 0);
  if (Number.isNaN(num)) return '-';
  return num.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDateShort = (value) => {
  if (!value) return '-';

  // Si ya viene como Date
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '-';
    return value.toLocaleDateString('es-AR');
  }

  let d;

  if (typeof value === 'string') {
    // Caso DD-MM-YYYY (lo que guarda la calculadora de plazos)
    const m = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      d = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd)
      );
    } else {
      // Cualquier otro formato que entienda new Date
      d = new Date(value);
    }
  } else {
    d = new Date(value);
  }

  if (Number.isNaN(d.getTime())) {
    // Si no lo puede interpretar, devuelvo el valor crudo
    return String(value);
  }

  return d.toLocaleDateString('es-AR');
};

export default function CaseDetail() {
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showEditCaseDialog, setShowEditCaseDialog] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    meetingLink: '',
    meetingPassword: '',
    isAllDay: false
  });
  const [caseForm, setCaseForm] = useState({
    title: '',
    caseNumber: '',
    court: '',
    plaintiff: '',
    defendant: '',
    status: 'active',
    startDate: '',
    notes: ''
  });

  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('caseId');

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    setLoading(true);
    
    const caseInfo = await Case.get(caseId);
    setCaseData(caseInfo);
    
    // Cargar datos en el formulario de edición
    setCaseForm({
      title: caseInfo.title || '',
      caseNumber: caseInfo.caseNumber || '',
      court: caseInfo.court || '',
      plaintiff: caseInfo.plaintiff || '',
      defendant: caseInfo.defendant || '',
      status: caseInfo.status || 'active',
      startDate: caseInfo.startDate ? new Date(caseInfo.startDate).toISOString().slice(0, 10) : '',
      notes: caseInfo.notes || ''
    });

    const caseEvents = await CalendarEvent.filter({ caseId }, '-startDate');
    setEvents(caseEvents);

    const caseResults = await CalculatorResult.filter({ caseId }, '-createdAt');
    setResults(caseResults);

    setLoading(false);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    if (editingEventId) {
      // Actualizar evento existente
      await CalendarEvent.update(editingEventId, eventForm);
    } else {
      // Crear nuevo evento
      await CalendarEvent.create({
        ...eventForm,
        caseId,
        userId: caseData.userId,
        color: 'blue'
      });
    }

    setShowEventDialog(false);
    setEditingEventId(null);
    setEventForm({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      meetingLink: '',
      meetingPassword: '',
      isAllDay: false
    });
    
    loadCaseData();
  };

  const handleOpenNewEventDialog = () => {
    setEditingEventId(null);
    setEventForm({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      meetingLink: '',
      meetingPassword: '',
      isAllDay: false
    });
    setShowEventDialog(true);
  };

  const handleEditEvent = (event) => {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
      location: event.location || '',
      meetingLink: event.meetingLink || '',
      meetingPassword: event.meetingPassword || '',
      isAllDay: event.isAllDay || false
    });
    setShowEventDialog(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (confirm('¿Estás seguro de eliminar este evento?')) {
      await CalendarEvent.delete(eventId);
      loadCaseData();
    }
  };

  const handleCloseEventDialog = () => {
    setShowEventDialog(false);
    setEditingEventId(null);
    setEventForm({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      meetingLink: '',
      meetingPassword: '',
      isAllDay: false
    });
  };

  const handleEditCase = async (e) => {
    e.preventDefault();
    
    await Case.update(caseId, caseForm);
    
    setShowEditCaseDialog(false);
    loadCaseData();
  };

  const handleDeleteResult = async (resultId) => {
    if (confirm('¿Estás seguro de eliminar este resultado?')) {
      await CalculatorResult.delete(resultId);
      loadCaseData();
    }
  };

  const handleDeleteCase = async () => {
    if (confirm('⚠️ ¿Estás seguro de eliminar este juicio?\n\nEsta acción eliminará:\n- El juicio\n- Todos sus eventos del calendario\n- Todos los resultados de calculadoras asociados\n\nEsta acción NO se puede deshacer.')) {
      try {
        // Eliminar todos los eventos asociados
        for (const event of events) {
          await CalendarEvent.delete(event.id);
        }
        
        // Eliminar todos los resultados asociados
        for (const result of results) {
          await CalculatorResult.delete(result.id);
        }
        
        // Eliminar el juicio
        await Case.delete(caseId);
        
        // Redirigir a FINLEGAL
        navigate(createPageUrl('FinLegal'));
      } catch (error) {
        alert('Error al eliminar el juicio. Por favor intenta nuevamente.');
        console.error('Error deleting case:', error);
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: 'Activo', variant: 'default' },
      pending: { text: 'Pendiente', variant: 'secondary' },
      closed: { text: 'Cerrado', variant: 'outline' },
      archived: { text: 'Archivado', variant: 'secondary' }
    };
    return badges[status] || badges.active;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">Juicio no encontrado</h3>
        <Button className="mt-4" onClick={() => navigate(createPageUrl('FinLegal'))}>
          Volver a FINLEGAL
        </Button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(caseData.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('FinLegal'))}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-blue-600" />
              {caseData.title}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
              {caseData.caseNumber && (
                <span className="text-gray-600">Exp: {caseData.caseNumber}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowEditCaseDialog(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteCase}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Juicio
          </Button>
        </div>
      </div>

      {/* Dialog para Editar Juicio */}
      <Dialog open={showEditCaseDialog} onOpenChange={setShowEditCaseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Juicio</DialogTitle>
            <DialogDescription>
              Modifica los datos del juicio
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCase} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="caseTitle">Título del Juicio *</Label>
              <Input
                id="caseTitle"
                placeholder="Ej: Juicio Laboral - García vs. Empresa SA"
                value={caseForm.title}
                onChange={(e) => setCaseForm({...caseForm, title: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseNumber">Número de Expediente</Label>
                <Input
                  id="caseNumber"
                  placeholder="Ej: 12345/2024"
                  value={caseForm.caseNumber}
                  onChange={(e) => setCaseForm({...caseForm, caseNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <select
                  id="status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={caseForm.status}
                  onChange={(e) => setCaseForm({...caseForm, status: e.target.value})}
                >
                  <option value="active">Activo</option>
                  <option value="pending">Pendiente</option>
                  <option value="closed">Cerrado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="court">Juzgado/Tribunal</Label>
              <Input
                id="court"
                placeholder="Ej: Juzgado Nacional del Trabajo N° 5"
                value={caseForm.court}
                onChange={(e) => setCaseForm({...caseForm, court: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plaintiff">Demandante</Label>
                <Input
                  id="plaintiff"
                  placeholder="Nombre del demandante"
                  value={caseForm.plaintiff}
                  onChange={(e) => setCaseForm({...caseForm, plaintiff: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defendant">Demandado</Label>
                <Input
                  id="defendant"
                  placeholder="Nombre del demandado"
                  value={caseForm.defendant}
                  onChange={(e) => setCaseForm({...caseForm, defendant: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={caseForm.startDate}
                onChange={(e) => setCaseForm({...caseForm, startDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales sobre el juicio..."
                value={caseForm.notes}
                onChange={(e) => setCaseForm({...caseForm, notes: e.target.value})}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowEditCaseDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Case Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Juicio</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {caseData.court && (
            <div>
              <p className="text-sm text-gray-500">Juzgado/Tribunal</p>
              <p className="font-medium">{caseData.court}</p>
            </div>
          )}
          {caseData.plaintiff && (
            <div>
              <p className="text-sm text-gray-500">Demandante</p>
              <p className="font-medium">{caseData.plaintiff}</p>
            </div>
          )}
          {caseData.defendant && (
            <div>
              <p className="text-sm text-gray-500">Demandado</p>
              <p className="font-medium">{caseData.defendant}</p>
            </div>
          )}
          {caseData.startDate && (
            <div>
              <p className="text-sm text-gray-500">Fecha de Inicio</p>
              <p className="font-medium">{new Date(caseData.startDate).toLocaleDateString()}</p>
            </div>
          )}
          {caseData.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Notas</p>
              <p className="font-medium">{caseData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendario ({events.length})
          </TabsTrigger>
          <TabsTrigger value="results">
            <Calculator className="h-4 w-4 mr-2" />
            Resultados ({results.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documentos
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Audiencias y Eventos</h3>
            <Button onClick={handleOpenNewEventDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Evento
            </Button>
          </div>

          {/* Dialog para Crear/Editar Evento */}
          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingEventId ? 'Editar Evento' : 'Crear Evento'}</DialogTitle>
                <DialogDescription>
                  {editingEventId ? 'Modifica los datos del evento' : 'Agrega una audiencia o evento al calendario del juicio'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eventTitle">Título *</Label>
                  <Input
                    id="eventTitle"
                    placeholder="Ej: Audiencia de conciliación"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Fecha y Hora de Inicio *</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={eventForm.startDate}
                      onChange={(e) => setEventForm({...eventForm, startDate: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Fecha y Hora de Fin</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm({...eventForm, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    placeholder="Ej: Sala 3, Juzgado Nacional del Trabajo"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meetingLink">Link de Reunión (Zoom/Meet)</Label>
                  <Input
                    id="meetingLink"
                    placeholder="https://zoom.us/j/..."
                    value={eventForm.meetingLink}
                    onChange={(e) => setEventForm({...eventForm, meetingLink: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meetingPassword">Contraseña de Reunión</Label>
                  <Input
                    id="meetingPassword"
                    placeholder="Contraseña de acceso"
                    value={eventForm.meetingPassword}
                    onChange={(e) => setEventForm({...eventForm, meetingPassword: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Detalles adicionales..."
                    value={eventForm.description}
                    onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleCloseEventDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingEventId ? 'Guardar Cambios' : 'Crear Evento'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">No hay eventos registrados</h3>
                <p className="text-gray-500 mt-2">Agrega audiencias y eventos al calendario</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <Card key={event.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          {event.title}
                        </h4>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {new Date(event.startDate).toLocaleString()}
                          </p>
                          {event.location && (
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </p>
                          )}
                          {event.meetingLink && (
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                Unirse a la reunión
                              </a>
                              {event.meetingPassword && (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  Contraseña: {event.meetingPassword}
                                </span>
                              )}
                            </div>
                          )}
                          {event.description && (
                            <p className="mt-2">{event.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEvent(event)}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

{/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Resultados de Calculadoras</h3>
          </div>

          {results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">
                  No hay resultados guardados
                </h3>
                <p className="text-gray-500 mt-2">
                  Los resultados de las calculadoras aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">

{results.map((result) => {
  // ⚠️ Algunos resultados usan "data" y otros "payload"
  const data = result.data || result.payload || {};
  const tipo = data.tipo || result.tipo || '';

  const esActualizacion = tipo === 'actualizacion';
  const esValorPresente = tipo === 'valor_presente_cuotas';
  const esAmortizacion = tipo === 'amortizacion_cuotas';
  const esPlazoSentencia = tipo === 'plazo_sentencia';

  // 🆕 Actualizador de cuota
  const esActualizadorCuota = tipo === 'actualizador_cuota';


  // 🆕 Indemnización LRT
  const esAccidentePaso1 = tipo === 'accidente_paso_1';
  const esAccidentePaso2 = tipo === 'accidente_paso_2';
  const esIndemnizacionLrtPaso3 = tipo === 'indemnizacion_lrt_paso_3';

  // 🆕 Vuotto – Méndez
  const esVuottoMendez = tipo === 'vuotto_mendez';

  // 🆕 Renta Periodica
  const esRentaPeriodica1746 = tipo === 'renta_periodica_1746';

    // ========== Datos para Renta Periódica – art. 1746 CCCN ==========
  const fechaNacimientoRP = data.fechaNacimiento || null;          // DD-MM-YYYY
  const fechaAccidenteRP = data.fechaAccidente || null;            // DD-MM-YYYY
  const fechaSentenciaRP = data.fechaSentencia || null;            // DD-MM-YYYY

  const edadAlAccidenteRP =
    data.edadAlAccidente !== undefined ? data.edadAlAccidente : null;
  const expectativaVidaRP =
    data.expectativaVida !== undefined ? data.expectativaVida : null;
  const nAniosResarcirRP =
    data.nAniosResarcir !== undefined ? data.nAniosResarcir : null;

  const salarioIngresadoRP =
    data.salarioIngresado != null ? Number(data.salarioIngresado) : null;
  const salarioUtilizadoRP =
    data.salarioUtilizado != null ? Number(data.salarioUtilizado) : null;
  const salarioFuenteRP = data.salarioFuente || null; // 'smvm' | 'manual'
  const smvmClaveRP = data.smvmClave || null;
  const smvmValorRP =
    data.smvmValor != null ? Number(data.smvmValor) : null;

  const incapacidadPorcRP =
    data.incapacidadPorc != null ? Number(data.incapacidadPorc) : null;
  const tasaAnualRP =
    data.tasaAnualPorc != null ? Number(data.tasaAnualPorc) : null;
  const tasaMoratoriaRP =
    data.tasaMoratoriaPorc != null ? Number(data.tasaMoratoriaPorc) : null;

  const diasMoratoriosRP =
    data.diasMoratorios !== undefined ? data.diasMoratorios : null;

  const baseAnualRP =
    data.baseAnual != null ? Number(data.baseAnual) : null;
  const capitalAccidenteRP =
    data.capitalAccidente != null ? Number(data.capitalAccidente) : null;
  const interesMoratorioRP =
    data.interesMoratorio != null ? Number(data.interesMoratorio) : null;
  const totalSentenciaRP =
    data.totalSentencia != null ? Number(data.totalSentencia) : null;

  const spanTxtRP = data.spanTxt || '';

    // ========== Datos para Vuotto – Méndez ==========
  const fechaNacimientoVM = data.fechaNacimiento || null; // viene en DD-MM-YYYY
  const fechaAccidenteVM = data.fechaAccidente || null;   // DD-MM-YYYY
  const edadAlAccidenteVM =
    data.edadAlAccidente !== undefined ? data.edadAlAccidente : null;

  const salarioVM = Number(data.salarioMensualBruto || 0);
  const incapacidadVM =
    data.incapacidadPorc != null ? Number(data.incapacidadPorc) : null; // ya viene en %
  const criterioVM = data.criterioSeleccionado || '';
  const vidaUtilVM =
    data.vidaUtil !== undefined ? data.vidaUtil : null;
  const tasaAnualVM =
    data.tasaAnualPorc != null ? Number(data.tasaAnualPorc) : null; // en %

  const indemnizacionVM = Number(data.indemnizacionSegunCriterio || 0);
  const montoVuottoVM =
    data.montoVuotto != null ? Number(data.montoVuotto) : null;
  const montoMendezVM =
    data.montoMendez != null ? Number(data.montoMendez) : null;


  // ========== Datos para cálculo de actualización ==========
  const entrada = data.entrada || {};
  const resumen = data.resultado || {};
  const simulaciones = Array.isArray(data.simulaciones)
    ? data.simulaciones
    : [];

  const capitalesHist =
    resumen.capitalesHistoricos || entrada.capitales || [];

  const baseCapital = capitalesHist.reduce(
    (s, c) => s + (Number(c.capital) || 0),
    0
  );
  const baseIntereses = capitalesHist.reduce(
    (s, c) => s + (Number(c.intereses) || 0),
    0
  );

  const capitalActual = Number(resumen.capitalActual || 0);
  const interesesAdeudados = Number(resumen.interesesAdeudados || 0);
  const interesesDevengados = Number(resumen.interesesDevengados || 0);
  const totalFinal =
    capitalActual + interesesAdeudados + interesesDevengados;

  const fechaCorte =
    entrada.fechaFinal || resumen.fechaFinal || null;
  const tipoTasaCalc =
    (resumen.tipoTasa || entrada.tipoTasa || '').toUpperCase();

  // ========== Datos para Valor Presente de cuotas ==========
  const entradaVP = data.entrada || {};
  const resultadoVP = data.resultado || {};
  const detalleCuotas = Array.isArray(data.detalleCuotas)
    ? data.detalleCuotas
    : [];

  const capitalAdeudadoVP = Number(
    resultadoVP.capitalAdeudado || entradaVP.capitalAdeudado || 0
  );
  const valorPresenteTotal = Number(resultadoVP.valorPresenteTotal || 0);
  const porcentajeCapitalVP =
    resultadoVP.porcentajeCapital != null
      ? Number(resultadoVP.porcentajeCapital)
      : null;

  const inflacionMensualVP =
    entradaVP.inflacionMensualDecimal != null
      ? Number(entradaVP.inflacionMensualDecimal) * 100
      : null;

  const cantidadCuotasVP = detalleCuotas.length;

    // ========== Datos para Actualizador de cuota ==========
  const remFechaAC = data.remFecha || null;

  const remInflAnualAC =
    data.remInflacionAnualPorc != null
      ? Number(data.remInflacionAnualPorc)
      : data.remInflacionAnualEsperada != null
      ? Number(data.remInflacionAnualEsperada)
      : null;

  const remInflMensualAC =
    data.remInflacionMensualPorc != null
      ? Number(data.remInflacionMensualPorc)
      : data.remInflacionMensualEquivalente != null
      ? Number(data.remInflacionMensualEquivalente)
      : null;

  const ultimaCuotaAC =
    data.ultimaCuota != null
      ? Number(data.ultimaCuota)
      : data.cuotaOriginal != null
      ? Number(data.cuotaOriginal)
      : null;

  const inflacionMensualAC =
    data.inflacionMensualPorc != null
      ? Number(data.inflacionMensualPorc)
      : data.inflPct != null
      ? Number(data.inflPct)
      : null;

  const tasaPuraAnualAC =
    data.tasaPuraAnualPorc != null
      ? Number(data.tasaPuraAnualPorc)
      : data.pura != null
      ? Number(data.pura)
      : null;

  const cuotaSoloInflacionAC =
    data.cuotaSoloInflacion != null
      ? Number(data.cuotaSoloInflacion)
      : data.cuotaInflacion != null
      ? Number(data.cuotaInflacion)
      : null;

  const cuotaActualizadaAC =
    data.cuotaInflacionMasPura != null
      ? Number(data.cuotaInflacionMasPura)
      : data.cuotaActualizada != null
      ? Number(data.cuotaActualizada)
      : null;

  const montoAjusteInflacionAC =
    data.montoAjusteInflacion != null
      ? Number(data.montoAjusteInflacion)
      : data.inflAmount != null
      ? Number(data.inflAmount)
      : null;

  const montoInteresPuroAC =
    data.montoInteresPuro != null
      ? Number(data.montoInteresPuro)
      : data.pureAmount != null
      ? Number(data.pureAmount)
      : null;

  // ========== Datos para Amortización de cuotas ==========
  const entradaAmort = data.entrada || {};
  const resultadoAmort = data.resultado || {};
  const scheduleAmort = Array.isArray(data.schedule)
    ? data.schedule
    : [];

  const capitalAdeudadoAmort = Number(entradaAmort.capital || 0);
  const totalAPagarAmort = Number(resultadoAmort.totalAPagar || 0);
  const inflacionMensualAmort =
    entradaAmort.tasaMensualDecimal != null
      ? Number(entradaAmort.tasaMensualDecimal) * 100
      : null;
  const numCuotasAmort =
    entradaAmort.numCuotas != null
      ? entradaAmort.numCuotas
      : scheduleAmort.length;
  const mensajeCuotasAmort = resultadoAmort.mensajeCuotas || '';

  // ========== Datos para Plazo de Sentencia ==========
  const entradaPlazo = data.entrada || {};
  const resultadoPlazo = data.resultado || {};

  // Soportar tanto la herramienta vieja (Sentencias) como la nueva (Plazos)
  const fueroRaw =
    entradaPlazo.fuero ||
    resultadoPlazo.fuero ||
    data.fuero ||
    '';
  const fueroLimpio =
    fueroRaw.replace(/^FUERO\s+/i, '').trim() || fueroRaw;

  const tipoSentencia =
    entradaPlazo.tipoSentencia ||
    resultadoPlazo.tipoSentencia ||
    data.tipoSentencia ||
    '';

  // Fechas guardadas por la herramienta nueva (Plazos) en DD-MM-YYYY
  const fechaProveidoPlazo =
    data.fechaProveido ||
    entradaPlazo.fechaProveido ||
    resultadoPlazo.fechaProveido ||
    null;

  const fechaNotificacionPlazo =
    data.fechaNotificacion ||
    resultadoPlazo.fechaNotificacion ||
    entradaPlazo.fechaNotificacion ||
    null;

  const fechaFirmezaCargoPlazo =
    data.fechaFirmezaConCargo ||
    resultadoPlazo.fechaFirmezaConCargo ||
    entradaPlazo.fechaFirmezaConCargo ||
    null;

  const fechaVencimientoPlazo =
    data.fechaVencimiento ||
    resultadoPlazo.fechaVencimiento ||
    entradaPlazo.fechaVencimiento ||
    null;

  const fechaMoraPlazo =
    data.fechaMora ||
    resultadoPlazo.fechaMora ||
    entradaPlazo.fechaMora ||
    null;

  const esperarFirmezaPlazo =
    data.esperarFirmeza ??
    resultadoPlazo.esperarFirmeza ??
    entradaPlazo.esperarFirmeza ??
    null;

  const diasFirmezaPlazo =
    data.diasFirmeza ??
    resultadoPlazo.diasFirmeza ??
    entradaPlazo.diasFirmeza ??
    null;

  const diasConteoPlazo =
    data.diasConteo ??
    resultadoPlazo.diasConteo ??
    entradaPlazo.diasConteo ??
    null;

  // Estado de vencimiento calculado sobre fechaVencimientoPlazo (cualquier formato)
  let estadoVencimiento = '';
  if (fechaVencimientoPlazo) {
    const hoy = new Date();
    const hoyMid = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );

    let fv;

    if (fechaVencimientoPlazo instanceof Date) {
      fv = fechaVencimientoPlazo;
    } else if (
      typeof fechaVencimientoPlazo === 'string' &&
      /^(\d{2})-(\d{2})-(\d{4})$/.test(fechaVencimientoPlazo)
    ) {
      const [, dd, mm, yyyy] =
        fechaVencimientoPlazo.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      fv = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd)
      );
    } else {
      fv = new Date(fechaVencimientoPlazo);
    }

    if (!Number.isNaN(fv.getTime())) {
      const fvMid = new Date(
        fv.getFullYear(),
        fv.getMonth(),
        fv.getDate()
      );
      const diffMs = fvMid.getTime() - hoyMid.getTime();
      const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (dias < 0) {
        estadoVencimiento = `Vencido hace ${Math.abs(dias)} día(s)`;
      } else if (dias === 0) {
        estadoVencimiento = 'Vence hoy';
      } else {
        estadoVencimiento = `Vence en ${dias} día(s) corridos`;
      }
    }
  }

  // ========== Datos para Indemnización LRT – Paso 1 ==========
  const fechaAccidentePaso1 =
    data.fechaAccidente || entrada.fechaAccidente || null;
  const ibmAccidentePaso1 = Number(
    data.ibmFechaAccidente ||
      data.ibmAccidente ||
      resumen.ibmFechaAccidente ||
      0
  );

  // ========== Datos para Indemnización LRT – Paso 2 ==========
  const fechaInicioPaso2 = data.fechaInicio || null;
  const fechaFinPaso2 = data.fechaFin || null;
  const ibmOriginalPaso2 = Number(data.montoIBM || 0);
  const ibmRipteSimple = Number(data.ibmRipteSimple || 0);
  const ibmRiptePonderado = Number(data.ibmRiptePonderado || 0);
  const ibmTasaActiva = Number(data.ibmTasaActiva || 0);

  // ========== Datos para Indemnización LRT – Paso 3 ==========
  const entradaPaso3 = data.entrada || {};
  const resultadoPaso3 = data.resultado || {};
  const fechaNacimientoPaso3 = entradaPaso3.fechaNacimiento || null;
  const fechaAccidentePaso3 = entradaPaso3.fechaAccidente || null;
  const edadAlAccidentePaso3 = entradaPaso3.edadAlAccidente ?? null;
  const porcentajeIncapacidadPaso3 =
    entradaPaso3.porcentajeIncapacidad ?? null;
  const resolucionMinimosPaso3 =
    entradaPaso3.resolucionMinimosAplicada || '';
  const rubrosProsperanPaso3 = Array.isArray(
    entradaPaso3.rubrosQueProsperan
  )
    ? entradaPaso3.rubrosQueProsperan
    : [];
  const fechaResultadoPaso3 = resultadoPaso3.fechaResultado || null;
  const resumenTextoPaso3 = resultadoPaso3.resumenTexto || '';

  return (
    <Card key={result.id}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              {result.toolName}
            </h4>

            {result.title && (
              <p className="text-sm text-gray-600 mt-1">
                {result.title}
              </p>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Guardado el{' '}
              {new Date(result.createdAt).toLocaleString('es-AR')}
            </p>

            {result.notes && (
              <p className="text-sm mt-2">{result.notes}</p>
            )}

            {/* 🔍 Actualización de capital */}
            {esActualizacion && (
              <div className="mt-3 bg-slate-50/70 border border-slate-200 rounded-md p-3 text-xs md:text-sm space-y-2">
                <p className="font-semibold text-slate-700">
                  Detalle de actualización de capital
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Período
                    </p>
                    <p className="font-medium">
                      Hasta{' '}
                      {fechaCorte
                        ? formatDateShort(fechaCorte)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Tipo de tasa
                    </p>
                    <p className="font-medium">
                      {tipoTasaCalc || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Base capital inicial
                    </p>
                    <p className="font-medium">
                      {formatARS(baseCapital)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Intereses iniciales
                    </p>
                    <p className="font-medium">
                      {formatARS(baseIntereses)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Capital actualizado
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {formatARS(capitalActual)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Interés adeudado
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {formatARS(interesesAdeudados)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Interés devengado
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {formatARS(interesesDevengados)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Total final
                    </p>
                    <p className="font-bold text-emerald-700">
                      {formatARS(totalFinal)}
                    </p>
                  </div>
                </div>

                {simulaciones.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 mb-1">
                      Comparación rápida de tasas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {simulaciones.map((sim) => (
                        <div
                          key={sim.tipo}
                          className="px-2 py-1 rounded-full bg-white border border-slate-200 text-[0.7rem]"
                        >
                          <span className="font-semibold mr-1">
                            {String(sim.tipo).toUpperCase()}:
                          </span>
                          <span>{formatARS(sim.total || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 🔍 Valor Presente de cuotas */}
            {esValorPresente && (
              <div className="mt-3 bg-slate-50/70 border border-slate-200 rounded-md p-3 text-xs md:text-sm space-y-2">
                <p className="font-semibold text-slate-700">
                  Detalle de valor presente de cuotas
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Capital adeudado de referencia
                    </p>
                    <p className="font-medium">
                      {formatARS(capitalAdeudadoVP)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Valor presente total
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {formatARS(valorPresenteTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      % del capital que cubre
                    </p>
                    <p className="font-medium">
                      {porcentajeCapitalVP != null
                        ? `${porcentajeCapitalVP.toLocaleString(
                            'es-AR',
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )} %`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Inflación mensual usada
                    </p>
                    <p className="font-medium">
                      {inflacionMensualVP != null
                        ? `${inflacionMensualVP.toLocaleString(
                            'es-AR',
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )} %`
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Cantidad de cuotas
                    </p>
                    <p className="font-medium">
                      {cantidadCuotasVP || '—'}
                    </p>
                  </div>
                </div>

                {detalleCuotas.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 mb-1">
                      Primeras cuotas (monto y valor presente)
                    </p>
                    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                      <table className="min-w-full text-[0.7rem]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-2 py-1 text-left">
                              #
                            </th>
                            <th className="px-2 py-1 text-left">
                              Fecha
                            </th>
                            <th className="px-2 py-1 text-right">
                              Cuota
                            </th>
                            <th className="px-2 py-1 text-right">
                              Valor presente
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalleCuotas
                            .slice(0, 5)
                            .map((c, idx) => (
                              <tr
                                key={idx}
                                className="border-t border-slate-100"
                              >
                                <td className="px-2 py-1">
                                  {idx + 1}
                                </td>
                                <td className="px-2 py-1">
                                  {c.fecha
                                    ? formatDateShort(c.fecha)
                                    : '—'}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {formatARS(c.monto)}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {formatARS(c.valorPresente)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 🔍 Amortización de cuotas */}
            {esAmortizacion && (
              <div className="mt-3 bg-slate-50/70 border border-slate-200 rounded-md p-3 text-xs md:text-sm space-y-2">
                <p className="font-semibold text-slate-700">
                  Detalle de simulación de cuotas
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Capital de referencia
                    </p>
                    <p className="font-medium">
                      {formatARS(capitalAdeudadoAmort)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Total a pagar
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {formatARS(totalAPagarAmort)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Cantidad de cuotas
                    </p>
                    <p className="font-medium">
                      {numCuotasAmort || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Inflación mensual usada
                    </p>
                    <p className="font-medium">
                      {inflacionMensualAmort != null
                        ? `${inflacionMensualAmort.toLocaleString(
                            'es-AR',
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )} %`
                        : '—'}
                    </p>
                  </div>
                </div>

                {mensajeCuotasAmort && (
                  <p className="mt-1 text-slate-700">
                    {mensajeCuotasAmort}
                  </p>
                )}

                {scheduleAmort.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 mb-1">
                      Primeras cuotas de la simulación
                    </p>
                    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                      <table className="min-w-full text-[0.7rem]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-2 py-1 text-left">
                              #
                            </th>
                            <th className="px-2 py-1 text-left">
                              Fecha
                            </th>
                            <th className="px-2 py-1 text-right">
                              Cuota
                            </th>
                            <th className="px-2 py-1 text-right">
                              Capital
                            </th>
                            <th className="px-2 py-1 text-right">
                              Saldo
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduleAmort.slice(0, 5).map((c, idx) => (
                            <tr
                              key={idx}
                              className="border-t border-slate-100"
                            >
                              <td className="px-2 py-1">
                                {c.numero ?? c.n ?? idx + 1}
                              </td>
                              <td className="px-2 py-1">
                                {c.fecha
                                  ? formatDateShort(c.fecha)
                                  : '—'}
                              </td>
                              <td className="px-2 py-1 text-right">
                                {formatARS(c.cuota ?? c.monto)}
                              </td>
                              <td className="px-2 py-1 text-right">
                                {formatARS(c.capital)}
                              </td>
                              <td className="px-2 py-1 text-right">
                                {formatARS(c.saldo)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 🔍 Plazo de sentencia / vencimiento */}
            {esPlazoSentencia && (
              <div className="mt-3 bg-[#E8F4FB] border border-blue-200 rounded-md p-3 text-xs md:text-sm space-y-2">
                <p className="font-semibold text-[#0f2f4b] flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#0f2f4b]" />
                  Registro de vencimiento de sentencia
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-[#0f2f4b]/70">
                      Fuero
                    </p>
                    <p className="font-medium text-[#0f2f4b]">
                      {fueroLimpio || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-[#0f2f4b]/70">
                      Tipo de sentencia
                    </p>
                    <p className="font-medium text-[#0f2f4b]">
                      {tipoSentencia || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-[#0f2f4b]/70">
                      Fecha del proveído
                    </p>
                    <p className="font-medium text-[#0f2f4b]">
                      {fechaProveidoPlazo
                        ? formatDateShort(fechaProveidoPlazo)
                        : '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-[#0f2f4b]/70">
                      Fecha de vencimiento
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {fechaVencimientoPlazo
                        ? formatDateShort(fechaVencimientoPlazo)
                        : '—'}
                    </p>
                  </div>
                </div>

                {estadoVencimiento && (
                  <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-[#0f2f4b] text-[0.75rem] font-semibold">
                    {estadoVencimiento}
                  </div>
                )}
              </div>
            )}
            
            {/* 🔍 Indemnización LRT – Paso 1: IBM a la fecha del accidente */}
            {esAccidentePaso1 && (
              <div className="mt-3 bg-slate-50/70 border border-slate-200 rounded-md p-3 text-xs md:text-sm space-y-2">
                <p className="font-semibold text-slate-700">
                  Indemnización LRT – Paso 1: IBM a la fecha del accidente
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fecha del accidente
                    </p>
                    <p className="font-medium">
                      {fechaAccidentePaso1
                        ? formatDateShort(fechaAccidentePaso1)
                        : '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      IBM a la fecha del accidente
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {formatARS(ibmAccidentePaso1 || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 🔍 Indemnización LRT – Paso 2: IBM actualizado */}
            {esAccidentePaso2 && (
              <div className="mt-3 bg-slate-50/70 border border-slate-200 rounded-md p-3 text-xs md:text-sm space-y-2">
                <p className="font-semibold text-slate-700">
                  Indemnización LRT – Paso 2: IBM actualizado
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fecha inicio
                    </p>
                    <p className="font-medium">
                      {fechaInicioPaso2
                        ? formatDateShort(fechaInicioPaso2)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fecha fin
                    </p>
                    <p className="font-medium">
                      {fechaFinPaso2
                        ? formatDateShort(fechaFinPaso2)
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      IBM original
                    </p>
                    <p className="font-medium">
                      {formatARS(ibmOriginalPaso2 || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      IBM – RIPTE DNU 669/19
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {formatARS(ibmRipteSimple || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      IBM – RIPTE Res. 332/23
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {formatARS(ibmRiptePonderado || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      IBM – Tasa activa BNA
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {formatARS(ibmTasaActiva || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 🔍 Indemnización LRT – Paso 3: Resultado final */}
            {esIndemnizacionLrtPaso3 && (
              <div className="mt-3 bg-slate-50/70 border border-slate-200 rounded-md p-3 text-xs md:text-sm space-y-3">
                <p className="font-semibold text-slate-700">
                  Indemnización LRT – Paso 3: resultado final
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fecha de nacimiento
                    </p>
                    <p className="font-medium">
                      {fechaNacimientoPaso3
                        ? formatDateShort(fechaNacimientoPaso3)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fecha del accidente
                    </p>
                    <p className="font-medium">
                      {fechaAccidentePaso3
                        ? formatDateShort(fechaAccidentePaso3)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Edad al accidente
                    </p>
                    <p className="font-medium">
                      {edadAlAccidentePaso3 != null
                        ? `${edadAlAccidentePaso3} años`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      % de incapacidad
                    </p>
                    <p className="font-medium">
                      {porcentajeIncapacidadPaso3 != null
                        ? `${Number(
                            porcentajeIncapacidadPaso3
                          ).toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} %`
                        : '—'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Resolución de mínimos aplicada
                    </p>
                    <p className="font-medium">
                      {resolucionMinimosPaso3 || '—'}
                    </p>
                  </div>
                </div>

                {rubrosProsperanPaso3.length > 0 && (
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 mb-1">
                      Rubros que prosperan
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {rubrosProsperanPaso3.map((rubro, idx) => (
                        <li key={idx}>{rubro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {resumenTextoPaso3 && (
                  <div className="border-t border-slate-200 pt-2">
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 mb-1">
                      Resultado total
                      {fechaResultadoPaso3 && (
                        <>
                          {' '}
                          al {formatDateShort(fechaResultadoPaso3)}
                        </>
                      )}
                    </p>
                    <p className="font-medium text-[#0f2f4b] whitespace-pre-line">
                      {resumenTextoPaso3}
                    </p>
                  </div>
                )}
              </div>
            )}

                        {/* 🔍 Actualizador de cuota (inflación + interés puro) */}
            {esActualizadorCuota && (
              <div className="mt-3 bg-slate-50/70 border border-slate-200 rounded-md p-3 text-xs md:text-sm space-y-3">
                <p className="font-semibold text-slate-700">
                  Actualizador de cuota (inflación + interés puro)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Última cuota ingresada
                    </p>
                    <p className="font-medium">
                      {ultimaCuotaAC != null ? formatARS(ultimaCuotaAC) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Inflación mensual utilizada
                    </p>
                    <p className="font-medium">
                      {inflacionMensualAC != null
                        ? `${inflacionMensualAC.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}%`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Tasa pura anual
                    </p>
                    <p className="font-medium">
                      {tasaPuraAnualAC != null
                        ? `${tasaPuraAnualAC.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}%`
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Cuota ajustada solo por inflación
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {cuotaSoloInflacionAC != null
                        ? formatARS(cuotaSoloInflacionAC)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Cuota ajustada por inflación + interés puro
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {cuotaActualizadaAC != null
                        ? formatARS(cuotaActualizadaAC)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Ajuste desagregado
                    </p>
                    <p className="font-medium whitespace-pre-line">
                      {montoAjusteInflacionAC != null
                        ? `Por inflación: ${formatARS(montoAjusteInflacionAC)}`
                        : ''}
                      {montoInteresPuroAC != null
                        ? `\nPor interés puro: ${formatARS(montoInteresPuroAC)}`
                        : ''}
                      {montoAjusteInflacionAC == null &&
                      montoInteresPuroAC == null
                        ? '—'
                        : ''}
                    </p>
                  </div>
                </div>

                {remFechaAC && (
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fuente de inflación esperada (REM)
                    </p>
                    <p className="font-medium">
                      {`Datos REM al ${remFechaAC} · anual: ${
                        remInflAnualAC != null
                          ? remInflAnualAC.toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }) + '%'
                          : '—'
                      } · mensual equivalente: ${
                        remInflMensualAC != null
                          ? remInflMensualAC.toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }) + '%'
                          : '—'
                      }`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 🔍 Vuotto – Méndez */}
            {esVuottoMendez && (
              <div className="mt-3 bg-slate-50/70 border border-slate-200 rounded-md p-3 text-xs md:text-sm space-y-3">
                <p className="font-semibold text-slate-700">
                  Cálculo Vuotto – Méndez (renta periódica)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fecha de nacimiento
                    </p>
                    <p className="font-medium">
                      {fechaNacimientoVM || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fecha del accidente
                    </p>
                    <p className="font-medium">
                      {fechaAccidenteVM || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Edad al accidente
                    </p>
                    <p className="font-medium">
                      {edadAlAccidenteVM != null
                        ? `${edadAlAccidenteVM} años`
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Salario mensual bruto
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {formatARS(salarioVM)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      % de incapacidad
                    </p>
                    <p className="font-medium">
                      {incapacidadVM != null
                        ? `${incapacidadVM.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} %`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Criterio usado
                    </p>
                    <p className="font-medium capitalize">
                      {criterioVM || '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Vida útil (n − edad)
                    </p>
                    <p className="font-medium">
                      {vidaUtilVM != null ? `${vidaUtilVM} años` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Tasa anual (i)
                    </p>
                    <p className="font-medium">
                      {tasaAnualVM != null
                        ? `${tasaAnualVM.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} %`
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Indemnización (criterio actual)
                    </p>
                    <p className="font-bold text-emerald-700">
                      {formatARS(indemnizacionVM)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Monto según Vuotto
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {montoVuottoVM != null
                        ? formatARS(montoVuottoVM)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Monto según Méndez
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {montoMendezVM != null
                        ? formatARS(montoMendezVM)
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 🔍 Renta Periódica – art. 1746 CCCN */}
            {esRentaPeriodica1746 && (
              <div className="mt-3 bg-slate-50/70 border border-slate-200 rounded-md p-3 text-xs md:text-sm space-y-3">
                <p className="font-semibold text-slate-700">
                  Renta periódica – art. 1746 CCCN
                </p>

                {/* Fechas y datos personales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fecha de nacimiento
                    </p>
                    <p className="font-medium">
                      {fechaNacimientoRP || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fecha del accidente
                    </p>
                    <p className="font-medium">
                      {fechaAccidenteRP || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fecha de sentencia
                    </p>
                    <p className="font-medium">
                      {fechaSentenciaRP || '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Edad al accidente
                    </p>
                    <p className="font-medium">
                      {edadAlAccidenteRP != null
                        ? `${edadAlAccidenteRP} años`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Expectativa de vida
                    </p>
                    <p className="font-medium">
                      {expectativaVidaRP != null
                        ? `${expectativaVidaRP} años`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Años a resarcir (n)
                    </p>
                    <p className="font-medium">
                      {nAniosResarcirRP != null
                        ? `${nAniosResarcirRP} años`
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Salario / SMVM */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Salario ingresado
                    </p>
                    <p className="font-medium">
                      {salarioIngresadoRP != null
                        ? formatARS(salarioIngresadoRP)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Salario utilizado en la base
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {salarioUtilizadoRP != null
                        ? formatARS(salarioUtilizadoRP)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Fuente del salario
                    </p>
                    <p className="font-medium capitalize">
                      {salarioFuenteRP === 'smvm'
                        ? 'SMVM vigente al accidente'
                        : salarioFuenteRP === 'manual'
                        ? 'Salario informado'
                        : '—'}
                    </p>
                  </div>
                </div>

                {smvmClaveRP && smvmValorRP != null && (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[0.7rem] font-semibold text-blue-800">
                      SMVM ({smvmClaveRP}):{' '}
                      <span className="font-bold">
                        {formatARS(smvmValorRP)}
                      </span>
                    </span>
                  </div>
                )}

                {/* Incapacidad y tasas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      % de incapacidad
                    </p>
                    <p className="font-medium">
                      {incapacidadPorcRP != null
                        ? `${incapacidadPorcRP.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} %`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Tasa anual (i)
                    </p>
                    <p className="font-medium">
                      {tasaAnualRP != null
                        ? `${tasaAnualRP.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} %`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Tasa moratoria
                    </p>
                    <p className="font-medium">
                      {tasaMoratoriaRP != null
                        ? `${tasaMoratoriaRP.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} %`
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Moratoria */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Días moratorios
                    </p>
                    <p className="font-medium">
                      {diasMoratoriosRP != null
                        ? `${diasMoratoriosRP} días`
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Montos principales */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Base anual (a)
                    </p>
                    <p className="font-medium">
                      {baseAnualRP != null
                        ? formatARS(baseAnualRP)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Capital a la fecha del accidente
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {capitalAccidenteRP != null
                        ? formatARS(capitalAccidenteRP)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Interés moratorio
                    </p>
                    <p className="font-semibold text-[#0f2f4b]">
                      {interesMoratorioRP != null
                        ? formatARS(interesMoratorioRP)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">
                      Total a la sentencia
                    </p>
                    <p className="font-bold text-emerald-700">
                      {totalSentenciaRP != null
                        ? formatARS(totalSentenciaRP)
                        : '—'}
                    </p>
                  </div>
                </div>

                {spanTxtRP && (
                  <p className="text-[0.7rem] text-slate-600 mt-1">
                    {spanTxtRP}
                  </p>
                )}
              </div>
            )}


          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteResult(result.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
})}



            </div>
          )}
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">Gestión de documentos próximamente</h3>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}