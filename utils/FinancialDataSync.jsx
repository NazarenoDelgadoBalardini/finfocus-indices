import { SyncConfig } from '@/entities/SyncConfig';
import { FinancialData } from '@/entities/FinancialData';

// ==========================================
// MARCA DE VERIFICACIÓN DE VERSIÓN
// ==========================================
console.log(
  '🚀🚀🚀 VERSION NUEVA CARGADA -test- V4 (TIMESTAMP: ' +
    new Date().toISOString() +
    ') 🚀🚀🚀'
);

/**
 * Obtiene datos financieros de una categoría específica desde la base de datos local
 */
export async function getFinancialData(category) {
  try {
    const results = await FinancialData.filter(
      { category, isActive: true },
      '-lastSync',
      1
    );

    if (!results || results.length === 0) {
      console.warn(
        `No se encontraron datos para la categoría: ${category}`
      );
      return null;
    }

    return results[0];
  } catch (error) {
    console.error(`Error obteniendo datos de ${category}:`, error);
    return null;
  }
}

/**
 * Obtiene TODOS los datos financieros disponibles
 */
export async function getAllFinancialData() {
  console.log('V4 Financial Data');
  try {
    const allData = await FinancialData.filter(
      { isActive: true },
      '-lastSync',
      100
    );
    const dataByCategory = {};
    allData.forEach((item) => {
      dataByCategory[item.category] = item;
    });
    return dataByCategory;
  } catch (error) {
    console.error(
      'Error obteniendo todos los datos financieros:',
      error
    );
    return {};
  }
}

/**
 * Limpia registros duplicados
 */
export async function cleanupDuplicates() {
  console.log('🧹 Iniciando limpieza de registros duplicados...');

  try {
    const allRecords = await FinancialData.list('-lastSync', 1000);

    if (!allRecords || allRecords.length === 0) {
      console.log('   ℹ️ No hay registros para limpiar');
      return { success: true, deleted: 0 };
    }

    const byCategory = {};
    allRecords.forEach((record) => {
      if (!record.category) return;
      if (!byCategory[record.category]) byCategory[record.category] = [];
      byCategory[record.category].push(record);
    });

    let totalDeleted = 0;

    for (const [category, records] of Object.entries(byCategory)) {
      if (records.length <= 1) continue;

      records.sort((a, b) => {
        const dateA = new Date(a.lastSync || a.createdAt || 0);
        const dateB = new Date(b.lastSync || b.createdAt || 0);
        return dateB - dateA;
      });

      const toDelete = records.slice(1);

      for (const record of toDelete) {
        try {
          if (record.id) {
            await FinancialData.delete(record.id);
            totalDeleted++;
          }
        } catch (deleteError) {
          console.warn(
            `      ⚠️ Error eliminando ${record.id}:`,
            deleteError.message
          );
        }
      }
    }

    return {
      success: true,
      deleted: totalDeleted,
      categories: Object.keys(byCategory).length,
    };
  } catch (error) {
    console.error('❌ Error en limpieza de duplicados:', error);
    return { success: false, error: error.message, deleted: 0 };
  }
}

// keep this to make sure exports works
export function makesureExportWorfks() {
  console.log('exports are working');
}

/**
 * Función principal de sincronización
 */
export async function syncFinancialData() {
  console.log('syncFinancialData');
  console.log('🔄 Iniciando sincronización de datos financieros... (V4)');

  try {
    const configs = await SyncConfig.list('-createdAt', 1);
    if (!configs || configs.length === 0)
      return { success: false, error: 'No hay configuración' };

    const config = configs[0];
    if (!config.isActive)
      return { success: false, error: 'Sincronización pausada' };

    if (
      !config.integrationName ||
      !config.googleSheets ||
      config.googleSheets.length === 0
    ) {
      return { success: false, error: 'Configuración incompleta' };
    }

    const axios = (await import('axios')).default;
    let totalSyncedSheets = 0;
    let totalGoogleSheets = 0;
    const errors = [];
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3; // Detener después de 3 errores consecutivos

    for (const googleSheet of config.googleSheets) {
      if (!googleSheet.isActive) continue;

      totalGoogleSheets++;
      const sheetsToSync =
        googleSheet.individualSheets?.filter((s) => s.isActive) || [];

      if (sheetsToSync.length === 0) continue;

      for (const individualSheet of sheetsToSync) {
        // Circuit breaker: detener si hay demasiados errores consecutivos
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(`❌ Deteniendo sincronización: ${MAX_CONSECUTIVE_ERRORS} errores consecutivos detectados`);
          errors.push(`Sincronización detenida por múltiples errores consecutivos`);
          break;
        }

        try {
          console.log(
            `    🔄 Procesando: "${individualSheet.sheetName}"`
          );

          const range = `'${individualSheet.sheetName}'!A:ZZ`;

          const response = await axios.get(
            `${process.env.PROXY_INTEGRATION_URL}/integrations/google/spreadsheet-content`,
            {
              headers: { 'x-api-key': window.config.apiKey },
              params: {
                integrationId:
                  window.integrations[config.integrationName],
                spreadsheetId: googleSheet.sheetId,
                range: range,
              },
              timeout: 30000, // 30 segundos timeout
            }
          );

          // Reset contador de errores consecutivos en caso de éxito
          consecutiveErrors = 0;

          let sheetData = null;
          const sheets = response.data?.sheets || {};

          if (sheets[individualSheet.sheetName]) {
            sheetData = sheets[individualSheet.sheetName];
          } else {
            const normalizedName = individualSheet.sheetName
              .trim()
              .toLowerCase();
            const foundKey = Object.keys(sheets).find(
              (key) => key.trim().toLowerCase() === normalizedName
            );
            if (foundKey) sheetData = sheets[foundKey];
          }

          if (!sheetData) {
            errors.push(
              `No se encontraron datos para ${individualSheet.sheetName}`
            );
            consecutiveErrors++;
            continue;
          }

          // === DIAGNÓSTICO UVA ===
          if (
            individualSheet.sheetName.toUpperCase().includes('UVA')
          ) {
            const totalFilas = sheetData.values
              ? sheetData.values.length
              : 0;
            console.log(
              `   🔢 DIAGNÓSTICO UVA: Filas recibidas: ${totalFilas}`
            );
          }

// === DATOS CRUDOS DE LA HOJA ===
const sheetValues = sheetData.values || [];

// Normalizamos categoría
const category = individualSheet.sheetName
  .toLowerCase()
  .replace(/\s+/g, '_')
  .replace(/[áàäâ]/g, 'a')
  .replace(/[éèëê]/g, 'e')
  .replace(/[íìïî]/g, 'i')
  .replace(/[óòöô]/g, 'o')
  .replace(/[úùüû]/g, 'u')
  .replace(/[ñ]/g, 'n')
  .replace(/[^a-z0-9_]/g, '');

if (!category) continue;

// === LEEMOS LO QUE YA TENEMOS EN BD PARA ESA CATEGORÍA ===
let mergedData = sheetValues; // fallback por defecto

try {
  const existing = await FinancialData.filter(
    { category },
    '-lastSync',
    1
  );

  if (existing && existing.length > 0 && Array.isArray(existing[0].data)) {
    const existingData = existing[0].data || [];

    if (existingData.length === 0) {
      mergedData = sheetValues;
    } else {
      const lastExistingRow = existingData[existingData.length - 1];

      // Buscamos la última fila existente dentro de la hoja actual
      const lastIndexInSheet = sheetValues.findIndex(
        (row) => JSON.stringify(row) === JSON.stringify(lastExistingRow)
      );

      if (lastIndexInSheet >= 0) {
        const newRows = sheetValues.slice(lastIndexInSheet + 1);
        mergedData = existingData.concat(newRows);
        console.log(
          `    ➕ Agregadas ${newRows.length} filas nuevas a "${individualSheet.sheetName}"`
        );
      } else {
        // Si no la encontramos, algo cambió fuerte; reimportamos todo
        console.warn(
          `    ⚠️ No se encontró la última fila existente en la hoja "${individualSheet.sheetName}". Se reemplaza por el contenido completo.`
        );
        mergedData = sheetValues;
      }
    }

    // OPCIONAL: límite máximo de historial guardado
    const MAX_ROWS = 12000;
    if (mergedData.length > MAX_ROWS) {
      mergedData = mergedData.slice(-MAX_ROWS);
      console.log(
        `    ✂️ Recortando historial a ${MAX_ROWS} filas en "${individualSheet.sheetName}"`
      );
    }

    // Armamos el payload
    const dataToSave = {
      category,
      sheetName: individualSheet.sheetName,
      googleSheetName: googleSheet.name,
      googleSheetId: googleSheet.sheetId,
      gid: individualSheet.gid || null,
      data: mergedData,
      headers: sheetData.headers || [],
      rowCount: mergedData.length,
      columnCount: sheetData.totalColumns || 0,
      lastSync: new Date().toISOString(),
      isActive: true,
    };

    let newRecord;

    // UPDATE si existe, CREATE si no
    if (existing && existing.length > 0) {
      newRecord = await FinancialData.update(existing[0].id, dataToSave);
      console.log(
        `    🔄 Actualizado registro existente. ID: ${existing[0].id}`
      );
    } else {
      newRecord = await FinancialData.create(dataToSave);
      console.log(`    🆕 Creado nuevo registro. ID: ${newRecord.id}`);
    }

    totalSyncedSheets++;
  } else {
    // No había registro previo → guardamos todo como nuevo
    const dataToSave = {
      category,
      sheetName: individualSheet.sheetName,
      googleSheetName: googleSheet.name,
      googleSheetId: googleSheet.sheetId,
      gid: individualSheet.gid || null,
      data: sheetValues,
      headers: sheetData.headers || [],
      rowCount: sheetValues.length,
      columnCount: sheetData.totalColumns || 0,
      lastSync: new Date().toISOString(),
      isActive: true,
    };

    const newRecord = await FinancialData.create(dataToSave);
    console.log(`    🆕 Creado nuevo registro. ID: ${newRecord.id}`);
    totalSyncedSheets++;
  }
} catch (saveError) {
  console.error('    ❌ Error al guardar (UPSERT incremental):', saveError);
  errors.push(`Error al guardar ${individualSheet.sheetName}`);
  consecutiveErrors++;
  continue;
}
        } catch (sheetError) {
          consecutiveErrors++;
          
          // Manejo específico de errores HTTP
          if (sheetError.response) {
            const status = sheetError.response.status;
            const errorMsg = `Error ${status} en "${individualSheet.sheetName}"`;
            
            if (status === 500) {
              console.error(`    ❌ Error 500 del servidor en hoja "${individualSheet.sheetName}". Saltando...`);
              errors.push(`${errorMsg} - Error del servidor`);
            } else if (status === 429) {
              console.error(`    ❌ Rate limit excedido. Deteniendo sincronización temporalmente.`);
              errors.push(`Rate limit excedido`);
              break; // Detener completamente si hay rate limiting
            } else if (status === 401 || status === 403) {
              console.error(`    ❌ Error de autenticación/permisos. Verifica la configuración de la integración.`);
              errors.push(`${errorMsg} - Error de autenticación`);
              break; // Detener si hay problemas de autenticación
            } else {
              console.error(`    ❌ Error HTTP ${status}:`, sheetError.message);
              errors.push(errorMsg);
            }
          } else if (sheetError.code === 'ECONNABORTED') {
            console.error(`    ❌ Timeout en "${individualSheet.sheetName}"`);
            errors.push(`Timeout en ${individualSheet.sheetName}`);
          } else {
            console.error('    ❌ Error general en hoja:', sheetError.message || sheetError);
            errors.push(`Error en ${individualSheet.sheetName}`);
          }
          
          // Pequeño delay antes de continuar con la siguiente hoja
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Si hubo circuit breaker, salir del loop principal
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        break;
      }
    }

    console.log(`\n✅ Sincronización completada (V4)`);

    return {
      success: errors.length === 0,
      syncedSheets: totalSyncedSheets,
      totalGoogleSheets: totalGoogleSheets,
      errors: errors.length > 0 ? errors : null,
    };
  } catch (error) {
    console.error('❌ Error crítico en sincronización:', error);
    try {
      const configs = await SyncConfig.list('-createdAt', 1);
      if (configs && configs.length > 0 && configs[0].id) {
        await SyncConfig.update(configs[0].id, {
          lastSyncStatus: 'error',
          lastSyncError: error.message,
        });
      }
    } catch (e) {}

    return {
      success: false,
      error: error.message,
      syncedSheets: 0,
      totalGoogleSheets: 0,
    };
  }
}