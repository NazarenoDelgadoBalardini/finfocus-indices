import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Tool } from '@/entities/Tool';
import { Favorite } from '@/entities/Favorite';
import { Case } from '@/entities/Case';
import { CalendarEvent } from '@/entities/CalendarEvent';
import { FinancialData } from '@/entities/FinancialData';
import CalendarView from '@/components/CalendarView';
import TrialBanner from '@/components/TrialBanner';
import EventOfTheDay from '@/components/EventOfTheDay';
import * as LucideIcons from 'lucide-react';
import { Scale, Star, Lock, Unlock, Search, Grid, List, Briefcase, Calendar, Plus, Clock, MapPin, Video, } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { canAccessTool } from '@/utils/ToolAccess';

export default function FinLegal() {
  const [user, setUser] = useState(null);
  const [tools, setTools] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [cases, setCases] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [nonWorkingDays, setNonWorkingDays] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tools');
  const [categoryFilter, setCategoryFilter] = useState('all'); // ✅
  const navigate = useNavigate();

  // Carga usuario + herramientas + favoritos + juicios + días inhábiles
  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await User.me();
        if (!userData?.id) {
          navigate('/login');
          return;
        }
        setUser(userData);

        const [allTools, favs, userCases, allEvents, financialDataList] = await Promise.all([
          Tool.list('order'),
          Favorite.filter({ userId: userData.id }),
          Case.filter({ userId: userData.id }, '-updatedAt'),
          CalendarEvent.filter({ userId: userData.id }, '-startDate'),
          FinancialData.list(),
        ]);

        const finLegalTools = allTools.filter(
          (t) => t.category?.startsWith('finlegal') && t.isActive
        );

        // Filtrar días inhábiles de FinancialData
        const inhabiles = financialDataList.filter(
          (fd) => fd.category?.toLowerCase().includes('inhabil') || 
                  fd.sheetName?.toLowerCase().includes('inhabil')
        );

        setTools(finLegalTools);
        setFavorites(favs);
        setCases(userCases);
        setCalendarEvents(allEvents);
        setNonWorkingDays(inhabiles);
      } catch (error) {
        console.error('Error cargando FINLEGAL:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const toggleFavorite = async (toolId) => {
    const existingFav = favorites.find((f) => f.toolId === toolId);

    if (existingFav) {
      await Favorite.delete(existingFav.id);
      setFavorites(favorites.filter((f) => f.id !== existingFav.id));
    } else if (user?.id) {
      const newFav = await Favorite.create({ userId: user.id, toolId });
      setFavorites([...favorites, newFav]);
    }
  };

  const isFavorite = (toolId) => favorites.some((f) => f.toolId === toolId);

const getCategoryBadge = (category) => {
  const baseClasses = 'bg-[#0f2f4b] text-white border border-[#0f2f4b]';

  const badges = {
    finlegal_esencial: {
      text: 'ESENCIAL',
      color: baseClasses,
    },
    finlegal_esencial_plus: {
      text: 'ESENCIAL+',
      color: baseClasses,
    },
    finlegal_total: {
      text: 'FINLEGAL TOTAL',
      color: baseClasses,
    },
  };

  // Por defecto, tratamos todo como ESENCIAL
  return badges[category] || badges.finlegal_esencial;
};

  // 🔥 NUEVO: Función para verificar si el usuario tiene FINLEGAL_TOTAL
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
        roles = raw.split(',').map(r => r.trim()).filter(Boolean);
      }
    }
    
    return roles.includes('FINLEGAL_TOTAL');
  };

  // Filtro por texto
  const filteredTools = tools.filter(
    (tool) =>
      tool.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedTools = {
    finlegal_esencial: filteredTools.filter((t) => t.category === 'finlegal_esencial'),
    finlegal_esencial_plus: filteredTools.filter(
      (t) => t.category === 'finlegal_esencial_plus'
    ),
    finlegal_total: filteredTools.filter((t) => t.category === 'finlegal_total'),
  };

  const favoriteTools = filteredTools.filter((t) => isFavorite(t.id));

  // 🆕 Función para obtener el ícono de la herramienta
  const getIcon = (iconName) => {
    const Icon = LucideIcons[iconName];
    return Icon ? <Icon className="h-6 w-6 text-[#0f2f4b]" /> : <Scale className="h-6 w-6 text-[#0f2f4b]" />;
  };

const ToolCard = ({ tool }) => {
  const isAdmin = user?.role === 'admin';
  const access = isAdmin || (user && canAccessTool(user, tool));
  const badge = getCategoryBadge(tool.category);

  return (
    <Card className="hover:shadow-lg cursor-pointer transition-all h-full flex flex-col">
      <CardHeader className="pb-3 flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <div className="bg-[#0f2f4b]/10 p-2 rounded-lg">
                {getIcon(tool.icon)}
              </div>
              {tool.name}
            </CardTitle>
            <CardDescription className="mt-2">
              {tool.description}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(tool.id);
            }}
          >
            <Star
              className={`h-5 w-5 ${
                isFavorite(tool.id) ? 'fill-yellow-400 text-yellow-400' : ''
              }`}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-5">
        <div className="flex items-center justify-between mt-3">
          <Badge className={badge.color}>{badge.text}</Badge>
          {access ? (
            <Button
              size="sm"
              onClick={() =>
                navigate(createPageUrl(`ToolViewer?toolId=${tool.id}&from=FinLegal`))
              }
            >
              <Unlock className="h-4 w-4 mr-2" />
              Abrir
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                alert(
                  `Esta herramienta requiere el plan ${badge.text}. Contacta al administrador para obtener acceso.`
                )
              }
            >
              <Lock className="h-4 w-4 mr-2" />
              Requiere {badge.text}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

  const CaseCard = ({ caseItem }) => (
    <Card
      className="hover:shadow-lg cursor-pointer transition-all"
      onClick={() => navigate(createPageUrl(`CaseDetail?caseId=${caseItem.id}`))}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#0f2f4b]" />
              {caseItem.title}
            </CardTitle>
            <CardDescription className="mt-2">
              {caseItem.caseNumber && <span className="block">Exp: {caseItem.caseNumber}</span>}
              {caseItem.court && <span className="block">{caseItem.court}</span>}
            </CardDescription>
          </div>
          <Badge
            variant={
              caseItem.status === 'active'
                ? 'default'
                : caseItem.status === 'pending'
                ? 'secondary'
                : caseItem.status === 'closed'
                ? 'secondary'
                : 'outline'
            }
          >
            {caseItem.status === 'active'
              ? 'Activo'
              : caseItem.status === 'pending'
              ? 'Pendiente'
              : caseItem.status === 'closed'
              ? 'Cerrado'
              : 'Archivado'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600">
          {caseItem.plaintiff && (
            <p>
              <strong>Demandante:</strong> {caseItem.plaintiff}
            </p>
          )}
          {caseItem.defendant && (
            <p>
              <strong>Demandado:</strong> {caseItem.defendant}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      <TrialBanner user={user} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Scale className="h-8 w-8 text-[#0f2f4b]" />
            FINLEGAL
          </h1>
          <p className="text-gray-600 mt-2">Herramientas legales profesionales</p>
        </div>

        <div className="flex items-center gap-2">
          {(activeTab === 'tools' || activeTab === 'favorites') && (
            <>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 🔥 NUEVO: Evento del Día - Banner Hero */}
      <EventOfTheDay 
        user={user} 
        events={calendarEvents} 
        cases={cases} 
      />

      {/* Tabs principales FINLEGAL - 🔥 MODIFICADO: Tabs dinámicos según rol */}
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <TabsList className="flex w-full overflow-x-auto gap-1 bg-muted/50 p-1 rounded-lg">
    {/* Herramientas */}
    <TabsTrigger value="tools" className="flex-shrink-0 gap-2">
      <Scale className="h-4 w-4 mr-2" />
      Herramientas
    </TabsTrigger>

    {/* Favoritos */}
    <TabsTrigger value="favorites" className="flex-shrink-0 gap-2">
      <Star className="h-4 w-4 mr-2" />
      Favoritos ({favoriteTools.length})
    </TabsTrigger>

    {/* Mis Juicios (con candado si no es TOTAL) */}
    <TabsTrigger value="cases" className="flex-shrink-0 gap-2">
      {hasFinLegalTotal() ? (
        <Briefcase className="h-4 w-4 mr-2" />
      ) : (
        <Lock className="h-4 w-4 mr-2 text-gray-400" />
      )}
      Mis Juicios
      {hasFinLegalTotal() ? (
        <> ({cases.length})</>
      ) : (
        <span className="ml-1 text-xs text-gray-400">(TOTAL)</span>
      )}
    </TabsTrigger>

    {/* Calendario General (con candado si no es TOTAL) */}
    <TabsTrigger value="calendar" className="flex-shrink-0 gap-2">
      {hasFinLegalTotal() ? (
        <Calendar className="h-4 w-4 mr-2" />
      ) : (
        <Lock className="h-4 w-4 mr-2 text-gray-400" />
      )}
      Calendario General
      {!hasFinLegalTotal() && (
        <span className="ml-1 text-xs text-gray-400">(TOTAL)</span>
      )}
    </TabsTrigger>
  </TabsList>

        {/* TAB HERRAMIENTAS */}
        <TabsContent value="tools" className="space-y-6">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar herramientas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Herramientas por categoría */}
          <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
            <TabsList className="flex w-full overflow-x-auto gap-1 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="all" className="flex-shrink-0">Todas</TabsTrigger>
              <TabsTrigger value="esencial" className="flex-shrink-0">FINLEGAL ESENCIAL</TabsTrigger>
              <TabsTrigger value="esencial_plus" className="flex-shrink-0">FINLEGAL ESENCIAL+</TabsTrigger>
              <TabsTrigger value="total" className="flex-shrink-0">FINLEGAL TOTAL</TabsTrigger>
            </TabsList>

<TabsContent value="all" className="space-y-6">
  {Object.entries(groupedTools).map(([category, categoryTools]) => {
    if (categoryTools.length === 0) return null;
    const badge = getCategoryBadge(category);

    return (
      <div key={category} className="mt-6">
        {/* 🔹 Separador centrado a todo el ancho */}
        <div className="flex items-center w-full mb-4">
          <div className="flex-grow border-t border-[#0f2f4b]/40" />
          <div className="px-4 flex items-center gap-2 text-sm font-semibold text-slate-700 whitespace-nowrap">
            <Badge className={`${badge.color} px-3 py-1`}>
              {badge.text}
            </Badge>
            <span className="text-gray-500 text-xs">
              ({categoryTools.length})
            </span>
          </div>
          <div className="flex-grow border-t border-[#0f2f4b]/40" />
        </div>

        {/* Grid de herramientas */}
        <div
          className={`grid ${
            viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          } gap-4`}
        >
          {categoryTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    );
  })}
</TabsContent>

            <TabsContent value="esencial">
              <div
                className={`grid ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                } gap-4`}
              >
                {groupedTools.finlegal_esencial.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="esencial_plus">
              <div
                className={`grid ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                } gap-4`}
              >
                {groupedTools.finlegal_esencial_plus.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="total">
              <div
                className={`grid ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                } gap-4`}
              >
                {groupedTools.finlegal_total.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {filteredTools.length === 0 && (
            <div className="text-center py-12">
              <Scale className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">
                No se encontraron herramientas
              </h3>
              <p className="text-gray-500 mt-2">Intenta con otros términos de búsqueda</p>
            </div>
          )}
        </TabsContent>

        {/* TAB FAVORITOS */}
        <TabsContent value="favorites" className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar en tus favoritas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {favoriteTools.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">
                Todavía no marcaste herramientas como favoritas
              </h3>
              <p className="text-gray-500 mt-2">
                Desde la pestaña Herramientas, toca la estrella para agregarlas aquí.
              </p>
            </div>
          ) : (
            <div
              className={`grid ${
                viewMode === 'grid'
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              } gap-4`}
            >
              {favoriteTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </TabsContent>

{/* TAB MIS JUICIOS */}
<TabsContent value="cases" className="space-y-6">
  {hasFinLegalTotal() ? (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Mis Juicios</h2>
        <Button onClick={() => navigate(createPageUrl('CreateCase'))}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Juicio
        </Button>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">
            No tienes juicios registrados
          </h3>
          <p className="text-gray-500 mt-2">
            Crea tu primer juicio para comenzar a gestionarlo desde FINLEGAL.
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate(createPageUrl('CreateCase'))}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Juicio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((caseItem) => (
            <CaseCard key={caseItem.id} caseItem={caseItem} />
          ))}
        </div>
      )}
    </>
  ) : (
    <div className="text-center py-12">
      <Lock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-700">
        Mis Juicios es una función exclusiva de FINLEGAL TOTAL
      </h3>
      <p className="text-gray-500 mt-2 max-w-md mx-auto">
        Guardá tus expedientes, vinculá audiencias y vencimientos, 
        y tené todo tu estudio ordenado en un solo lugar con FINLEGAL TOTAL.
      </p>
      <Button
        className="mt-4"
        onClick={() => navigate(createPageUrl('Planes'))}
      >
        Ver planes FINLEGAL
      </Button>
    </div>
  )}
</TabsContent>
        

{/* TAB CALENDARIO GENERAL */}
<TabsContent value="calendar" className="space-y-6">
  {hasFinLegalTotal() ? (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Calendario General</h2>
        <p className="text-sm text-gray-600">
          Todos los eventos de tus juicios ({calendarEvents.length})
        </p>
      </div>

      {/* Componente de calendario visual */}
      <CalendarView 
        events={calendarEvents} 
        cases={cases}
        nonWorkingDays={nonWorkingDays}
      />

      {/* Lista de eventos (debajo del calendario) */}
      {calendarEvents.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-xl font-semibold">Lista de Eventos</h3>
          {Object.entries(
            calendarEvents.reduce((acc, event) => {
              const monthYear = new Date(event.startDate).toLocaleDateString('es-ES', {
                month: 'long',
                year: 'numeric',
              });
              if (!acc[monthYear]) acc[monthYear] = [];
              acc[monthYear].push(event);
              return acc;
            }, {})
          ).map(([monthYear, monthEvents]) => (
            <div key={monthYear}>
              <h4 className="text-lg font-semibold mb-3 capitalize">{monthYear}</h4>
              <div className="space-y-3">
                {monthEvents.map((event) => {
                  const relatedCase = cases.find((c) => c.id === event.caseId);
                  
                  return (
                    <Card 
                      key={event.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        if (event.caseId) {
                          navigate(createPageUrl(`CaseDetail?caseId=${event.caseId}`));
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-semibold flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#0f2f4b]" />
                                {event.title}
                              </h5>
                              {relatedCase && (
                                <Badge variant="outline" className="text-xs">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  {relatedCase.title}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600">
                              <p className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {new Date(event.startDate).toLocaleString('es-ES', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  hour: '2-digit',
                                  minute: '2-digit',
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
                                    onClick={(e) => e.stopPropagation()}
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
                                <p className="mt-2 text-gray-700">{event.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {(() => {
                              const now = new Date();
                              const eventDate = new Date(event.startDate);
                              const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
                              
                              if (diffDays < 0) {
                                return (
                                  <Badge variant="secondary" className="text-xs">
                                    Pasado
                                  </Badge>
                                );
                              } else if (diffDays === 0) {
                                return (
                                  <Badge className="text-xs bg-red-500">
                                    ¡Hoy!
                                  </Badge>
                                );
                              } else if (diffDays === 1) {
                                return (
                                  <Badge className="text-xs bg-orange-500">
                                    Mañana
                                  </Badge>
                                );
                              } else if (diffDays <= 7) {
                                return (
                                  <Badge className="text-xs bg-yellow-500">
                                    En {diffDays} días
                                  </Badge>
                                );
                              } else {
                                return (
                                  <Badge variant="outline" className="text-xs">
                                    En {diffDays} días
                                  </Badge>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  ) : (
    <div className="text-center py-12">
      <Lock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-700">
        Calendario general disponible solo para FINLEGAL TOTAL
      </h3>
      <p className="text-gray-500 mt-2">
        Visualizá todos los vencimientos y audiencias de tus juicios en un solo calendario centralizado.
      </p>
      <Button className="mt-4" onClick={() => navigate(createPageUrl('Planes'))}>
        Ver planes FINLEGAL
      </Button>
    </div>
  )}
</TabsContent>
      </Tabs>
    </div>
  );
}