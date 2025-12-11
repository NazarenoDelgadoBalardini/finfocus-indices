import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Video, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CalendarView({ events = [], cases = [], nonWorkingDays = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [showEventDialog, setShowEventDialog] = useState(false);

  // Debug: Ver qué datos de inhábiles están llegando
  useEffect(() => {
    if (nonWorkingDays.length > 0) {
      console.log('📊 Días inhábiles recibidos:', nonWorkingDays.length);
      nonWorkingDays.forEach((nwd, idx) => {
        console.log(`  ${idx + 1}. ${nwd.sheetName || nwd.category}:`, {
          headers: nwd.headers,
          totalRows: nwd.data?.length || 0,
          firstRow: nwd.data?.[0],
          category: nwd.category
        });
      });
    } else {
      console.warn('⚠️ No se recibieron días inhábiles');
    }
  }, [nonWorkingDays]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Obtener días del mes
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Días del mes anterior (para completar la primera semana)
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({ date: prevMonthDay, isCurrentMonth: false });
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Días del mes siguiente (para completar la última semana)
    const remainingDays = 42 - days.length; // 6 semanas * 7 días
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  // Parsear fecha en diferentes formatos
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Intentar formato DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // Asumir DD/MM/YYYY
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Meses en JS son 0-indexed
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    
    // Intentar formato ISO o cualquier otro formato estándar
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  // Verificar si una fecha es inhábil
  const isNonWorkingDay = (date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    
    return nonWorkingDays.some(nwd => {
      // Verificar que tengamos datos y headers
      if (!nwd.data || !Array.isArray(nwd.data) || !nwd.headers || !Array.isArray(nwd.headers)) {
        return false;
      }

      // Buscar el índice de la columna de fecha en los headers
      // Ahora también buscamos columnas que contengan "inhábil" o "inhabiles"
      const dateColumnIndex = nwd.headers.findIndex(header => {
        const h = header?.toLowerCase() || '';
        return h.includes('fecha') || h.includes('date') || h.includes('inhábil') || h.includes('inhabiles');
      });

      if (dateColumnIndex === -1) {
        console.warn(`⚠️ No se encontró columna de fecha en ${nwd.sheetName}. Headers:`, nwd.headers);
        return false;
      }

      console.log(`✅ Usando columna "${nwd.headers[dateColumnIndex]}" (índice ${dateColumnIndex}) para ${nwd.sheetName}`);

      // Buscar en el array de datos usando el índice correcto
      return nwd.data.some(row => {
        if (!Array.isArray(row) || row.length <= dateColumnIndex) {
          return false;
        }

        const cellValue = row[dateColumnIndex];
        if (!cellValue) return false;

        // Parsear y normalizar la fecha
        const parsedDate = parseDate(cellValue);
        if (!parsedDate) return false;

        const normalizedDate = formatDateToYYYYMMDD(parsedDate);
        const isMatch = normalizedDate === dateStr;
        
        if (isMatch) {
          console.log(`🔴 Día inhábil encontrado: ${dateStr} (valor original: ${cellValue})`);
        }
        
        return isMatch;
      });
    });
  };

  // Verificar si una fecha es el inicio o fin de un evento
  const isEventStartOrEnd = (date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    
    return events.some(event => {
      const startDateStr = formatDateToYYYYMMDD(new Date(event.startDate));
      const endDateStr = formatDateToYYYYMMDD(new Date(event.endDate));
      
      return dateStr === startDateStr || dateStr === endDateStr;
    });
  };

  // Obtener eventos de un día específico (inicio o fin)
  const getEventsForDay = (date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    return events.filter(event => {
      const startDateStr = formatDateToYYYYMMDD(new Date(event.startDate));
      const endDateStr = formatDateToYYYYMMDD(new Date(event.endDate));
      return dateStr === startDateStr || dateStr === endDateStr;
    });
  };

  // Formatear fecha a YYYY-MM-DD
  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Verificar si es hoy
  const isToday = (date) => {
    const today = new Date();
    return formatDateToYYYYMMDD(date) === formatDateToYYYYMMDD(today);
  };

  // Navegar entre meses
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Manejar clic en un día
  const handleDayClick = (day) => {
    if (!day.isCurrentMonth) return;
    
    const dayEvents = getEventsForDay(day.date);
    setSelectedDay(day.date);
    setSelectedDayEvents(dayEvents);
    setShowEventDialog(true);
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-4">
      {/* Header del calendario */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoy
              </Button>
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Nombres de los días */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day.date);
              const hasEvents = dayEvents.length > 0;
              const isNonWorking = isNonWorkingDay(day.date);
              const isTodayDate = isToday(day.date);

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[80px] p-2 border rounded-lg cursor-pointer transition-all
                    ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                    ${isNonWorking && day.isCurrentMonth ? 'bg-red-50 border-red-200' : ''}
                    ${isTodayDate ? 'border-blue-500 border-2 bg-blue-50' : ''}
                    ${hasEvents && day.isCurrentMonth ? 'border-green-300 bg-green-50' : ''}
                    hover:shadow-md hover:scale-105
                  `}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${isTodayDate ? 'text-blue-600' : ''}`}>
                        {day.date.getDate()}
                      </span>
                      {hasEvents && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {dayEvents.length}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Indicadores de eventos */}
                    {hasEvents && day.isCurrentMonth && (
                      <div className="flex-1 space-y-1">
                        {dayEvents.slice(0, 2).map((event, idx) => {
                          const dateStr = formatDateToYYYYMMDD(day.date);
                          const startDateStr = formatDateToYYYYMMDD(new Date(event.startDate));
                          const endDateStr = formatDateToYYYYMMDD(new Date(event.endDate));
                          const isStart = dateStr === startDateStr;
                          const isEnd = dateStr === endDateStr;
                          
                          return (
                            <div
                              key={idx}
                              className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded truncate"
                              title={`${event.title} - ${isStart ? 'Inicio' : 'Fin'}`}
                            >
                              {isStart ? '▶' : '⏹'} {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayEvents.length - 2} más
                          </div>
                        )}
                      </div>
                    )}

                    {/* Indicador de día inhábil */}
                    {isNonWorking && day.isCurrentMonth && !hasEvents && (
                      <div className="text-xs text-red-600 font-medium">
                        Inhábil
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span>Día inhábil</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border-2 border-blue-500 rounded"></div>
              <span>Hoy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-green-300 rounded"></div>
              <span>Con eventos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de eventos del día */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Eventos del {selectedDay && selectedDay.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </DialogTitle>
          </DialogHeader>

          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay eventos programados para este día</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDayEvents.map((event) => {
                const relatedCase = cases.find(c => c.id === event.caseId);
                
                return (
                  <Card key={event.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-lg">{event.title}</h4>
                          {relatedCase && (
                            <Badge variant="outline" className="ml-2">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {relatedCase.title}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {new Date(event.startDate).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
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
                              <a
                                href={event.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
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
                            <p className="mt-2 text-gray-700 bg-gray-50 p-3 rounded">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}