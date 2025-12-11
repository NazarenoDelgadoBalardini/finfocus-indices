import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Tool } from '@/entities/Tool';
import { Favorite } from '@/entities/Favorite';
import { Star, Search, Grid, List, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';

const AZUL = '#0f2f4b';

export default function Favorites() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'
  const navigate = useNavigate();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);

      // Cargar favoritos del usuario
      const userFavorites = await Favorite.filter({ userId: userData.id });
      setFavorites(userFavorites);

      // Cargar las herramientas correspondientes
      if (userFavorites.length > 0) {
        const toolIds = userFavorites.map(fav => fav.toolId);
        const allTools = await Tool.list();
        const favoriteTools = allTools.filter(tool => toolIds.includes(tool.id));
        setTools(favoriteTools);
      }
    } catch (error) {
      console.error('Error cargando favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (toolId) => {
    try {
      const favorite = favorites.find(fav => fav.toolId === toolId);
      if (favorite) {
        await Favorite.delete(favorite.id);
        setFavorites(favorites.filter(fav => fav.id !== favorite.id));
        setTools(tools.filter(tool => tool.id !== toolId));
      }
    } catch (error) {
      console.error('Error eliminando favorito:', error);
    }
  };

  const openTool = (tool) => {
    navigate(createPageUrl('ToolViewer') + `?toolId=${tool.id}&from=Favorites`);
  };

  const getCategoryBadge = (category) => {
    const categoryColors = {
      free: 'bg-green-100 text-green-800',
      finfocus_free: 'bg-blue-100 text-blue-800',
      finfocus_all: 'bg-purple-100 text-purple-800',
      finfocus_start: 'bg-purple-100 text-purple-800',
      finfocus: 'bg-indigo-100 text-indigo-800',
      finfocus_plus: 'bg-violet-100 text-violet-800',
      finlegal_esencial: 'bg-amber-100 text-amber-800',
      finlegal_esencial_plus: 'bg-orange-100 text-orange-800',
      finlegal_total: 'bg-red-100 text-red-800'
    };

    const categoryNames = {
      free: 'Gratis',
      finfocus_free: 'FINFOCUS Gratis',
      finfocus_all: 'FINFOCUS START',
      finfocus_start: 'FINFOCUS START',
      finfocus: 'FINFOCUS',
      finfocus_plus: 'FINFOCUS PLUS',
      finlegal_esencial: 'FINLEGAL ESENCIAL',
      finlegal_esencial_plus: 'FINLEGAL ESENCIAL+',
      finlegal_total: 'FINLEGAL TOTAL'
    };

    return (
      <Badge className={categoryColors[category] || 'bg-gray-100 text-gray-800'}>
        {categoryNames[category] || category}
      </Badge>
    );
  };

const getIcon = (iconName) => {
  const Icon = LucideIcons[iconName];
  return Icon ? (
    <Icon className="h-6 w-6 text-[#0f2f4b]" />
  ) : (
    <Star className="h-6 w-6 text-[#0f2f4b]" />
  );
};

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separar herramientas por tipo
  const finFocusTools = filteredTools.filter(tool => 
    tool.category?.includes('finfocus') || tool.category === 'free'
  );
  
  const finLegalTools = filteredTools.filter(tool => 
    tool.category?.includes('finlegal')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando favoritos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1726] via-[#0f2f4b] to-[#1e3a8a] p-8 text-white shadow-xl border border-white/10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-yellow-500/20 p-3 rounded-xl backdrop-blur-sm border border-yellow-400/30">
              <Star className="h-8 w-8 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Mis Favoritas</h1>
              <p className="text-blue-100 text-sm mt-1">
                Acceso rápido a tus herramientas más utilizadas
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-4">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span className="text-sm text-blue-100">
              {filteredTools.length} {filteredTools.length === 1 ? 'herramienta favorita' : 'herramientas favoritas'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar herramientas favoritas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
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

      {/* Contenido */}
      {filteredTools.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-yellow-100 p-4 rounded-full mb-4">
              <Star className="h-12 w-12 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron herramientas' : 'No tienes favoritos aún'}
            </h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Marca tus herramientas favoritas desde FINFOCUS o FINLEGAL para acceder rápidamente desde aquí'
              }
            </p>
            {!searchTerm && (
              <div className="flex gap-3">
                <Button onClick={() => navigate(createPageUrl('FinFocus'))}>
                  Ir a FINFOCUS
                </Button>
                <Button variant="outline" onClick={() => navigate(createPageUrl('FinLegal'))}>
                  Ir a FINLEGAL
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Panel FINFOCUS */}
          {finFocusTools.length > 0 && (
            <div className="space-y-4">
<div
  className="flex flex-col items-center pb-3 border-b-2"
  style={{ borderColor: AZUL }}
>
  <div className="flex items-center justify-center gap-3">
    <div className="p-2 rounded-lg bg-[#0f2f4b]/10">
      <Sparkles className="h-6 w-6" style={{ color: AZUL }} />
    </div>

    <h2 className="text-2xl font-bold text-gray-900">FINFOCUS</h2>

    <Badge variant="secondary">
      {finFocusTools.length} {finFocusTools.length === 1 ? 'herramienta' : 'herramientas'}
    </Badge>
  </div>
</div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {finFocusTools.map((tool) => (
                    <Card 
                      key={tool.id} 
                      className="flex flex-col h-full hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="bg-[#0f2f4b]/10 p-2 rounded-lg group-hover:bg-[#0f2f4b]/20 transition-colors">
                              {getIcon(tool.icon)}
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg">{tool.name}</CardTitle>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(tool.id);
                            }}
                            className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                          >
                            <Star className="h-5 w-5 fill-current" />
                          </Button>
                        </div>
                        <CardDescription className="mt-2">
                          {tool.description || 'Sin descripción'}
                        </CardDescription>
                      </CardHeader>
<CardContent className="mt-auto pt-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      {getCategoryBadge(tool.category)}
    </div>
    <Button 
      size="sm"
      onClick={() => openTool(tool)}
      className="bg-[#0f2f4b] hover:bg-[#0f2f4b]/90"
    >
      Abrir
    </Button>
  </div>
</CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {finFocusTools.map((tool) => (
                    <Card 
                      key={tool.id}
                      className="hover:shadow-md transition-all cursor-pointer"
                      onClick={() => openTool(tool)}
                    >
<CardContent className="p-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-4 flex-1">
      <div className="bg-[#0f2f4b]/10 p-2 rounded-lg">
        {getIcon(tool.icon)}
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{tool.name}</h3>
        <p className="text-sm text-gray-500">{tool.description || 'Sin descripción'}</p>
      </div>
    </div>

    {/* Columna de acciones */}
    <div className="flex flex-col items-end space-y-2">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            removeFavorite(tool.id);
          }}
          className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
        >
          <Star className="h-5 w-5 fill-current" />
        </Button>

        <Button 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openTool(tool);
          }}
          className="bg-[#0f2f4b] hover:bg-[#0f2f4b]/90"
        >
          Abrir
        </Button>
      </div>

      {/* Badge del plan alineado abajo a la derecha */}
      {getCategoryBadge(tool.category)}
    </div>
  </div>
</CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Panel FINLEGAL */}
          {finLegalTools.length > 0 && (
            <div className="space-y-4">
<div
  className="flex flex-col items-center pb-3 border-b-2"
  style={{ borderColor: AZUL }}
>
  <div className="flex items-center justify-center gap-3">
    <div className="p-2 rounded-lg bg-[#0f2f4b]/10">
      <LucideIcons.Scale className="h-6 w-6" style={{ color: AZUL }} />
    </div>

    <h2 className="text-2xl font-bold text-gray-900">FINLEGAL</h2>

    <Badge variant="secondary">
      {finLegalTools.length} {finLegalTools.length === 1 ? 'herramienta' : 'herramientas'}
    </Badge>
  </div>
</div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {finLegalTools.map((tool) => (
                    <Card 
                      key={tool.id} 
                      className="flex flex-col h-full hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="bg-[#0f2f4b]/10 p-2 rounded-lg group-hover:bg-[#0f2f4b]/20 transition-colors">
                              {getIcon(tool.icon)}
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg">{tool.name}</CardTitle>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(tool.id);
                            }}
                            className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                          >
                            <Star className="h-5 w-5 fill-current" />
                          </Button>
                        </div>
                        <CardDescription className="mt-2">
                          {tool.description || 'Sin descripción'}
                        </CardDescription>
                      </CardHeader>
<CardContent className="mt-auto pt-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      {getCategoryBadge(tool.category)}
    </div>

    <Button 
      size="sm"
      onClick={() => openTool(tool)}
      className="bg-[#0f2f4b] hover:bg-[#0f2f4b]/90"
    >
      Abrir
    </Button>
  </div>
</CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {finLegalTools.map((tool) => (
                    <Card 
                      key={tool.id}
                      className="hover:shadow-md transition-all cursor-pointer"
                      onClick={() => openTool(tool)}
                    >
<CardContent className="p-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-4 flex-1">
      <div className="bg-[#0f2f4b]/10 p-2 rounded-lg">
        {getIcon(tool.icon)}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{tool.name}</h3>
        <p className="text-sm text-gray-500">
          {tool.description || 'Sin descripción'}
        </p>
      </div>
    </div>

    {/* Columna de acciones */}
    <div className="flex flex-col items-end space-y-2">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            removeFavorite(tool.id);
          }}
          className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
        >
          <Star className="h-5 w-5 fill-current" />
        </Button>

        <Button 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openTool(tool);
          }}
          className="bg-[#0f2f4b] hover:bg-[#0f2f4b]/90"
        >
          Abrir
        </Button>
      </div>

      {/* Badge del plan alineado abajo a la derecha */}
      {getCategoryBadge(tool.category)}
    </div>
  </div>
</CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}