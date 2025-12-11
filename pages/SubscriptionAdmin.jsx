import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, CreditCard, Users, Edit, CheckCircle, XCircle, Clock, Info, RefreshCw, UserCheck, UserX } from 'lucide-react';
import { Subscription } from '@/entities/Subscription';
import { User } from '@/entities/User';
import axios from 'axios';

export default function SubscriptionAdmin() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state para editar usuario
  const [editFormData, setEditFormData] = useState({
    userRoles: [],
    isActive: true,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterRole]);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      if (userData?.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }

      await Promise.all([loadUsers(), loadSubscriptions()]);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // En lugar de consultar la tabla users directamente (que puede estar vacía),
      // obtenemos los usuarios únicos de las suscripciones
      const allSubs = await Subscription.list('-createdAt', 1000);
      
      // Crear un mapa de usuarios únicos por email
      const usersMap = new Map();
      
      for (const sub of allSubs) {
        if (sub.userEmail && !usersMap.has(sub.userEmail)) {
          // Intentar obtener datos adicionales del usuario desde la base de datos
          try {
            const userDataResponse = await axios.post(
              process.env.DATABASE_PROXY,
              {
                apiKey: window.config.apiKey,
                databaseName: 'app_database',
                tableName: 'users',
                operation: 'query',
                data: {
                  query: { email: sub.userEmail },
                  limit: 1
                }
              },
              {
                headers: {
                  'x-api-key': window.config.apiKey
                }
              }
            );
            
            if (userDataResponse.data && userDataResponse.data.length > 0) {
              // Usuario encontrado en la base de datos
              usersMap.set(sub.userEmail, userDataResponse.data[0]);
            } else {
              // Usuario no encontrado, crear registro básico desde la suscripción
              usersMap.set(sub.userEmail, {
                email: sub.userEmail,
                key: sub.userEmail, // usar email como key temporal
                fullName: sub.userEmail.split('@')[0], // nombre temporal
                userRoles: [],
                isActive: true,
                createdAt: sub.createdAt
              });
            }
          } catch (error) {
            // Si falla la consulta, crear registro básico
            usersMap.set(sub.userEmail, {
              email: sub.userEmail,
              key: sub.userEmail,
              fullName: sub.userEmail.split('@')[0],
              userRoles: [],
              isActive: true,
              createdAt: sub.createdAt
            });
          }
        }
      }
      
      const usersArray = Array.from(usersMap.values());
      console.log('✅ Usuarios cargados:', usersArray.length);
      setUsers(usersArray);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      setUsers([]);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const subs = await Subscription.list('-createdAt', 500);
      console.log('✅ Suscripciones cargadas:', subs.length);
      setSubscriptions(subs);
    } catch (error) {
      console.error('❌ Error loading subscriptions:', error);
      setSubscriptions([]);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter(user => {
        const roles = Array.isArray(user.userRoles) ? user.userRoles : 
                     (typeof user.userRoles === 'string' ? [user.userRoles] : []);
        return roles.includes(filterRole);
      });
    }

    setFilteredUsers(filtered);
  };

  const getUserSubscriptions = (userEmail) => {
    return subscriptions.filter(sub => sub.userEmail === userEmail);
  };

  const getActiveSubscription = (userEmail) => {
    const userSubs = getUserSubscriptions(userEmail);
    return userSubs.find(sub => sub.status === 'active' || sub.status === 'authorized');
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    const roles = Array.isArray(user.userRoles) ? user.userRoles : 
                 (typeof user.userRoles === 'string' ? [user.userRoles] : []);
    
    setEditFormData({
      userRoles: roles,
      isActive: user.isActive !== false,
      notes: user.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      console.log('🔄 Actualizando usuario:', selectedUser.email);
      
      // 🔥 CORRECCIÓN: Usar operación 'update' con la key correcta
      await axios.post(
        process.env.DATABASE_PROXY,
        {
          apiKey: window.config.apiKey,
          databaseName: 'app_database',
          tableName: 'users',
          operation: 'update',
          key: selectedUser.key || selectedUser.email, // La key del registro
          data: {
            userRoles: editFormData.userRoles,
            isActive: editFormData.isActive,
            notes: editFormData.notes,
            updatedAt: new Date().toISOString()
          },
          description: `Actualizar roles de ${selectedUser.email}`
        },
        {
          headers: {
            'x-api-key': window.config.apiKey
          }
        }
      );

      console.log('✅ Usuario actualizado exitosamente');
      alert('✅ Usuario actualizado. Los cambios se aplicarán cuando el usuario inicie sesión.');
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      console.error('❌ Error updating user:', error);
      alert('Error al actualizar el usuario: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleRole = (role) => {
    const currentRoles = editFormData.userRoles;
    if (currentRoles.includes(role)) {
      setEditFormData({
        ...editFormData,
        userRoles: currentRoles.filter(r => r !== role)
      });
    } else {
      setEditFormData({
        ...editFormData,
        userRoles: [...currentRoles, role]
      });
    }
  };

  const handleActivateSubscription = async (userEmail, planRole) => {
    if (!confirm(`¿Activar suscripción ${planRole} para ${userEmail}?`)) return;

    try {
      console.log('🔄 Activando suscripción para:', userEmail);
      
      // Buscar usuario
      const user = users.find(u => u.email === userEmail);
      if (!user) {
        alert('Usuario no encontrado');
        return;
      }

      // Actualizar roles del usuario
      const currentRoles = Array.isArray(user.userRoles) ? user.userRoles : 
                          (typeof user.userRoles === 'string' ? [user.userRoles] : []);
      
      if (!currentRoles.includes(planRole)) {
        const newRoles = [...currentRoles, planRole];
        
        // 🔥 CORRECCIÓN: Usar operación 'update' con la key correcta
        await axios.post(
          process.env.DATABASE_PROXY,
          {
            apiKey: window.config.apiKey,
            databaseName: 'app_database',
            tableName: 'users',
            operation: 'update',
            key: user.key || user.email, // La key del registro
            data: {
              userRoles: newRoles,
              isActive: true,
              updatedAt: new Date().toISOString()
            },
            description: `Activar rol ${planRole} para ${userEmail}`
          },
          {
            headers: {
              'x-api-key': window.config.apiKey
            }
          }
        );

        console.log('✅ Rol activado exitosamente');
        alert('✅ Suscripción activada. Los cambios se aplicarán cuando el usuario inicie sesión.');
        await loadUsers();
      } else {
        alert('El usuario ya tiene este rol activo');
      }
    } catch (error) {
      console.error('❌ Error activating subscription:', error);
      alert('Error al activar la suscripción: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { icon: CheckCircle, color: 'bg-green-100 text-green-800', text: 'Activa' },
      authorized: { icon: CheckCircle, color: 'bg-blue-100 text-blue-800', text: 'Autorizada' },
      expired: { icon: XCircle, color: 'bg-red-100 text-red-800', text: 'Vencida' },
      cancelled: { icon: XCircle, color: 'bg-gray-100 text-gray-800', text: 'Cancelada' },
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  const getUserStats = () => {
    const activeUsers = users.filter(u => u.isActive !== false).length;
    const usersWithSubs = users.filter(u => {
      const roles = Array.isArray(u.userRoles) ? u.userRoles : 
                   (typeof u.userRoles === 'string' ? [u.userRoles] : []);
      return roles.length > 0;
    }).length;
    const usersWithActiveSubs = users.filter(u => getActiveSubscription(u.email)).length;

    return { activeUsers, usersWithSubs, usersWithActiveSubs };
  };

  const stats = getUserStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-8 w-8 text-purple-600" />
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
              </div>
              <p className="text-gray-600">Administra usuarios registrados y sus suscripciones</p>
            </div>
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Panel de Usuarios:</strong> Aquí puedes ver todos los usuarios registrados, 
            sus suscripciones activas y gestionar sus roles manualmente.
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {users.length}
              </div>
              <p className="text-sm text-gray-600">Usuarios Registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {stats.activeUsers}
              </div>
              <p className="text-sm text-gray-600">Usuarios Activos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {stats.usersWithSubs}
              </div>
              <p className="text-sm text-gray-600">Con Roles Asignados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {stats.usersWithActiveSubs}
              </div>
              <p className="text-sm text-gray-600">Con Suscripción Activa</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por email o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="FINFOCUS_START">FINFOCUS START</SelectItem>
                  <SelectItem value="FINFOCUS">FINFOCUS</SelectItem>
                  <SelectItem value="FINFOCUS_PLUS">FINFOCUS PREMIUM</SelectItem>
                  <SelectItem value="FINFOCUS_PLATINO">FINFOCUS PLATINO</SelectItem>
                  <SelectItem value="FINFOCUS_ADVANCED">FINFOCUS ADVANCED</SelectItem>
                  <SelectItem value="FINLEGAL_ESENCIAL">FINLEGAL ESENCIAL</SelectItem>
                  <SelectItem value="FINLEGAL_PLUS">FINLEGAL PLUS</SelectItem>
                  <SelectItem value="FINLEGAL_TOTAL">FINLEGAL TOTAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios Registrados ({filteredUsers.length})</CardTitle>
            <CardDescription>Lista de todos los usuarios en la plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No se encontraron usuarios</p>
                </div>
              ) : (
                filteredUsers.map(user => {
                  const activeSub = getActiveSubscription(user.email);
                  const allSubs = getUserSubscriptions(user.email);
                  const roles = Array.isArray(user.userRoles) ? user.userRoles : 
                               (typeof user.userRoles === 'string' ? [user.userRoles] : []);
                  const isActive = user.isActive !== false;

                  return (
                    <div key={user.key} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              {isActive ? (
                                <UserCheck className="h-5 w-5 text-green-600" />
                              ) : (
                                <UserX className="h-5 w-5 text-red-600" />
                              )}
                              <h3 className="font-semibold text-lg">
                                {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre'}
                              </h3>
                            </div>
                            {user.role === 'admin' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </span>
                            )}
                            {!isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Inactivo
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-gray-600">Email</p>
                              <p className="font-medium">{user.email}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Fecha de Registro</p>
                              <p className="font-medium">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-AR') : 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Roles del usuario */}
                          <div className="mb-3">
                            <p className="text-sm text-gray-600 mb-2">Roles Asignados</p>
                            {roles.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {roles.map(role => (
                                  <span
                                    key={role}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                  >
                                    {role.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">Sin roles asignados</p>
                            )}
                          </div>

                          {/* Suscripciones */}
                          {allSubs.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Suscripciones ({allSubs.length})</p>
                              <div className="space-y-2">
                                {allSubs.map(sub => (
                                  <div key={sub.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <div className="flex items-center gap-3">
                                      <CreditCard className="h-4 w-4 text-gray-400" />
                                      <div>
                                        <p className="text-sm font-medium">{sub.planName}</p>
                                        <p className="text-xs text-gray-600">
                                          {new Date(sub.startDate).toLocaleDateString('es-AR')} - {new Date(sub.endDate).toLocaleDateString('es-AR')}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(sub.status)}
                                      {(sub.status === 'active' || sub.status === 'authorized') && !roles.includes(sub.planRole) && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleActivateSubscription(user.email, sub.planRole)}
                                        >
                                          Activar Rol
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {user.notes && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-600">Notas</p>
                              <p className="text-sm text-gray-700">{user.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>
                Modifica los roles y configuración del usuario: {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* User Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Información del Usuario</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <span className="ml-2 font-medium">{selectedUser?.fullName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{selectedUser?.email}</span>
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div>
                <Label className="mb-2 block">Estado del Usuario</Label>
                <Select 
                  value={editFormData.isActive ? 'active' : 'inactive'} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, isActive: value === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Roles */}
              <div>
                <Label className="mb-3 block">Roles / Planes</Label>
                <div className="space-y-2">
                  {[
                    'FINFOCUS_START',
                    'FINFOCUS',
                    'FINFOCUS_PLUS',
                    'FINFOCUS_PLATINO',
                    'FINFOCUS_ADVANCED',
                    'FINLEGAL_ESENCIAL',
                    'FINLEGAL_PLUS',
                    'FINLEGAL_TOTAL'
                  ].map(role => (
                    <div key={role} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`role-${role}`}
                        checked={editFormData.userRoles.includes(role)}
                        onChange={() => handleToggleRole(role)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor={`role-${role}`} className="text-sm cursor-pointer">
                        {role.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="mb-2 block">Notas Administrativas</Label>
                <Input
                  id="notes"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Notas sobre el usuario..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button onClick={handleUpdateUser} className="flex-1">
                  Guardar Cambios
                </Button>
                <Button 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedUser(null);
                  }} 
                  variant="outline" 
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}