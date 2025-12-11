import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Tool } from '@/entities/Tool';
import { Favorite } from '@/entities/Favorite';
import { 
  Calculator, 
  Star, 
  Lock,
  Unlock,
  Search,
  Grid,
  List
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { canAccessTool } from '@/utils/ToolAccess';
import TrialBanner from '@/components/TrialBanner';
import * as LucideIcons from 'lucide-react';
//
// 🔹 Helpers locales para saber si el usuario tiene acceso
//    a cada "plan" FINFOCUS (para mostrar/ocultar el cartel azul)
//
function normalizeRoles(raw) {
  if (!raw) return [];
  let roles = [];

  if (Array.isArray(raw)) {
    roles = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        roles = parsed;
      } else {
        roles = trimmed.split(',').map(r => r.trim());
      }
    } catch {
      roles = trimmed.split(',').map(r => r.trim());
    }
  } else {
    roles = [String(raw)];
  }

  return roles
    .map(r => String(r).trim())
    .filter(Boolean)
    .map(r => r.toUpperCase());
}

function canAccessFinfocusPlan(user, planKey) {
  const roles = normalizeRoles(user?.userRoles);

  switch (planKey) {
    case 'finfocus_start':
      // START, PLATINO y ADVANCED acceden a START
      return (
        roles.includes('FINFOCUS_START') ||
        roles.includes('FINFOCUS_PLATINO') ||
        roles.includes('FINFOCUS_ADVANCED')
      );

    case 'finfocus':
      // FINFOCUS y PLATINO acceden a FINFOCUS
      return (
        roles.includes('FINFOCUS') ||
        roles.includes('FINFOCUS_PLATINO')
      );

    case 'finfocus_plus':
      // PLUS y ADVANCED acceden a PLUS
      return (
        roles.includes('FINFOCUS_PLUS') ||
        roles.includes('FINFOCUS_ADVANCED')
      );

    default:
      return true;
  }
}

export default function FinFocus() {
  const [user, setUser] = useState(null);
  const [tools, setTools] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState('free');

useEffect(() => {
  const loadUser = async () => {
    try {
      const userData = await User.me();
      if (!userData?.id) {
        navigate('/login');
        return;
      }
      setUser(userData);
      
      await loadData();
      
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');

      const validTabs = ['free', 'finfocus_start', 'finfocus', 'finfocus_plus'];
      if (tabParam && validTabs.includes(tabParam)) {
        setCategoryFilter(tabParam);
      } else {
        setCategoryFilter('free');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };
  
  loadUser();
}, [navigate]);

  const loadData = async () => {
    setLoading(true);
    const userData = await User.me();
    setUser(userData);

    const allTools = await Tool.list('order');
    const finFocusTools = allTools.filter(t => 
      (t.category?.startsWith('finfocus') || t.category === 'free') && t.isActive
    );
    setTools(finFocusTools);

    const userFavorites = await Favorite.filter({ userId: userData.id });
    setFavorites(userFavorites);
    setLoading(false);
  };

  const toggleFavorite = async (toolId) => {
    const existingFav = favorites.find(f => f.toolId === toolId);
    
    if (existingFav) {
      await Favorite.delete(existingFav.id);
      setFavorites(favorites.filter(f => f.id !== existingFav.id));
    } else {
      const newFav = await Favorite.create({ userId: user.id, toolId });
      setFavorites([...favorites, newFav]);
    }
  };

  const isFavorite = (toolId) => {
    return favorites.some(f => f.toolId === toolId);
  };

const getCategoryBadge = (category) => {
  const badges = {
    'free': { text: 'Gratuito', color: 'bg-green-500' },
    'finfocus_free': { text: 'Gratuito', color: 'bg-green-500' },
    'finfocus_start': { text: 'FINFOCUS START', color: 'bg-blue-500' },
    'finfocus': { text: 'FINFOCUS', color: 'bg-blue-600' },
    'finfocus_plus': { text: 'FINFOCUS+', color: 'bg-blue-700' },

    // 🔹 NUEVO
    'finfocus_all': { 
      text: 'FINFOCUS', 
      color: 'bg-blue-600' 
    },
  };

  return badges[category] || badges['finfocus_free'];
};

const highlightRiskWord = (text, planKey) => {
  switch (planKey) {
    case 'finfocus_start': // conservador → verde
      return text.replace(
        'conservadores',
        '<span class="text-green-700 font-bold">conservadores</span>'
      );

    case 'finfocus': // moderado → azul
      return text.replace(
        'moderados',
        '<span class="text-blue-700 font-bold">moderados</span>'
      );

    case 'finfocus_plus': // agresivo → rojo
      return text.replace(
        'agresivos',
        '<span class="text-red-700 font-bold">agresivos</span>'
      );

    default:
      return text;
  }
};

  // Descripciones de cada plan
  const planDescriptions = {
    'free': {
      title: 'Herramientas Gratuitas',
      exclusiveMessage: 'Acceso gratuito para todos los usuarios',
      description: 'Un panel diseñado para que —sin experiencia técnica ni financiera— puedas comenzar a mejorar tu organización económica, entender tus finanzas y tomar mejores decisiones.'
    },
'finfocus_start': {
  title: 'FINFOCUS START',
  exclusiveMessage: 'Acceso exclusivo a FINFOCUS START',
  description: 'Un proyecto pensado para perfiles conservadores en pesos. Objetivo: lograr un rendimiento entre 5% y 10% por encima de la inflación.'
},
'finfocus': {
  title: 'FINFOCUS',
  exclusiveMessage: 'Acceso exclusivo a FINFOCUS',
  description: 'Un proyecto pensado para perfiles moderados en dólares. Objetivo: lograr un rendimiento entre 8% y 10% anual en dólares.'
},
'finfocus_plus': {
  title: 'FINFOCUS PLUS',
  exclusiveMessage: 'Acceso exclusivo a FINFOCUS PLUS',
  description: 'Un proyecto pensado para perfiles agresivos en dólares. Objetivo: lograr un rendimiento entre 10% y 14% anual en dólares.'
}
  };

    const COMMUNITY_QR = {
    finfocus_start: 'https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765198319661-e65c65ce/comunidad_finfocus_pesos.png',
    finfocus: 'https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765198319698-170becff/comunidad_finfocus.png',
    finfocus_plus: 'https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765198319705-46c5d7c6/comunidad_finfocus_plus.png',
  };


  const filteredTools = tools.filter(tool =>
    tool.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

const sharedFinfocusTools = filteredTools.filter(
  t => t.category === 'finfocus_all'
);

const groupedTools = {
  free: filteredTools.filter(
    t => t.category === 'free' || t.category === 'finfocus_free'
  ),

  finfocus_start: [
    ...filteredTools.filter(t => t.category === 'finfocus_start'),
    ...sharedFinfocusTools,   // 🔹 también acá
  ],

  finfocus: [
    ...filteredTools.filter(t => t.category === 'finfocus'),
    ...sharedFinfocusTools,   // 🔹 también acá
  ],

  finfocus_plus: [
    ...filteredTools.filter(t => t.category === 'finfocus_plus'),
    ...sharedFinfocusTools,   // 🔹 y acá
  ],
};

const hasStartAccess = canAccessFinfocusPlan(user, 'finfocus_start');
const hasFinfocusAccess = canAccessFinfocusPlan(user, 'finfocus');
const hasPlusAccess = canAccessFinfocusPlan(user, 'finfocus_plus');

  const ToolCard = ({ tool }) => {
    const isAdmin = user?.role === 'admin';
    const badge = getCategoryBadge(tool.category);

    // Herramientas gratuitas
    const isFreeTool =
      tool.category === 'free' || tool.category === 'finfocus_free';

    const access = isFreeTool || isAdmin || (user && canAccessTool(user, tool));

      // 🔹 Icono dinámico según lo que venga de la BD
  const IconComponent =
    (tool.icon && LucideIcons[tool.icon]) || Calculator;
    
    // Determinar el tab según la categoría de la herramienta
const getTabFromCategory = (category) => {
  if (category === 'free' || category === 'finfocus_free') return 'free';
  if (category === 'finfocus_start') return 'finfocus_start';
  if (category === 'finfocus') return 'finfocus';
  if (category === 'finfocus_plus') return 'finfocus_plus';

  if (category === 'finfocus_all') return 'finfocus';

  // Fallback seguro
  return 'free';
};
    
    const toolTab = getTabFromCategory(tool.category);
    
    return (
      <Card className="hover:shadow-lg cursor-pointer transition-all h-full flex flex-col">
        <CardHeader className="pb-3 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
<CardTitle className="flex items-center gap-2">
  <IconComponent className="h-5 w-5" />
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

            {isFreeTool ? (
              <Button
                size="sm"
                onClick={() =>
                  navigate(createPageUrl(`ToolViewer?toolId=${tool.id}&from=FinFocus&tab=${toolTab}`))
                }
              >
                <Unlock className="h-4 w-4 mr-2" />
                Abrir
              </Button>
            ) : access ? (
              <Button
                size="sm"
                onClick={() =>
                  navigate(createPageUrl(`ToolViewer?toolId=${tool.id}&from=FinFocus&tab=${toolTab}`))
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trial Banner si quisieras usarlo: <TrialBanner user={user} /> */}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="h-8 w-8 text-[#0f2f4b]" />
            FINFOCUS
          </h1>
          <p className="text-gray-600 mt-2">
            🚀 Invertí con propósito. Aprendé, replica y fortalecé tus finanzas personales.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Buscar herramientas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tools by Category */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
<TabsList  className="    flex flex-nowrap justify-center w-full    gap-1 bg-muted/50 p-1 rounded-lg  ">
  {Object.keys(groupedTools).map((cat) => (
    <TabsTrigger
      key={cat}
      value={cat}
      className="
        flex-1 min-w-0
        text-ellipsis overflow-hidden
        text-[0.75rem] md:text-sm px-2 py-2 rounded-md
        data-[state=active]:bg-[#0f2f4b]
        data-[state=active]:text-white
        data-[state=active]:font-semibold
      "
    >
      {planDescriptions[cat]?.title || cat}
    </TabsTrigger>
  ))}
</TabsList>

        {/* 🔹 Solo GRATUITAS */}
        <TabsContent value="free">
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500">{planDescriptions.free.title}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
                  <Unlock className="h-4 w-4" />
                  {planDescriptions.free.exclusiveMessage}
                </p>
                <p className="text-sm text-gray-600 italic">
                  {planDescriptions.free.description}
                </p>
              </div>
            </CardHeader>
          </Card>

          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4`}>
            {groupedTools.free.map(tool => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </TabsContent>

{/* 🔹 START */}
<TabsContent value="finfocus_start">
  {/* Banner de acceso (solo si NO tiene el plan) */}
  {!hasStartAccess && (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-500">{planDescriptions.finfocus_start.title}</Badge>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {planDescriptions.finfocus_start.exclusiveMessage}
          </p>
<p
  className="text-sm text-gray-600 italic"
  dangerouslySetInnerHTML={{
    __html: highlightRiskWord(
      planDescriptions.finfocus_start.description,
      'finfocus_start'
    ),
  }}
/>
        </div>
      </CardHeader>
    </Card>
  )}

  {/* Card de comunidad con QR */}
  <Card className="mb-6">
    <CardHeader className="text-center items-center">
      <CardTitle className="text-base md:text-lg">
        Comunidad FINFOCUS START
      </CardTitle>
      <CardDescription className="mt-1 text-sm text-gray-600">
        Accedé a la comunidad exclusiva de FINFOCUS START para compartir dudas, ideas y oportunidades de inversión.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm overflow-hidden">
          <img
            src={COMMUNITY_QR.finfocus_start}
            alt="QR comunidad FINFOCUS START"
            className={`w-40 h-40 object-contain ${hasStartAccess ? '' : 'blur-sm opacity-60'}`}
          />
          {!hasStartAccess && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] md:text-xs font-semibold text-white bg-black/70 px-3 py-2 rounded-lg text-center">
                Solo los suscriptores de FINFOCUS START tienen acceso a esta comunidad.
              </span>
            </div>
          )}
        </div>
        <p className="text-xs md:text-sm text-gray-700 md:max-w-md">
          {hasStartAccess
            ? 'Escaneá el código QR para unirte a la comunidad de FINFOCUS START y recibir novedades, soporte y ejemplos prácticos.'
            : 'Suscribite a FINFOCUS START para acceder a la comunidad privada, materiales exclusivos y soporte directo.'}
        </p>
      </div>
    </CardContent>
  </Card>

  <div
    className={`grid ${
      viewMode === 'grid'
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1'
    } gap-4`}
  >
    {groupedTools.finfocus_start.map((tool) => (
      <ToolCard key={tool.id} tool={tool} />
    ))}
  </div>
</TabsContent>

{/* 🔹 FINFOCUS */}
<TabsContent value="finfocus">
  {!hasFinfocusAccess && (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-600">{planDescriptions.finfocus.title}</Badge>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {planDescriptions.finfocus.exclusiveMessage}
          </p>
<p
  className="text-sm text-gray-600 italic"
  dangerouslySetInnerHTML={{
    __html: highlightRiskWord(
      planDescriptions.finfocus.description,
      'finfocus'
    ),
  }}
/>
        </div>
      </CardHeader>
    </Card>
  )}

  {/* Card de comunidad FINFOCUS */}
  <Card className="mb-6">
    <CardHeader className="text-center items-center">
      <CardTitle className="text-base md:text-lg">
        Comunidad FINFOCUS
      </CardTitle>
      <CardDescription className="mt-1 text-sm text-gray-600">
        Accedé a la comunidad FINFOCUS para compartir estrategias, dudas y oportunidades con otros suscriptores.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm overflow-hidden">
          <img
            src={COMMUNITY_QR.finfocus}
            alt="QR comunidad FINFOCUS"
            className={`w-40 h-40 object-contain ${hasFinfocusAccess ? '' : 'blur-sm opacity-60'}`}
          />
          {!hasFinfocusAccess && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] md:text-xs font-semibold text-white bg-black/70 px-3 py-2 rounded-lg text-center">
                Solo los suscriptores de FINFOCUS tienen acceso a esta comunidad.
              </span>
            </div>
          )}
        </div>
        <p className="text-xs md:text-sm text-gray-700 md:max-w-md">
          {hasFinfocusAccess
            ? 'Escaneá el código QR para unirte a la comunidad FINFOCUS y estar al día con las novedades y oportunidades.'
            : 'Suscribite al plan FINFOCUS para acceder a la comunidad privada y a todos los beneficios del plan.'}
        </p>
      </div>
    </CardContent>
  </Card>

  <div
    className={`grid ${
      viewMode === 'grid'
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1'
    } gap-4`}
  >
    {groupedTools.finfocus.map((tool) => (
      <ToolCard key={tool.id} tool={tool} />
    ))}
  </div>
</TabsContent>

{/* 🔹 PLUS */}
<TabsContent value="finfocus_plus">
  {!hasPlusAccess && (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-700">{planDescriptions.finfocus_plus.title}</Badge>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {planDescriptions.finfocus_plus.exclusiveMessage}
          </p>
<p
  className="text-sm text-gray-600 italic"
  dangerouslySetInnerHTML={{
    __html: highlightRiskWord(
      planDescriptions.finfocus_plus.description,
      'finfocus_plus'
    ),
  }}
/>
        </div>
      </CardHeader>
    </Card>
  )}

  {/* Card de comunidad FINFOCUS PLUS */}
  <Card className="mb-6">
    <CardHeader className="text-center items-center">
      <CardTitle className="text-base md:text-lg">
        Comunidad FINFOCUS PLUS
      </CardTitle>
      <CardDescription className="mt-1 text-sm text-gray-600">
        Accedé a la comunidad más avanzada de FINFOCUS, con foco en estrategias complejas y acompañamiento cercano.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm overflow-hidden">
          <img
            src={COMMUNITY_QR.finfocus_plus}
            alt="QR comunidad FINFOCUS PLUS"
            className={`w-40 h-40 object-contain ${hasPlusAccess ? '' : 'blur-sm opacity-60'}`}
          />
          {!hasPlusAccess && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] md:text-xs font-semibold text-white bg-black/70 px-3 py-2 rounded-lg text-center">
                Solo los suscriptores de FINFOCUS+ tienen acceso a esta comunidad.
              </span>
            </div>
          )}
        </div>
        <p className="text-xs md:text-sm text-gray-700 md:max-w-md">
          {hasPlusAccess
            ? 'Escaneá el código QR para unirte a la comunidad FINFOCUS PLUS y acceder al máximo nivel de acompañamiento.'
            : 'Suscribite a FINFOCUS PLUS para acceder a la comunidad más avanzada y a todos los beneficios premium.'}
        </p>
      </div>
    </CardContent>
  </Card>

  <div
    className={`grid ${
      viewMode === 'grid'
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1'
    } gap-4`}
  >
    {groupedTools.finfocus_plus.map((tool) => (
      <ToolCard key={tool.id} tool={tool} />
    ))}
  </div>
</TabsContent>
      </Tabs>

      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <Calculator className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">
            No se encontraron herramientas
          </h3>
          <p className="text-gray-500 mt-2">
            Intenta con otros términos de búsqueda
          </p>
        </div>
      )}
    </div>
  );
}