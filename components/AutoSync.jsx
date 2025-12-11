import { useEffect, useRef } from 'react';
import { syncFinancialData } from '@/utils/FinancialDataSync';
import { SyncConfig } from '@/entities/SyncConfig';
import { User } from '@/entities/User';

/**
 * Componente invisible que ejecuta la sincronización automática en segundo plano
 * SOLO SE EJECUTA PARA USUARIOS ADMIN
 * SOLO SE EJECUTA SI PASARON MÁS DE 60 MINUTOS DESDE LA ÚLTIMA SINCRONIZACIÓN
 */
export default function AutoSync() {
  const intervalRef = useRef(null);
  const isRunningRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const SYNC_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutos en milisegundos
  const MAX_CONSECUTIVE_ERRORS = 3; // Pausar después de 3 errores consecutivos
  const ERROR_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos de pausa después de errores

  useEffect(() => {
    let mounted = true;

    const startAutoSync = async () => {
      try {
        // 🔒 VERIFICAR SI EL USUARIO ES ADMIN
        const currentUser = await User.me();
        
        if (!currentUser || currentUser.role !== 'admin') {
          console.log('⏸️ AutoSync: Solo disponible para administradores');
          return;
        }

        console.log('🔓 AutoSync: Usuario admin detectado');

        // Obtener configuración
        const configs = await SyncConfig.list('-createdAt', 1);
        
        if (!configs || configs.length === 0) {
          console.log('⏸️ AutoSync: No hay configuración de sincronización');
          return;
        }

        const config = configs[0];

        // Verificar si está activa
        if (!config.isActive) {
          console.log('⏸️ AutoSync: Sincronización pausada');
          return;
        }

        // 🕐 VERIFICAR ÚLTIMA SINCRONIZACIÓN
        const now = new Date().getTime();
        let shouldSync = true;

        if (config.lastSyncDate) {
          const lastSyncTime = new Date(config.lastSyncDate).getTime();
          const timeSinceLastSync = now - lastSyncTime;
          const minutesSinceLastSync = Math.floor(timeSinceLastSync / 60000);

          if (timeSinceLastSync < SYNC_THRESHOLD_MS) {
            console.log(`⏸️ AutoSync: Última sincronización hace ${minutesSinceLastSync} minutos. Esperando hasta completar 60 minutos.`);
            shouldSync = false;
          } else {
            console.log(`✅ AutoSync: Última sincronización hace ${minutesSinceLastSync} minutos. Ejecutando sincronización...`);
          }
        } else {
          console.log('🆕 AutoSync: Primera sincronización, ejecutando...');
        }

        // Función que ejecuta la sincronización
        const runSync = async () => {
          // Evitar ejecuciones simultáneas
          if (isRunningRef.current) {
            console.log('⏭️ AutoSync: Sincronización ya en progreso, saltando...');
            return;
          }

          // Verificar si hay demasiados errores consecutivos
          if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
            console.warn(`⏸️ AutoSync: Pausado temporalmente debido a ${consecutiveErrorsRef.current} errores consecutivos. Esperando cooldown...`);
            
            // Resetear contador después del cooldown
            setTimeout(() => {
              console.log('🔄 AutoSync: Cooldown completado, reiniciando contador de errores');
              consecutiveErrorsRef.current = 0;
            }, ERROR_COOLDOWN_MS);
            
            return;
          }

          // Verificar nuevamente el threshold antes de ejecutar
          const latestConfigs = await SyncConfig.list('-createdAt', 1);
          if (latestConfigs && latestConfigs.length > 0) {
            const latestConfig = latestConfigs[0];
            
            if (latestConfig.lastSyncDate) {
              const lastSyncTime = new Date(latestConfig.lastSyncDate).getTime();
              const timeSinceLastSync = new Date().getTime() - lastSyncTime;
              
              if (timeSinceLastSync < SYNC_THRESHOLD_MS) {
                const minutesSinceLastSync = Math.floor(timeSinceLastSync / 60000);
                console.log(`⏸️ AutoSync: Sincronización reciente detectada (hace ${minutesSinceLastSync} min). Cancelando ejecución.`);
                return;
              }
            }
          }

          isRunningRef.current = true;
          
          try {
            console.log('🔄 AutoSync: Ejecutando sincronización...');
            const result = await syncFinancialData();
            
            if (result.success) {
              console.log(`✅ AutoSync: Sincronización exitosa - ${result.syncedSheets} hojas sincronizadas`);
              
              // Reset contador de errores en caso de éxito
              consecutiveErrorsRef.current = 0;
              
              // 📝 ACTUALIZAR lastSyncDate EN LA CONFIGURACIÓN
              try {
                await SyncConfig.update(config.id, {
                  lastSyncDate: new Date().toISOString(),
                  lastSyncStatus: 'success',
                  totalSyncs: (config.totalSyncs || 0) + 1
                });
                console.log('✅ AutoSync: Timestamp de última sincronización actualizado');
              } catch (updateError) {
                console.error('⚠️ AutoSync: Error al actualizar timestamp:', updateError);
              }
            } else {
              // Incrementar contador de errores
              consecutiveErrorsRef.current++;
              
              console.warn(`⚠️ AutoSync: Sincronización con errores - ${result.error} (Error ${consecutiveErrorsRef.current}/${MAX_CONSECUTIVE_ERRORS})`);
              
              // Actualizar con estado de error
              try {
                await SyncConfig.update(config.id, {
                  lastSyncDate: new Date().toISOString(),
                  lastSyncStatus: 'error',
                  lastSyncError: result.error || 'Error desconocido'
                });
              } catch (updateError) {
                console.error('⚠️ AutoSync: Error al actualizar estado de error:', updateError);
              }
            }
          } catch (error) {
            // Incrementar contador de errores
            consecutiveErrorsRef.current++;
            
            console.error(`❌ AutoSync: Error en sincronización automática (Error ${consecutiveErrorsRef.current}/${MAX_CONSECUTIVE_ERRORS}):`, error);
            
            // Actualizar con estado de error
            try {
              await SyncConfig.update(config.id, {
                lastSyncDate: new Date().toISOString(),
                lastSyncStatus: 'error',
                lastSyncError: error.message || 'Error desconocido'
              });
            } catch (updateError) {
              console.error('⚠️ AutoSync: Error al actualizar estado de error:', updateError);
            }
          } finally {
            isRunningRef.current = false;
          }
        };

        // Ejecutar inmediatamente si debe sincronizar
        if (mounted && shouldSync) {
          await runSync();
        }

        // Configurar intervalo para verificar cada X minutos
        // (pero solo ejecutará si pasaron 60 minutos desde la última sincronización)
        const intervalMinutes = config.syncIntervalMinutes || 5; // Verificar cada 5 minutos por defecto
        const intervalMs = intervalMinutes * 60 * 1000;

        if (mounted) {
          intervalRef.current = setInterval(runSync, intervalMs);
          console.log(`✅ AutoSync: Verificación configurada cada ${intervalMinutes} minuto(s) (ejecutará solo si pasaron 60+ min desde última sync)`);
        }

      } catch (error) {
        console.error('❌ AutoSync: Error al iniciar sincronización automática:', error);
      }
    };

    // Iniciar sincronización automática
    startAutoSync();

    // Cleanup al desmontar
    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('🛑 AutoSync: Sincronización automática detenida');
      }
    };
  }, []);

  // Este componente no renderiza nada
  return null;
}