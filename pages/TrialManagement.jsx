import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle,
  Shield,
  Calendar,
  User as UserIcon
} from 'lucide-react';
import { startTrial, getTrialStatus } from '@/utils/ToolAccess';
import axios from 'axios';

export default function TrialManagement() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      
      if (userData?.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }
      
      setCurrentUser(userData);
      await loadUsers();
    } catch (error) {
      console.error('Error loading data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    // Obtener todos los usuarios desde la base de datos
    const response = await axios.get(`${process.env.PROXY_INTEGRATION_URL}/database/query`, {
      params: {
        query: 'SELECT * FROM users ORDER BY "createdAt" DESC'
      },
      headers: {
        'x-api-key': window.config.apiKey
      }
    });
    
    setUsers(response.data || []);
  };

  const activateTrial = async (userId, durationDays = 7) => {
    setProcessingUserId(userId);
    setMessage(null);
    
    try {
      const trialData = startTrial(durationDays);
      
      // Actualizar el usuario con los datos del trial
      await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/database/query`,
        {
          query: `UPDATE users SET "trialStartDate" = $1, "trialEndDate" = $2, "trialUsed" = $3, "updatedAt" = NOW() WHERE id = $4`,
          params: [trialData.trialStartDate, trialData.trialEndDate, trialData.trialUsed, userId]
        },
        {
          headers: {
            'x-api-key': window.config.apiKey
          }
        }
      );
      
      setMessage({
        type: 'success',
        text: `Trial de ${durationDays} días activado exitosamente`
      });
      
      await loadUsers();
    } catch (error) {
      console.error('Error activating trial:', error);
      setMessage({
        type: 'error',
        text: 'Error al activar el trial. Intenta nuevamente.'
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const deactivateTrial = async (userId) => {
    setProcessingUserId(userId);
    setMessage(null);
    
    try {
      await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/database/query`,
        {
          query: `UPDATE users SET "trialStartDate" = NULL, "trialEndDate" = NULL, "updatedAt" = NOW() WHERE id = $1`,
          params: [userId]
        },
        {
          headers: {
            'x-api-key': window.config.apiKey
          }
        }
      );
      
      setMessage({
        type: 'success',
        text: 'Trial desactivado exitosamente'
      });
      
      await loadUsers();
    } catch (error) {
      console.error('Error deactivating trial:', error);
      setMessage({
        type: 'error',
        text: 'Error al desactivar el trial. Intenta nuevamente.'
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-600" />
            Gestión de Trials
          </h1>
          <p className="text-gray-600 mt-2">Administra los períodos de prueba de los usuarios</p>
        </div>
        <Button variant="outline" onClick={() => navigate(createPageUrl('Admin'))}>
          <Shield className="h-4 w-4 mr-2" />
          Volver a Admin
        </Button>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert className={message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-900' : 'text-red-900'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">¿Cómo funciona el Trial?</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-2">
          <p>• Los usuarios en trial solo pueden acceder a herramientas con <strong>allowTrial: true</strong></p>
          <p>• El trial tiene una duración configurable (por defecto 7 días)</p>
          <p>• Una vez expirado, el usuario pierde acceso a las herramientas de trial</p>
          <p>• Puedes activar/desactivar trials manualmente desde esta página</p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Buscar usuarios por email o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.map(user => {
          const trialStatus = getTrialStatus(user);
          const isProcessing = processingUserId === user.id;
          
          return (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="font-semibold text-lg">{user.fullName || 'Sin nombre'}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3">
                      {/* Trial Status */}
                      {trialStatus.status === 'active' && (
                        <Badge className="bg-blue-500">
                          <Clock className="h-3 w-3 mr-1" />
                          Trial Activo - {trialStatus.daysRemaining} día{trialStatus.daysRemaining !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      
                      {trialStatus.status === 'expired' && (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Trial Expirado
                        </Badge>
                      )}
                      
                      {trialStatus.status === 'no_trial' && (
                        <Badge variant="outline">
                          Sin Trial
                        </Badge>
                      )}
                      
                      {/* User Roles */}
                      {user.userRoles && Array.isArray(user.userRoles) && user.userRoles.length > 0 && (
                        <div className="flex gap-2">
                          {user.userRoles.map(role => (
                            <Badge key={role} className="bg-purple-100 text-purple-800">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {trialStatus.status === 'active' && trialStatus.endDate && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Vence: {new Date(trialStatus.endDate).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {trialStatus.status === 'active' ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deactivateTrial(user.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Procesando...' : 'Desactivar Trial'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activateTrial(user.id, 7)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Procesando...' : 'Trial 7 días'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activateTrial(user.id, 14)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Procesando...' : 'Trial 14 días'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activateTrial(user.id, 30)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Procesando...' : 'Trial 30 días'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No se encontraron usuarios</h3>
          <p className="text-gray-500 mt-2">Intenta con otros términos de búsqueda</p>
        </div>
      )}
    </div>
  );
}