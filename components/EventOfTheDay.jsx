import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EventOfTheDay({ user, events = [], cases = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [todayEvents, setTodayEvents] = useState([]);
  const [nextEvent, setNextEvent] = useState(null);
  const navigate = useNavigate();

  // Verificar si el usuario tiene FINLEGAL TOTAL
  const hasFinLegalTotal = () => {
    if (!user?.userRoles) return false;

    let roles = [];
    const raw = user.userRoles;

    if (Array.isArray(raw)) {
      roles = raw;
    } else if (typeof raw === 'string' && raw.trim() !== '') {
      try {
        const parsed = JSON.parse(raw);
        roles = Array.isArray(parsed) ? parsed : [raw.trim()];
      } catch {
        roles = raw.split(',').map((r) => r.trim()).filter(Boolean);
      }
    }

    return roles.includes('FINLEGAL_TOTAL');
  };

  // Formatear fecha a YYYY-MM-DD
  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Obtener eventos del día actual y próximo evento
  useEffect(() => {
    if (!events || events.length === 0) return;

    const now = new Date();
    const todayStr = formatDateToYYYYMMDD(now);

    // Filtrar eventos de hoy
    const eventsToday = events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return formatDateToYYYYMMDD(eventDate) === todayStr;
    });

    // Ordenar por hora
    eventsToday.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    setTodayEvents(eventsToday);

    // Encontrar el próximo evento (futuro)
    const futureEvents = events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return eventDate > now;
    });

    futureEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    if (futureEvents.length > 0) {
      setNextEvent(futureEvents[0]);
    } else {
      setNextEvent(null);
    }
  }, [events]);

  const hasAccess = hasFinLegalTotal();

  // =========================
  // DECORACIÓN HERO COMPARTIDA
  // =========================
  const HeroBackground = () => (
    <>
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#1a4f72]/40 to-[#0f2f4b]/70 rounded-full blur-3xl -z-0" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#1a4f72]/30 to-[#0f2f4b]/60 rounded-full blur-3xl -z-0" />
    </>
  );

  // =========================
  // SIN ACCESO (BLOQUEADO)
  // =========================
  if (!hasAccess) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-r from-[#0f2f4b] via-[#1a4f72] to-[#0f2f4b] border border-white/15">
        <CardContent className="p-6">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-full shadow-md border border-white/20">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                    Evento del Día
                  </h3>
                  <p className="text-white/80 mt-1">
                    Panel de avisos diarios vinculado a tu calendario personalizado
                  </p>
                </div>
              </div>
              <Lock className="h-12 w-12 text-white/50" />
            </div>

            {/* Mensaje de upgrade */}
            <div className="mt-6 bg-white/90 backdrop-blur-sm p-6 rounded-lg border border-[#0f2f4b]/10">
              <div className="text-center">
                <Lock className="h-12 w-12 text-[#0f2f4b] mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-[#0f2f4b] mb-2">
                  Función exclusiva de FINLEGAL TOTAL
                </h4>
                <p className="text-[#0f2f4b]/80 mb-4 max-w-2xl mx-auto text-sm">
                  Suscribite a <strong>FINLEGAL TOTAL</strong> para acceder a un panel con avisos diarios
                  vinculado al calendario que personalizaste. Nunca más te pierdas una audiencia o
                  vencimiento importante.
                </p>
                <Button
                  onClick={() => navigate(createPageUrl('Planes'))}
                  className="bg-white text-[#0f2f4b] hover:bg-white/90 font-semibold"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ver Planes FINLEGAL
                </Button>
              </div>
            </div>
          </div>

          <HeroBackground />
        </CardContent>
      </Card>
    );
  }

  // =========================
  // CON ACCESO, SIN EVENTOS HOY
  // =========================
  if (todayEvents.length === 0) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-r from-[#0f2f4b] via-[#1a4f72] to-[#0f2f4b] border border-white/15">
        <CardContent className="p-6">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-full shadow-md border border-white/20">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                    Evento del Día
                  </h3>
                  <p className="text-white/80 mt-1">
                    No tenés eventos programados para hoy
                  </p>
                </div>
              </div>
            </div>

            {/* Próximo evento */}
            {nextEvent && (
              <div className="mt-4 bg-white/95 p-4 rounded-lg border border-[#0f2f4b]/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-[#1a4f72]" />
                  <h4 className="font-semibold text-[#0f2f4b]">Próximo evento:</h4>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#0f2f4b] text-sm">{nextEvent.title}</p>
                    <p className="text-xs text-[#0f2f4b]/70">
                      {new Date(nextEvent.startDate).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge className="bg-[#1a4f72] text-white text-xs">
                    {(() => {
                      const now = new Date();
                      const eventDate = new Date(nextEvent.startDate);
                      const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));

                      if (diffDays === 1) return 'Mañana';
                      if (diffDays <= 7) return `En ${diffDays} días`;
                      return `${diffDays} días`;
                    })()}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <HeroBackground />
        </CardContent>
      </Card>
    );
  }

  // =========================
  // CON ACCESO Y CON EVENTOS HOY
  // =========================
  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-[#0f2f4b] via-[#1a4f72] to-[#0f2f4b] border border-white/15">
      <CardContent className="p-6">
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-full shadow-md animate-pulse">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-yellow-400" />
                  Evento del Día
                </h3>
                <p className="text-white/80 mt-1">
                  Tenés <strong>{todayEvents.length}</strong>{' '}
                  {todayEvents.length === 1 ? 'evento programado' : 'eventos programados'} para hoy
                </p>
              </div>
            </div>

            {todayEvents.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-white/90 text-[#0f2f4b] border-none hover:bg-white"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Ver todos ({todayEvents.length})
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Eventos de hoy */}
          <div className="space-y-3">
            {(isExpanded ? todayEvents : todayEvents.slice(0, 1)).map((event) => {
              const relatedCase = cases.find((c) => c.id === event.caseId);
              const eventDate = new Date(event.startDate);
              const now = new Date();
              const isPast = eventDate < now;
              const isNow = Math.abs(eventDate - now) < 3600000; // Dentro de 1 hora

              return (
                <div
                  key={event.id}
                  className="bg-white/95 backdrop-blur-sm p-4 rounded-lg border border-[#0f2f4b]/15 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => {
                    if (event.caseId) {
                      navigate(createPageUrl(`CaseDetail?caseId=${event.caseId}`));
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-sm text-[#0f2f4b]">{event.title}</h4>

                        {isNow && (
                          <Badge className="bg-[#1a4f72] text-white text-[11px]">
                            ¡AHORA!
                          </Badge>
                        )}
                        {isPast && !isNow && (
                          <Badge variant="outline" className="border-[#0f2f4b]/30 text-[#0f2f4b] text-[11px]">
                            Pasado
                          </Badge>
                        )}
                        {relatedCase && (
                          <Badge
                            variant="outline"
                            className="border-[#0f2f4b]/30 text-[#0f2f4b] text-[11px] flex items-center"
                          >
                            <Briefcase className="h-3 w-3 mr-1" />
                            {relatedCase.title}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-xs text-[#0f2f4b]/80">
                        <p className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#1a4f72]" />
                          <strong>
                            {eventDate.toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </strong>
                        </p>

                        {event.location && (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#1a4f72]" />
                            {event.location}
                          </p>
                        )}

                        {event.meetingLink && (
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-[#1a4f72]" />
                            <a
                              href={event.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0f2f4b] hover:underline font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Unirse a la reunión
                            </a>
                            {event.meetingPassword && (
                              <span className="text-[11px] bg-[#0f2f4b]/5 px-2 py-1 rounded">
                                Contraseña: {event.meetingPassword}
                              </span>
                            )}
                          </div>
                        )}

                        {event.description && (
                          <p className="mt-2 text-[11px] text-[#0f2f4b]/80 bg-[#0f2f4b]/5 p-2 rounded">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Próximo evento */}
          {nextEvent && (
            <div className="mt-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-[#0f2f4b]/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#1a4f72]" />
                  <span className="text-xs font-medium text-[#0f2f4b]/80">
                    Próximo evento:
                  </span>
                  <span className="text-xs text-[#0f2f4b] font-semibold">
                    {nextEvent.title}
                  </span>
                </div>
                <Badge className="bg-[#1a4f72] text-white text-[11px]">
                  {new Date(nextEvent.startDate).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <HeroBackground />
      </CardContent>
    </Card>
  );
}
