// src/pages/ToolViewer.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tool } from '@/entities/Tool';
import { User } from '@/entities/User';
import { Favorite } from '@/entities/Favorite';
import * as LucideIcons from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { ArrowLeft, Calculator, Scale, Wrench, Star } from 'lucide-react';
import ToolViewerRenderer from '@/components/ToolRenderer';

export default function ToolViewer() {
  const navigate = useNavigate();
  const [tool, setTool] = useState(null);
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Leer el toolId de la URL: ToolViewer?toolId=XXXX
  const urlParams = new URLSearchParams(window.location.search);
  const rawToolId = urlParams.get('toolId'); // string
  const fromPage = urlParams.get('from'); // 👈 Nuevo: de dónde viene el usuario

  useEffect(() => {
    const loadTool = async () => {
      if (!rawToolId) {
        setLoading(false);
        return;
      }

      try {
        // Cargar usuario
        const userData = await User.me();
        setUser(userData);

        // ✅ Traemos TODAS las herramientas
        const allTools = await Tool.list();

        // ✅ Buscamos por id o por key
        const toolData = allTools.find((t) => {
          const idStr = t.id != null ? String(t.id) : '';
          const keyStr = t.key != null ? String(t.key) : '';

          return idStr === rawToolId || keyStr === rawToolId;
        });

        setTool(toolData || null);

        // Verificar si es favorito
        if (toolData && userData) {
          const favorites = await Favorite.filter({ 
            userId: userData.id, 
            toolId: toolData.id 
          });
          if (favorites.length > 0) {
            setIsFavorite(true);
            setFavoriteId(favorites[0].id);
          }
        }
      } catch (error) {
        console.error('Error cargando la herramienta:', error);
        setTool(null);
      } finally {
        setLoading(false);
      }
    };

    loadTool();
  }, [rawToolId]);

  const toggleFavorite = async () => {
    if (!user || !tool) return;

    try {
      if (isFavorite && favoriteId) {
        // Eliminar de favoritos
        await Favorite.delete(favoriteId);
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        // Agregar a favoritos
        const newFav = await Favorite.create({ 
          userId: user.id, 
          toolId: tool.id 
        });
        setIsFavorite(true);
        setFavoriteId(newFav.id);
      }
    } catch (error) {
      console.error('Error al cambiar favorito:', error);
    }
  };

  const handleBack = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromPage = urlParams.get('from');
    const tabParam = urlParams.get('tab');

    // Si viene de una página específica, volver a esa página
    if (fromPage) {
      // Si hay un tab específico (para FinFocus), agregarlo a la URL
      if (tabParam && fromPage === 'FinFocus') {
        navigate(createPageUrl(`${fromPage}?tab=${tabParam}`));
      } else {
        navigate(createPageUrl(fromPage));
      }
      return;
    }

    // Si no hay parámetro 'from', usar la lógica por categoría
    if (tool?.category?.toLowerCase().includes('finlegal')) {
      navigate(createPageUrl('FinLegal'));
    } else if (tool?.category?.toLowerCase().includes('finfocus')) {
      navigate(createPageUrl('FinFocus'));
    } else {
      navigate(createPageUrl('Dashboard'));
    }
  };

  const getCategoryBadge = () => {
    if (!tool?.category) return null;

    if (tool.category.startsWith('finlegal')) {
      return <Badge className="bg-blue-600">FINLEGAL</Badge>;
    }

    // Todas estas las mostramos como FINFOCUS
    if (
      tool.category.startsWith('finfocus') ||
      tool.category === 'free' ||
      tool.category === 'finfocus_free'
    ) {
      return <Badge className="bg-green-600">FINFOCUS</Badge>;
    }

    return <Badge className="bg-gray-500">GENERAL</Badge>;
  };

const getIcon = () => {
  // 1) Si la herramienta tiene un icono definido y existe en Lucide, usarlo
  if (tool?.icon && LucideIcons[tool.icon]) {
    return LucideIcons[tool.icon];
  }

  // 2) Si no tiene icono o está mal escrito, usamos el fallback por categoría
  if (tool?.category?.startsWith('finlegal')) return Scale;

  if (
    tool?.category?.startsWith('finfocus') ||
    tool?.category === 'free' ||
    tool?.category === 'finfocus_free'
  ) {
    return Calculator;
  }

  // 3) Fallback ultra genérico
  return Wrench;
};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!rawToolId) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-lg text-gray-600">No se indicó ninguna herramienta.</p>
        <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
          Volver al Dashboard
        </Button>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-lg text-gray-600">
          No se encontró la herramienta solicitada.
        </p>
        <Button onClick={handleBack}>Volver</Button>
      </div>
    );
  }

  const Icon = getIcon();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Icon
                className={`h-8 w-8 ${
                  tool.category?.startsWith('finlegal') ? 'text-blue-600' : 'text-green-600'
                }`}
              />
              {tool.name || 'Herramienta'}
            </h1>
            {tool.description && (
              <p className="text-gray-600 mt-2 max-w-2xl">{tool.description}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              {getCategoryBadge()}
            </div>
          </div>
        </div>
        
        {/* Botón de favorito */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFavorite}
          className={`${
            isFavorite 
              ? 'text-yellow-500 border-yellow-500 hover:bg-yellow-50' 
              : 'text-gray-400 hover:text-yellow-500'
          }`}
        >
          <Star 
            className={`h-5 w-5 mr-2 ${isFavorite ? 'fill-current' : ''}`} 
          />
          {isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        </Button>
      </div>

      {/* Contenedor principal de la herramienta SIN CARD */}
      <div className="mt-2">
        <ToolViewerRenderer tool={tool} />
      </div>
    </div>
  );
}