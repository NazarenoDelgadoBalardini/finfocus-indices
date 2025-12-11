import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, Sparkles, Gift } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getTrialStatus, startTrial } from '@/utils/ToolAccess';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Subscription } from '@/entities/Subscription';
import { FinancialData } from '@/entities/FinancialData';

const HERO_BLUE = '#0f2f4b';

export default function TrialBanner({ user, onTrialActivated }) {
  const navigate = useNavigate();
  const [activating, setActivating] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasBeca, setHasBeca] = useState(false);
  const trialStatus = getTrialStatus(user);

  // Verificar si el usuario tiene una beca
  useEffect(() => {
    const checkBeca = async () => {
      if (!user?.email) {
        setHasBeca(false);
        return;
      }

      try {
        const becasData = await FinancialData.filter({ category: 'becas' });
        
        if (becasData && becasData.length > 0) {
          const becasRecord = becasData[0];
          const becasRows = becasRecord.data || [];
          
          // El email está en la posición 2 (índice 2) de cada fila
          const userHasBeca = becasRows.some(row => {
            const emailInRow = row[2];
            return emailInRow && emailInRow.toLowerCase() === user.email.toLowerCase();
          });
          
          setHasBeca(userHasBeca);
          
          if (userHasBeca) {
            console.log(`🎓 TrialBanner: Beca detectada para ${user.email}`);
          }
        }
      } catch (error) {
        console.error('Error verificando beca:', error);
        setHasBeca(false);
      }
    };

    checkBeca();
  }, [user?.email]);

  // Verificar si el usuario tiene una suscripción activa
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const subscriptions = await Subscription.filter({
          userId: user.id,
          status: 'active'
        });

        setHasActiveSubscription(subscriptions && subscriptions.length > 0);
      } catch (error) {
        console.error('Error verificando suscripción:', error);
        setHasActiveSubscription(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user?.id]);

  // Si está cargando, no mostrar nada
  if (loading) {
    return null;
  }

  // Si el usuario tiene algún rol asignado, NO mostrar ningún banner
  if (user?.userRoles && user.userRoles.length > 0) {
    return null;
  }

  // Si el usuario tiene una suscripción activa, NO mostrar ningún banner
  if (hasActiveSubscription) {
    return null;
  }

  const handleActivateTrial = async () => {
    try {
      setActivating(true);
      // Si tiene beca, activar por 60 días; si no, por 7 días
      const durationDays = hasBeca ? 60 : 7;
      const trialData = startTrial(durationDays);
      
      await User.update({
        trialStartDate: trialData.trialStartDate,
        trialEndDate: trialData.trialEndDate,
        trialUsed: true
      });

      // Recargar la página para actualizar el estado
      window.location.reload();
    } catch (error) {
      console.error('Error activando trial:', error);
      alert('Hubo un error al activar tu prueba gratuita. Por favor, intenta nuevamente.');
    } finally {
      setActivating(false);
    }
  };

  // Usuario sin trial y no lo ha usado → Mostrar botón de activar
  if (trialStatus.status === 'no_trial' && !user?.trialUsed) {
    const trialDays = hasBeca ? 60 : 7;
    
    return (
      <Alert className="mb-6 rounded-xl border border-[#0f2f4b] bg-[#0f2f4b] text-white">
        <Gift className="h-5 w-5" color="white" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <span className="font-semibold block mb-1">
              🎉 ¡Activa tu prueba gratuita de {trialDays} días!
            </span>
            <span className="text-sm text-blue-100">
              Accedé a todas las herramientas sin costo durante {trialDays} días.
              Solo podés activarla una vez.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleActivateTrial}
            disabled={activating}
            className="bg-white text-[#0f2f4b] hover:bg-slate-100"
          >
            {activating ? 'Activando...' : 'Activar prueba gratuita'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Usuario ya usó su trial pero no tiene suscripción activa
  if (trialStatus.status === 'no_trial' && user?.trialUsed) {
    return (
      <Alert className="mb-6 border-[1px] border-[#0f2f4b] bg-white">
        <AlertCircle className="h-5 w-5 text-[#0f2f4b]" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="font-medium text-slate-800">
            Ya usaste tu prueba gratuita. Suscribite para seguir accediendo a todas las herramientas.
          </span>
          <Button
            size="sm"
            onClick={() => navigate(createPageUrl('Planes'))}
            className="bg-[#0f2f4b] hover:bg-[#0b2237] text-white"
          >
            Ver planes
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial activo
  if (trialStatus.status === 'active') {
    return (
      <Alert className="mb-6 border-[1px] border-[#0f2f4b] bg-[#0f2f4b]/5 backdrop-blur-sm">
        <Sparkles className="h-5 w-5 text-[#0f2f4b]" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#0f2f4b]" />
            <span className="font-medium text-[#0f2f4b]">
              Período de prueba activo – {trialStatus.daysRemaining} día
              {trialStatus.daysRemaining !== 1 ? 's' : ''} restante
              {trialStatus.daysRemaining !== 1 ? 's' : ''}.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(createPageUrl('Planes'))}
            className="bg-[#0f2f4b] hover:bg-[#0b2237] text-white"
          >
            Ver planes
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial expirado
  if (trialStatus.status === 'expired') {
    return (
      <Alert className="mb-6 border-[1px] border-[#0f2f4b] bg-white">
        <AlertCircle className="h-5 w-5 text-[#0f2f4b]" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="font-medium text-slate-800">
            Tu período de prueba terminó. Suscribite para seguir disfrutando de todas las herramientas de FINFOCUS.
          </span>
          <Button
            size="sm"
            onClick={() => navigate(createPageUrl('Planes'))}
            className="bg-[#0f2f4b] hover:bg-[#0b2237] text-white"
          >
            Suscribirme
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}