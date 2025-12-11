import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Tool } from '@/entities/Tool';
import { Favorite } from '@/entities/Favorite';
import { Case } from '@/entities/Case';
import { CalendarEvent } from '@/entities/CalendarEvent';
import { CalculatorResult } from '@/entities/CalculatorResult';
import InitializeFinLegalTools from '@/components/InitializeFinLegalTools';
import FinancialDataExample from '@/components/FinancialDataExample';
import { 
  Calculator, 
  Scale, 
  Star, 
  Briefcase, 
  Calendar,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  Database,
  Rocket              
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    favorites: 0,
    cases: 0,
    events: 0,
    calculations: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const userData = await User.me();
    setUser(userData);
    console.log("V12");

    // Cargar estadísticas
    const favorites = await Favorite.filter({ userId: userData.id });
    const cases = await Case.filter({ userId: userData.id });
    const events = await CalendarEvent.filter({ userId: userData.id });
    const calculations = await CalculatorResult.filter({ userId: userData.id });

    setStats({
      favorites: favorites.length,
      cases: cases.length,
      events: events.length,
      calculations: calculations.length
    });

    setLoading(false);
  };

  const getSubscriptionMessage = () => {
    if (!user?.userRoles || user.userRoles.length === 0) {
      return 'Bienvenido a FINFOCUS';
    }
    
const messages = {
  FINFOCUS_START:   '¡Bienvenido a FINFOCUS START!',
  FINFOCUS:         '¡Bienvenido a FINFOCUS!',
  FINFOCUS_PLUS:    '¡Bienvenido a FINFOCUS PLUS!',
  FINFOCUS_PLATINO: '¡Bienvenido a FINFOCUS PLATINO (START + FINFOCUS)!',
  FINFOCUS_ADVANCED:'¡Bienvenido a FINFOCUS ADVANCED (START + FINFOCUS+)!',

  FINLEGAL_ESENCIAL: '¡Bienvenido a FINLEGAL ESENCIAL!',
  FINLEGAL_PLUS:     '¡Bienvenido a FINLEGAL PLUS!',
  FINLEGAL_TOTAL:    '¡Bienvenido a FINLEGAL TOTAL!',
};
    
    // Mostrar el mensaje del primer rol (o combinar si tiene múltiples)
    const primaryRole = user.userRoles[0];
    return messages[primaryRole] || 'Bienvenido a FINFOCUS';
  };

  // 🔥 NUEVO: Función para verificar si el usuario tiene algún rol de FINLEGAL
  const hasFinLegalAccess = () => {
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
        roles = raw.split(',').map(r => r.trim()).filter(Boolean);
      }
    }
    
    return roles.some(role => 
      role === 'FINLEGAL_ESENCIAL' || 
      role === 'FINLEGAL_PLUS' || 
      role === 'FINLEGAL_TOTAL'
    );
  };

  // 🔥 MODIFICADO: Filtrar tarjetas según acceso
const quickAccessCards = [
  {
    title: 'FINFOCUS',
    description: 'Herramientas financieras',
    icon: Rocket,
    color: 'bg-[#0f2f4b]',
    path: 'FinFocus'
  },
  {
    title: 'FINLEGAL',
    description: 'Herramientas legales',
    icon: Scale,
    color: 'bg-[#0f2f4b]',
    path: 'FinLegal'
  },
  {
    title: 'Mis Favoritos',
    description: `${stats.favorites} herramientas`,
    icon: Star,
    color: 'bg-[#0f2f4b]',
    path: 'Favorites'
  },
  ...(hasFinLegalAccess() ? [{
    title: 'Mis Juicios',
    description: `${stats.cases} casos activos`,
    icon: Briefcase,
    color: 'bg-[#0f2f4b]',
    path: 'FinLegal'
  }] : [])
];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Tools - Only visible for admins */}
      {user?.role === 'admin' && (
        <InitializeFinLegalTools />
      )}

{/* Welcome Section - HERO FINFOCUS */}
<section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1726] via-[#0f2f4b] to-[#1e3a8a] p-6 md:p-8 text-white shadow-xl border border-white/10">
  {/* Glow decorativo */}
  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
  <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

  <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
    {/* Lado izquierdo: saludo + mensaje de suscripción */}
    <div className="space-y-3 md:space-y-4">
      <p className="text-[11px] uppercase tracking-[0.3em] text-blue-200/70">
        Panel principal
      </p>
      <h1 className="text-2xl md:text-3xl font-semibold">
        Hola,{' '}
        <span className="font-bold">
          {user?.fullName || 'Usuario'}
        </span>
      </h1>

      <p className="flex items-center text-sm md:text-base text-blue-100">
        <Sparkles className="h-5 w-5 mr-2 text-amber-300" />
        {getSubscriptionMessage()}
      </p>

      {/* Subtexto opcional */}
      <p className="text-xs md:text-sm text-blue-100/80 max-w-xl">
        Accedé a tus herramientas financieras y legales, revisá tu
        actividad reciente y volvé rápido a tus calculadoras favoritas.
      </p>
    </div>

    {/* Lado derecho: mini KPIs del usuario */}
    <div className="grid grid-cols-2 gap-3 md:gap-4 md:min-w-[260px]">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
        <p className="text-[11px] uppercase tracking-wide text-blue-100/80">
          Favoritos
        </p>
        <p className="text-2xl font-semibold leading-tight">
          {stats.favorites}
        </p>
        <p className="text-[11px] text-blue-100/70 mt-1">
          Herramientas guardadas
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
        <p className="text-[11px] uppercase tracking-wide text-blue-100/80">
          Cálculos
        </p>
        <p className="text-2xl font-semibold leading-tight">
          {stats.calculations}
        </p>
        <p className="text-[11px] text-blue-100/70 mt-1">
          Resultados almacenados
        </p>
      </div>

      {/* Si querés mostrar FINLEGAL solo cuando corresponda */}
      {hasFinLegalAccess() && (
        <>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
            <p className="text-[11px] uppercase tracking-wide text-blue-100/80">
              Juicios
            </p>
            <p className="text-2xl font-semibold leading-tight">
              {stats.cases}
            </p>
            <p className="text-[11px] text-blue-100/70 mt-1">
              Casos activos
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
            <p className="text-[11px] uppercase tracking-wide text-blue-100/80">
              Agenda
            </p>
            <p className="text-2xl font-semibold leading-tight">
              {stats.events}
            </p>
            <p className="text-[11px] text-blue-100/70 mt-1">
              Eventos en calendario
            </p>
          </div>
        </>
      )}
    </div>
  </div>
</section>

      {/* Admin Section - Financial Data Example */}
      {user?.role === 'admin' && (
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="financial-data">
              <Database className="h-4 w-4 mr-2" />
              Datos Financieros (Admin)
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Quick Access Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickAccessCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card 
                    key={card.title}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(createPageUrl(card.path))}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {card.title}
                      </CardTitle>
                      <div className={`${card.color} p-2 rounded-lg`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{card.description}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click para acceder
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Stats Overview - 🔥 MODIFICADO: Aplicar mismo control para admin */}
            <div className={`grid grid-cols-1 ${hasFinLegalAccess() ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Favoritos</CardTitle>
                  <Star className="h-4 w-4 text-[#0f2f4b]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.favorites}</div>
                  <p className="text-xs text-muted-foreground">Herramientas marcadas</p>
                </CardContent>
              </Card>

              {/* 🔥 NUEVO: Solo mostrar si tiene acceso a FINLEGAL */}
              {hasFinLegalAccess() && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Juicios</CardTitle>
                      <Briefcase className="h-4 w-4 text-[#0f2f4b]" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.cases}</div>
                      <p className="text-xs text-muted-foreground">Casos guardados</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Eventos</CardTitle>
                      <Calendar className="h-4 w-4 text-[#0f2f4b]" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.events}</div>
                      <p className="text-xs text-muted-foreground">En calendario</p>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cálculos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-[#0f2f4b]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.calculations}</div>
                  <p className="text-xs text-muted-foreground">Resultados guardados</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Actividad Reciente
                </CardTitle>
                <CardDescription>Tus últimas acciones en la plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                {([]).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay actividad reciente. ¡Comienza a usar las herramientas!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {[].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex items-center space-x-3">
                          {activity.type === 'case' ? (
                            <Briefcase className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Calculator className="h-5 w-5 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {activity.type === 'case' ? activity.data.title : activity.data.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(activity.date).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (activity.type === 'case') {
                              navigate(createPageUrl('CaseDetail') + `?caseId=${activity.data.id}`);
                            } else if (activity.data.toolId) {
                              navigate(createPageUrl('ToolViewer') + `?toolId=${activity.data.toolId}`);
                            }
                          }}
                        >
                          Ver
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial-data" className="mt-6">
            <FinancialDataExample />
          </TabsContent>
        </Tabs>
      )}

      {/* Non-Admin View */}
      {user?.role !== 'admin' && (
        <>
          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickAccessCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card 
                  key={card.title}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(createPageUrl(card.path))}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {card.title}
                    </CardTitle>
                    <div className={`${card.color} p-2 rounded-lg`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.description}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click para acceder
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Stats Overview - 🔥 MODIFICADO: Ocultar stats de FINLEGAL si no tiene acceso */}
          <div className={`grid grid-cols-1 ${hasFinLegalAccess() ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Favoritos</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.favorites}</div>
                <p className="text-xs text-muted-foreground">Herramientas marcadas</p>
              </CardContent>
            </Card>

            {/* 🔥 NUEVO: Solo mostrar si tiene acceso a FINLEGAL */}
            {hasFinLegalAccess() && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Juicios</CardTitle>
                    <Briefcase className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.cases}</div>
                    <p className="text-xs text-muted-foreground">Casos guardados</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Eventos</CardTitle>
                    <Calendar className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.events}</div>
                    <p className="text-xs text-muted-foreground">En calendario</p>
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cálculos</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.calculations}</div>
                <p className="text-xs text-muted-foreground">Resultados guardados</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Actividad Reciente
              </CardTitle>
              <CardDescription>Tus últimas acciones en la plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              {([]).length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No hay actividad reciente. ¡Comienza a usar las herramientas!
                </p>
              ) : (
                <div className="space-y-4">
                  {[].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex items-center space-x-3">
                        {activity.type === 'case' ? (
                          <Briefcase className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Calculator className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {activity.type === 'case' ? activity.data.title : activity.data.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(activity.date).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          if (activity.type === 'case') {
                            navigate(createPageUrl('CaseDetail') + `?caseId=${activity.data.id}`);
                          } else if (activity.data.toolId) {
                            navigate(createPageUrl('ToolViewer') + `?toolId=${activity.data.toolId}`);
                          }
                        }}
                      >
                        Ver
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}