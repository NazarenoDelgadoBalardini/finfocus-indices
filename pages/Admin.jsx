import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, Info, Settings, Database, FileText, Calendar, RefreshCw, CreditCard, Sparkles } from 'lucide-react';
import { Tool } from '@/entities/Tool';
import { Case } from '@/entities/Case';
import { CalendarEvent } from '@/entities/CalendarEvent';
import { User } from '@/entities/User';

export default function Admin() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    tools: 0,
    cases: 0,
    events: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Use the built-in User.me() for current user
      
      const BuiltInUser = User;
      const userData = await BuiltInUser.me();
      setCurrentUser(userData);

      // Verificar si es admin
      if (userData?.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }

      // Cargar estadísticas del sistema
      await loadStats();

      setLoading(false);
    } catch (error) {
      console.error('Error loading admin data:', error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        navigate('/login');
        return;
      }
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [tools, cases, events] = await Promise.all([
        Tool.list('-createdAt', 1000).catch(() => []),
        Case.list('-createdAt', 1000).catch(() => []),
        CalendarEvent.list('-createdAt', 1000).catch(() => [])
      ]);

      setStats({
        tools: tools.length,
        cases: cases.length,
        events: events.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          </div>
          <p className="text-gray-600">Configuración y gestión de la plataforma</p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Panel de Administración:</strong> Desde aquí puedes monitorear el estado del sistema, 
            ver estadísticas de uso y acceder rápidamente a las diferentes secciones de la plataforma.
          </AlertDescription>
        </Alert>

        {/* Admin Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Información del Administrador
            </CardTitle>
            <CardDescription>Tu cuenta de administrador actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Nombre Completo</p>
                  <p className="font-medium">{currentUser?.fullName || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="font-medium">{currentUser?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Rol</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Administrador
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">ID de Usuario</p>
                  <p className="font-mono text-sm">{currentUser?.id}</p>
                </div>
              </div>
              {currentUser?.userRoles && Array.isArray(currentUser.userRoles) && currentUser.userRoles.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Roles Adicionales</p>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.userRoles.map(role => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {role.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Herramientas</CardTitle>
              <Database className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tools}</div>
              <p className="text-xs text-gray-600 mt-1">Herramientas registradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Casos</CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cases}</div>
              <p className="text-xs text-gray-600 mt-1">Casos creados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Eventos</CardTitle>
              <Calendar className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.events}</div>
              <p className="text-xs text-gray-600 mt-1">Eventos en calendario</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Sistema</CardTitle>
              <Shield className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Operativo</div>
              <p className="text-xs text-gray-600 mt-1">Todos los servicios activos</p>
            </CardContent>
          </Card>
        </div>

        {/* System Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Información del Sistema
            </CardTitle>
            <CardDescription>Estado y configuración de la plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 text-gray-900">Módulos Activos</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-900">FINFOCUS</span>
                    <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full">Activo</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-900">FINLEGAL</span>
                    <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full">Activo</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-900">Gestión de Casos</span>
                    <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full">Activo</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-900">Calendario</span>
                    <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full">Activo</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-blue-900">Sincronización de Datos</span>
                    <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded-full">Configurado</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-gray-900">Capacidades del Sistema</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    <span className="text-sm text-blue-900">Calculadora de Actualización</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    <span className="text-sm text-blue-900">Gestión de Documentos</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    <span className="text-sm text-blue-900">Análisis Financiero</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    <span className="text-sm text-blue-900">Herramientas Legales</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    <span className="text-sm text-blue-900">Datos Financieros en Tiempo Real</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Accede a las diferentes secciones de la plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => navigate(createPageUrl('Dashboard'))}
                variant="outline"
                className="h-auto py-4 flex flex-col items-start"
              >
                <div className="font-semibold mb-1">Dashboard Principal</div>
                <div className="text-sm text-gray-600">Ver el panel de control general</div>
              </Button>

              <Button
                onClick={() => navigate(createPageUrl('FinFocus'))}
                variant="outline"
                className="h-auto py-4 flex flex-col items-start"
              >
                <div className="font-semibold mb-1">FINFOCUS</div>
                <div className="text-sm text-gray-600">Herramientas de análisis financiero</div>
              </Button>

              <Button
                onClick={() => navigate(createPageUrl('FinLegal'))}
                variant="outline"
                className="h-auto py-4 flex flex-col items-start"
              >
                <div className="font-semibold mb-1">FINLEGAL</div>
                <div className="text-sm text-gray-600">Herramientas legales y calculadoras</div>
              </Button>

              <Button
                onClick={() => navigate(createPageUrl('SyncAdmin'))}
                variant="outline"
                className="h-auto py-4 flex flex-col items-start"
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <RefreshCw className="h-4 w-4" />
                  Sincronización de Datos
                </div>
                <div className="text-sm text-gray-600">Configurar sincronización con Google Sheets</div>
              </Button>

              <Button
                onClick={() => navigate(createPageUrl('SubscriptionAdmin'))}
                variant="outline"
                className="h-auto py-4 flex flex-col items-start"
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <CreditCard className="h-4 w-4" />
                  Gestión de Suscripciones
                </div>
                <div className="text-sm text-gray-600">Administrar suscripciones y pagos de usuarios</div>
              </Button>

              <Button
                onClick={() => navigate(createPageUrl('TrialManagement'))}
                variant="outline"
                className="h-auto py-4 flex flex-col items-start"
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <Sparkles className="h-4 w-4" />
                  Gestión de Trials
                </div>
                <div className="text-sm text-gray-600">Activar y administrar períodos de prueba</div>
              </Button>

              <Button
                onClick={() => navigate(createPageUrl('Home'))}
                variant="outline"
                className="h-auto py-4 flex flex-col items-start"
              >
                <div className="font-semibold mb-1">Página Principal</div>
                <div className="text-sm text-gray-600">Volver al inicio</div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}