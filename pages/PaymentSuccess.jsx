import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { User } from '@/entities/User';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [user, setUser] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    loadPaymentInfo();
  }, []);

  const loadPaymentInfo = async () => {
    try {
      // 1) Obtener usuario actual
      const userData = await User.me();
      if (!userData || !userData.id) {
        setUser(null);
        setProcessing(false);
        return;
      }
      setUser(userData);

      // 2) Obtener parámetros de la URL
      const urlParams = new URLSearchParams(window.location.search);
      const paymentId = urlParams.get('payment_id');
      const status = urlParams.get('status');
      const externalReference = urlParams.get('external_reference');
      const preapprovalId = urlParams.get('preapproval_id');

      setPaymentInfo({
        paymentId: paymentId || 'N/A',
        status: status || 'unknown',
        externalReference: externalReference || userData.email,
        preapprovalId: preapprovalId || 'N/A',
      });

      setProcessing(false);
    } catch (error) {
      console.error('❌ Error cargando información de pago:', error);
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verificando tu pago...</h2>
              <p className="text-gray-600">Por favor espera un momento.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              Error de Autenticación
            </CardTitle>
            <CardDescription>
              Debes iniciar sesión para ver los detalles de tu suscripción.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full">
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isApproved = paymentInfo?.status === 'approved' || paymentInfo?.status === 'authorized';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className={`w-full max-w-2xl shadow-xl ${isApproved ? 'border-green-200' : 'border-yellow-200'}`}>
        <CardHeader className="text-center">
          <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${
            isApproved ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            {isApproved ? (
              <CheckCircle className="h-10 w-10 text-green-600" />
            ) : (
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            )}
          </div>
          <CardTitle className={`text-3xl ${isApproved ? 'text-green-600' : 'text-yellow-600'}`}>
            {isApproved ? '¡Pago Exitoso!' : 'Pago Pendiente'}
          </CardTitle>
          <CardDescription className="text-lg">
            {isApproved 
              ? 'Tu suscripción ha sido procesada correctamente'
              : 'Tu pago está siendo procesado'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">Información del Pago</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">ID de Pago:</span>
                <span className="font-semibold">{paymentInfo?.paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isApproved 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isApproved ? 'Aprobado' : 'Pendiente'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Usuario:</span>
                <span className="font-semibold">{user.email}</span>
              </div>
              {paymentInfo?.preapprovalId !== 'N/A' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">ID de Suscripción:</span>
                  <span className="font-semibold text-xs">{paymentInfo?.preapprovalId}</span>
                </div>
              )}
            </div>
          </div>

          <div className={`rounded-lg p-4 mb-6 border ${
            isApproved ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className={`text-sm ${isApproved ? 'text-blue-800' : 'text-yellow-800'}`}>
              {isApproved ? (
                <>
                  <strong>¡Bienvenido!</strong> Tu suscripción ha sido activada. 
                  Para acceder a las herramientas, un administrador debe asignar los roles correspondientes 
                  a tu cuenta desde el panel de administración.
                </>
              ) : (
                <>
                  <strong>Pago en proceso.</strong> Tu pago está siendo verificado por Mercado Pago. 
                  Recibirás una confirmación por email cuando se complete el proceso.
                </>
              )}
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 mb-6 border border-purple-200">
            <p className="text-purple-800 text-sm">
              <strong>📧 Próximos pasos:</strong>
              <br />
              1. Recibirás un email de confirmación de Mercado Pago
              <br />
              2. Un administrador asignará los roles a tu cuenta
              <br />
              3. Podrás acceder a todas las herramientas de tu plan
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => navigate(createPageUrl('Dashboard'))} 
              className="flex-1"
            >
              Ir al Dashboard
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl('Planes'))} 
              variant="outline"
              className="flex-1"
            >
              Ver Planes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}