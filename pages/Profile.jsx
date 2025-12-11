import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { SyncConfig } from '@/entities/SyncConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  UserCircle,
  Bell,
  Database,
  CreditCard,
  Save,
  CheckCircle,
  AlertCircle,
  Mail,
  Loader2,
  Lock
} from 'lucide-react';
import axios from 'axios';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [syncConfig, setSyncConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Estados para cada sección
  const [accountData, setAccountData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    syncAlerts: true,
    subscriptionReminders: true,
    weeklyReports: false
  });

  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: 60
  });

  // Estado para el mensaje de contacto de suscripción
  const [subscriptionMessage, setSubscriptionMessage] = useState('');

  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'es',
    dateFormat: 'DD/MM/YYYY'
  });

  // Función para verificar si el usuario es admin
  const isAdmin = () => {
    if (!user?.role) return false;
    return user.role === 'admin';
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await User.me();
      setUser(userData);

      // Cargar datos de cuenta
      setAccountData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        company: userData.company || '',
        position: userData.position || ''
      });

      // Cargar configuración de sincronización
      const syncConfigs = await SyncConfig.list();
      if (syncConfigs && syncConfigs.length > 0) {
        const config = syncConfigs[0];
        setSyncConfig(config);
        setSyncSettings({
          autoSync: config.isActive !== false,
          syncInterval: config.syncIntervalMinutes || 60
        });
      }

      // Cargar notificaciones guardadas
      if (userData.notificationSettings) {
        try {
          const notifs = typeof userData.notificationSettings === 'string'
            ? JSON.parse(userData.notificationSettings)
            : userData.notificationSettings;
          setNotificationSettings(prev => ({ ...prev, ...notifs }));
        } catch (e) {
          console.log('No se pudieron cargar las notificaciones');
        }
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
      setMessage({ type: 'error', text: 'Error al cargar los datos del usuario' });
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // GUARDAR CUENTA
  const handleSaveAccount = async () => {
    try {
      setSaving(true);
      await User.update({
        firstName: accountData.firstName,
        lastName: accountData.lastName,
        phone: accountData.phone,
        company: accountData.company,
        position: accountData.position
      });
      showMessage('success', '✅ Datos de cuenta actualizados correctamente');
      await loadUserData();
    } catch (error) {
      console.error('Error guardando cuenta:', error);
      showMessage('error', '❌ Error al actualizar los datos de cuenta');
    } finally {
      setSaving(false);
    }
  };

  // GUARDAR NOTIFICACIONES
  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await User.update({
        notificationSettings: JSON.stringify(notificationSettings)
      });
      showMessage('success', '✅ Preferencias de notificaciones guardadas');
    } catch (error) {
      console.error('Error guardando notificaciones:', error);
      showMessage('error', '❌ Error al guardar las notificaciones');
    } finally {
      setSaving(false);
    }
  };

  // GUARDAR SINCRONIZACIÓN
  const handleSaveSync = async () => {
    try {
      setSaving(true);
      if (syncConfig?.id) {
        await SyncConfig.update(syncConfig.id, {
          isActive: syncSettings.autoSync,
          syncIntervalMinutes: syncSettings.syncInterval
        });
        showMessage('success', '✅ Configuración de sincronización actualizada');
        await loadUserData();
      } else {
        showMessage('error', '⚠️ No hay configuración de sincronización disponible');
      }
    } catch (error) {
      console.error('Error guardando sincronización:', error);
      showMessage('error', '❌ Error al actualizar la sincronización');
    } finally {
      setSaving(false);
    }
  };

  // CONTACTAR SOBRE SUSCRIPCIÓN
  const handleContactSubscription = async () => {
    try {
      setSaving(true);
      
      // Parsear userRoles correctamente - manejar todos los casos
      let userRoles = [];
      if (user?.userRoles) {
        if (Array.isArray(user.userRoles)) {
          userRoles = user.userRoles;
        } else if (typeof user.userRoles === 'string') {
          try {
            const parsed = JSON.parse(user.userRoles);
            userRoles = Array.isArray(parsed) ? parsed : [user.userRoles];
          } catch {
            userRoles = user.userRoles.split(',').map(r => r.trim()).filter(Boolean);
          }
        }
      }
      
      const rolesText = userRoles.length > 0 ? userRoles.join(', ') : 'Sin plan';
      
      await axios.post(`${process.env.PROXY_INTEGRATION_URL}/emails/send`, {
        to: "nazarenodelgado@gmail.com",
        subject: `Consulta sobre Suscripción - ${user?.fullName || user?.email}`,
        html: `
          <h2>Consulta sobre Gestión de Suscripción</h2>
          <p><strong>Usuario:</strong> ${user?.fullName || 'Sin nombre'}</p>
          <p><strong>Email:</strong> ${user?.email}</p>
          <p><strong>Teléfono:</strong> ${user?.phone || 'No especificado'}</p>
          <p><strong>Empresa:</strong> ${user?.company || 'No especificada'}</p>
          <p><strong>Plan actual:</strong> ${rolesText}</p>
          <hr>
          <h3>Mensaje del usuario:</h3>
          <p>${subscriptionMessage || 'Sin mensaje adicional'}</p>
        `
      }, {
        headers: {
          "x-api-key": window.config.apiKey
        }
      });

      showMessage('success', '✅ Solicitud enviada. Te contactaremos pronto por email.');
      setSubscriptionMessage(''); // Limpiar el campo de mensaje
    } catch (error) {
      console.error('Error enviando email:', error);
      showMessage('error', '❌ Error al enviar la solicitud. Intenta nuevamente.');
    } finally {
      setSaving(false)
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-2">Administra tu cuenta y preferencias de la plataforma</p>
      </div>

      {/* Mensaje de feedback */}
      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Tabs de configuración - AHORA SOLO 4 TABS */}
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Cuenta</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            {!isAdmin() && <Lock className="h-3 w-3" />}
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Sincronización</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Suscripción</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CUENTA */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Información de Cuenta</CardTitle>
              <CardDescription>
                Actualiza tu información personal y de contacto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={accountData.firstName}
                    onChange={(e) => setAccountData({ ...accountData, firstName: e.target.value })}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={accountData.lastName}
                    onChange={(e) => setAccountData({ ...accountData, lastName: e.target.value })}
                    placeholder="Tu apellido"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={accountData.email}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">El email no se puede modificar</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={accountData.phone}
                  onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                  placeholder="+54 9 11 1234-5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={accountData.company}
                  onChange={(e) => setAccountData({ ...accountData, company: e.target.value })}
                  placeholder="Nombre de tu empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  value={accountData.position}
                  onChange={(e) => setAccountData({ ...accountData, position: e.target.value })}
                  placeholder="Tu cargo o posición"
                />
              </div>

              <Separator className="my-4" />

              <Button 
                onClick={handleSaveAccount} 
                disabled={saving}
                className="w-full md:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: NOTIFICACIONES */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificaciones</CardTitle>
              <CardDescription>
                Configura cómo y cuándo quieres recibir notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones por Email</Label>
                  <p className="text-sm text-gray-500">
                    Recibe actualizaciones importantes por correo electrónico
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de Sincronización</Label>
                  <p className="text-sm text-gray-500">
                    Notificaciones cuando hay errores en la sincronización de datos
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.syncAlerts}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, syncAlerts: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Recordatorios de Suscripción</Label>
                  <p className="text-sm text-gray-500">
                    Avisos sobre vencimientos y renovaciones de tu plan
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.subscriptionReminders}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, subscriptionReminders: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reportes Semanales</Label>
                  <p className="text-sm text-gray-500">
                    Resumen semanal de tu actividad en la plataforma
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.weeklyReports}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, weeklyReports: checked })
                  }
                />
              </div>

              <Separator className="my-4" />

              <Button 
                onClick={handleSaveNotifications} 
                disabled={saving}
                className="w-full md:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Preferencias
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SINCRONIZACIÓN */}
        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Configuración de Sincronización
                {!isAdmin() && <Lock className="h-5 w-5 text-gray-400" />}
              </CardTitle>
              <CardDescription>
                Administra la sincronización automática de datos financieros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isAdmin() ? (
                // CONTENIDO BLOQUEADO PARA NO-ADMIN
                <div className="space-y-4">
                  <Alert className="border-amber-200 bg-amber-50">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>Función exclusiva para administradores</strong>
                      <p className="mt-2 text-sm">
                        La configuración de sincronización automática de datos está disponible únicamente 
                        para usuarios con permisos de administrador. Esta función permite gestionar la 
                        actualización automática de datos financieros desde fuentes externas.
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4 opacity-60 pointer-events-none">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Sincronización Automática</Label>
                        <p className="text-sm text-gray-500">
                          Actualizar datos automáticamente desde Google Sheets
                        </p>
                      </div>
                      <Switch checked={false} disabled />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Frecuencia de Sincronización</Label>
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Cada hora" />
                        </SelectTrigger>
                      </Select>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-sm mb-2">Estado de Sincronización</h4>
                      <p className="text-sm text-gray-500">Información no disponible</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900 mb-1">¿Necesitas acceso?</h4>
                        <p className="text-sm text-blue-800">
                          Si necesitas gestionar la sincronización de datos, contacta al administrador 
                          del sistema o envía una solicitud desde la pestaña de Suscripción.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // CONTENIDO NORMAL PARA ADMIN
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sincronización Automática</Label>
                      <p className="text-sm text-gray-500">
                        Actualizar datos automáticamente desde Google Sheets
                      </p>
                    </div>
                    <Switch
                      checked={syncSettings.autoSync}
                      onCheckedChange={(checked) =>
                        setSyncSettings({ ...syncSettings, autoSync: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="syncInterval">Frecuencia de Sincronización</Label>
                    <Select
                      value={syncSettings.syncInterval.toString()}
                      onValueChange={(value) =>
                        setSyncSettings({ ...syncSettings, syncInterval: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">Cada 15 minutos</SelectItem>
                        <SelectItem value="30">Cada 30 minutos</SelectItem>
                        <SelectItem value="60">Cada hora</SelectItem>
                        <SelectItem value="120">Cada 2 horas</SelectItem>
                        <SelectItem value="360">Cada 6 horas</SelectItem>
                        <SelectItem value="720">Cada 12 horas</SelectItem>
                        <SelectItem value="1440">Una vez al día</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Define cada cuánto tiempo se actualizan los datos automáticamente
                    </p>
                  </div>

                  {syncConfig && (
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <h4 className="font-medium text-sm">Estado de Sincronización</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Última sincronización:</span>
                          <p className="font-medium">
                            {syncConfig.lastSyncDate
                              ? new Date(syncConfig.lastSyncDate).toLocaleString('es-AR')
                              : 'Nunca'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Estado:</span>
                          <p className="font-medium">
                            {syncConfig.lastSyncStatus === 'success' && '✅ Exitosa'}
                            {syncConfig.lastSyncStatus === 'error' && '❌ Error'}
                            {syncConfig.lastSyncStatus === 'pending' && '⏳ Pendiente'}
                            {!syncConfig.lastSyncStatus && '⚪ Sin datos'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total sincronizaciones:</span>
                          <p className="font-medium">{syncConfig.totalSyncs || 0}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator className="my-4" />

                  <Button 
                    onClick={handleSaveSync} 
                    disabled={saving}
                    className="w-full md:w-auto"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Configuración
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: SUSCRIPCIÓN */}
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Suscripción</CardTitle>
              <CardDescription>
                Información sobre tu plan y opciones de gestión
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-6 w-6 text-purple-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">Tu Plan Actual</h3>
                    <div className="mt-2 space-y-2">
                      {(() => {
                        // Parsear userRoles correctamente - manejar todos los casos
                        let userRoles = [];
                        if (user?.userRoles) {
                          if (Array.isArray(user.userRoles)) {
                            userRoles = user.userRoles;
                          } else if (typeof user.userRoles === 'string') {
                            try {
                              const parsed = JSON.parse(user.userRoles);
                              userRoles = Array.isArray(parsed) ? parsed : [user.userRoles];
                            } catch {
                              userRoles = user.userRoles.split(',').map(r => r.trim()).filter(Boolean);
                            }
                          }
                        }
                        
                        // Mostrar roles o mensaje de sin plan
                        if (userRoles.length > 0) {
                          return userRoles.map((role, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-purple-900">
                                {role.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ));
                        } else {
                          return (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">Sin plan activo</span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">¿Necesitas ayuda con tu suscripción?</h4>
                <p className="text-sm text-gray-600">
                  Para cambiar tu plan, actualizar método de pago, o cualquier consulta sobre facturación,
                  nuestro equipo está listo para ayudarte.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="subscriptionMessage">Mensaje (opcional)</Label>
                  <Textarea
                    id="subscriptionMessage"
                    value={subscriptionMessage}
                    onChange={(e) => setSubscriptionMessage(e.target.value)}
                    placeholder="Describe tu consulta o solicitud sobre la suscripción..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    Cuéntanos qué necesitas y te responderemos a la brevedad
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">
                        Al hacer clic en el botón, enviaremos tu información de contacto, plan actual
                        y tu mensaje a nuestro equipo de soporte.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleContactSubscription} 
                  disabled={saving}
                  className="w-full"
                  variant="default"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando solicitud...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Contactar Soporte de Suscripción
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              <div className="text-sm text-gray-500 space-y-1">
                <p><strong>Email de contacto:</strong> nazarenodelgado@gmail.com</p>
                <p><strong>Tiempo de respuesta:</strong> 24-48 horas hábiles</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}