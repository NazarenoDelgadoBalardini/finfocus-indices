import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Settings,
  AlertCircle,
  Play,
  Pause,
  Info,
  Plus,
  Trash2,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import { SyncConfig } from '@/entities/SyncConfig';
import { FinancialData } from '@/entities/FinancialData';
import { syncFinancialData } from '@/utils/FinancialDataSync';
import moment from 'moment';

export default function SyncAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [config, setConfig] = useState(null);
  const [financialData, setFinancialData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [formData, setFormData] = useState({
    googleSheets: [],
    integrationName: '',
    syncIntervalMinutes: 1,
    isActive: true
  });

  const [newSheet, setNewSheet] = useState({
    sheetId: '',
    name: '',
    isActive: true,
    individualSheets: []
  });

  const [newIndividualSheet, setNewIndividualSheet] = useState({
    sheetName: '',
    gid: '',
    isActive: true
  });

  const [selectedSheetIndex, setSelectedSheetIndex] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Verificar usuario admin
      const userModule = await import('@/entities/User');
      const BuiltInUser = userModule.User;
      const userData = await BuiltInUser.me();
      setCurrentUser(userData);

      if (userData?.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }

      // Cargar configuración
      const configs = await SyncConfig.list('-createdAt', 1);
      if (configs && configs.length > 0) {
        const cfg = configs[0];
        setConfig(cfg);
        
        // Migración automática del formato antiguo
        let googleSheets = cfg.googleSheets || [];
        if (cfg.googleSheetId && googleSheets.length === 0) {
          googleSheets = [{
            sheetId: cfg.googleSheetId,
            name: 'Sheet Principal',
            isActive: true
          }];
        }
        
        setFormData({
          googleSheets: googleSheets,
          integrationName: cfg.integrationName || '',
          syncIntervalMinutes: cfg.syncIntervalMinutes || 1,
          isActive: cfg.isActive !== false
        });
      }

      // Cargar datos financieros
      const data = await FinancialData.list('-lastSync', 100);
      setFinancialData(data || []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading sync admin:', error);
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);

      console.log('💾 Guardando configuración completa...');
      console.log('📊 Google Sheets:', formData.googleSheets.length);
      formData.googleSheets.forEach((gs, idx) => {
        console.log(`  Sheet ${idx + 1}: ${gs.name}`);
        console.log(`    - Hojas individuales: ${gs.individualSheets?.length || 0}`);
        gs.individualSheets?.forEach((is, isIdx) => {
          console.log(`      ${isIdx + 1}. ${is.sheetName} (GID: ${is.gid || 'N/A'}, Activo: ${is.isActive})`);
        });
      });

      if (config) {
        await SyncConfig.update(config.id, formData);
        console.log('✅ Configuración actualizada');
      } else {
        await SyncConfig.create(formData);
        console.log('✅ Configuración creada');
      }

      await loadData();
      alert('✅ Configuración guardada correctamente');
    } catch (error) {
      console.error('❌ Error saving config:', error);
      alert('❌ Error al guardar la configuración: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSheet = () => {
    if (!newSheet.sheetId || !newSheet.name) {
      alert('⚠️ Por favor completa todos los campos');
      return;
    }

    const updatedSheets = [...formData.googleSheets, { ...newSheet, individualSheets: [] }];
    setFormData({ ...formData, googleSheets: updatedSheets });
    setNewSheet({ sheetId: '', name: '', isActive: true, individualSheets: [] });
  };

  const handleRemoveSheet = (index) => {
    const updatedSheets = formData.googleSheets.filter((_, i) => i !== index);
    setFormData({ ...formData, googleSheets: updatedSheets });
  };

  const handleToggleSheetActive = (index) => {
    const updatedSheets = [...formData.googleSheets];
    updatedSheets[index].isActive = !updatedSheets[index].isActive;
    setFormData({ ...formData, googleSheets: updatedSheets });
  };

  const handleAddIndividualSheet = (googleSheetIndex) => {
    if (!newIndividualSheet.sheetName) {
      alert('⚠️ Por favor ingresa el nombre de la hoja');
      return;
    }

    const updatedSheets = [...formData.googleSheets];
    if (!updatedSheets[googleSheetIndex].individualSheets) {
      updatedSheets[googleSheetIndex].individualSheets = [];
    }
    updatedSheets[googleSheetIndex].individualSheets.push({ ...newIndividualSheet });
    setFormData({ ...formData, googleSheets: updatedSheets });
    setNewIndividualSheet({ sheetName: '', gid: '', isActive: true });
    
    // 🔥 IMPORTANTE: Guardar automáticamente después de agregar
    console.log('📝 Guardando configuración automáticamente...');
    console.log('📊 Hojas individuales actuales:', updatedSheets[googleSheetIndex].individualSheets);
  };

  const handleRemoveIndividualSheet = (googleSheetIndex, individualSheetIndex) => {
    const updatedSheets = [...formData.googleSheets];
    updatedSheets[googleSheetIndex].individualSheets = updatedSheets[googleSheetIndex].individualSheets.filter(
      (_, i) => i !== individualSheetIndex
    );
    setFormData({ ...formData, googleSheets: updatedSheets });
  };

  const handleToggleIndividualSheetActive = (googleSheetIndex, individualSheetIndex) => {
    const updatedSheets = [...formData.googleSheets];
    updatedSheets[googleSheetIndex].individualSheets[individualSheetIndex].isActive = 
      !updatedSheets[googleSheetIndex].individualSheets[individualSheetIndex].isActive;
    setFormData({ ...formData, googleSheets: updatedSheets });
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const result = await syncFinancialData();
      
      if (result.success) {
        alert(`✅ Sincronización exitosa: ${result.syncedSheets} hojas sincronizadas de ${result.totalGoogleSheets} Google Sheets`);
        await loadData();
      } else {
        alert(`❌ Error en sincronización: ${result.error}`);
      }
    } catch (error) {
      console.error('Error in manual sync:', error);
      alert('❌ Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const toggleSync = async () => {
    try {
      if (!config) return;
      
      const newStatus = !config.isActive;
      await SyncConfig.update(config.id, { isActive: newStatus });
      await loadData();
    } catch (error) {
      console.error('Error toggling sync:', error);
    }
  };

  const handleDiagnostic = async () => {
    try {
      setDiagnosing(true);
      setDiagnosticResult(null);

      const axios = (await import('axios')).default;
      
      console.log('🔍 Ejecutando diagnóstico...');
      
      const response = await axios.get(`${process.env.PROXY_INTEGRATION_URL}/integrations/google/spreadsheet-content`, {
        headers: {
          "x-api-key": window.config.apiKey
        },
        params: {
          integrationId: window.integrations[formData.integrationName],
          spreadsheetId: formData.googleSheets[0]?.sheetId
        }
      });

      console.log('📊 Respuesta completa:', response.data);
      
      const availableSheets = response.data.availableSheets || [];
      const sheetsWithData = Object.keys(response.data.sheets || {});
      
      setDiagnosticResult({
        spreadsheetTitle: response.data.spreadsheetTitle,
        availableSheets: availableSheets.map(sheet => 
          typeof sheet === 'string' ? sheet : sheet.name || sheet.title || 'Sin nombre'
        ),
        sheetsWithData: sheetsWithData,
        totalSheets: response.data.totalSheets,
        totalAvailableSheets: response.data.totalAvailableSheets
      });

      console.log('✅ Diagnóstico completado');
      console.log('📋 Hojas disponibles:', availableSheets);
      console.log('📦 Hojas con datos:', sheetsWithData);

    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      alert('❌ Error al ejecutar diagnóstico: ' + error.message);
    } finally {
      setDiagnosing(false);
    }
  };

  const getCategoryLabel = (category) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
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
                <Database className="h-8 w-8 text-purple-600" />
                <h1 className="text-3xl font-bold text-gray-900">Sincronización de Datos</h1>
              </div>
              <p className="text-gray-600">Configuración de sincronización con Google Sheets</p>
            </div>
            <Button onClick={() => navigate(createPageUrl('Admin'))} variant="outline">
              Volver a Admin
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Sistema de Sincronización Inteligente:</strong> Los datos se sincronizan automáticamente 
            <strong> solo si pasaron más de 60 minutos</strong> desde la última sincronización exitosa. 
            Esto optimiza el uso de recursos y evita sincronizaciones innecesarias. 
            Solo los administradores pueden ejecutar sincronizaciones.
          </AlertDescription>
        </Alert>

        {/* Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Estado de Sincronización
                </CardTitle>
                <CardDescription>Estado actual del sistema de sincronización</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleDiagnostic}
                  disabled={diagnosing || !formData.googleSheets[0]?.sheetId || !formData.integrationName}
                  variant="outline"
                  size="sm"
                >
                  {diagnosing ? (
                    <>
                      <Search className="h-4 w-4 mr-2 animate-spin" />
                      Diagnosticando...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Diagnosticar Hojas
                    </>
                  )}
                </Button>
                {config && (
                  <Button
                    onClick={toggleSync}
                    variant={config.isActive ? "destructive" : "default"}
                    size="sm"
                  >
                    {config.isActive ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Activar
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleManualSync}
                  disabled={syncing || !config}
                  size="sm"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sincronizar Ahora
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {config?.isActive ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Pause className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-600">Estado</span>
                </div>
                <Badge variant={config?.isActive ? "default" : "secondary"}>
                  {config?.isActive ? 'Activo' : 'Pausado'}
                </Badge>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Última Sincronización</span>
                </div>
                <p className="text-sm font-semibold">
                  {config?.lastSyncDate 
                    ? moment(config.lastSyncDate).format('DD/MM/YYYY HH:mm')
                    : 'Nunca'}
                </p>
                {config?.lastSyncDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const now = new Date().getTime();
                      const lastSync = new Date(config.lastSyncDate).getTime();
                      const elapsed = now - lastSync;
                      const minutesElapsed = Math.floor(elapsed / 60000);
                      const minutesRemaining = Math.max(0, 60 - minutesElapsed);
                      
                      if (minutesRemaining === 0) {
                        return '✅ Lista para sincronizar';
                      } else {
                        return `⏳ Próxima sync en ${minutesRemaining} min`;
                      }
                    })()}
                  </p>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Total Sincronizaciones</span>
                </div>
                <p className="text-2xl font-bold">{config?.totalSyncs || 0}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {config?.lastSyncStatus === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : config?.lastSyncStatus === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <span className="text-sm font-medium text-gray-600">Estado Última Sync</span>
                </div>
                <Badge 
                  variant={
                    config?.lastSyncStatus === 'success' ? 'default' :
                    config?.lastSyncStatus === 'error' ? 'destructive' : 'secondary'
                  }
                >
                  {config?.lastSyncStatus || 'Pendiente'}
                </Badge>
              </div>
            </div>

            {config?.lastSyncError && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Error:</strong> {config.lastSyncError}
                </AlertDescription>
              </Alert>
            )}

            {diagnosticResult && (
              <Alert className="mt-4 border-blue-200 bg-blue-50">
                <Search className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="space-y-2">
                    <p><strong>📊 Spreadsheet:</strong> {diagnosticResult.spreadsheetTitle}</p>
                    <p><strong>📋 Total de hojas:</strong> {diagnosticResult.totalSheets}</p>
                    <p><strong>✅ Hojas disponibles ({diagnosticResult.availableSheets.length}):</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      {diagnosticResult.availableSheets.map((sheet, idx) => (
                        <li key={idx} className="font-mono text-sm">{sheet}</li>
                      ))}
                    </ul>
                    <p className="text-xs mt-2 text-blue-600">
                      💡 Usa estos nombres EXACTOS al configurar las hojas individuales
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Configuration Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
            <CardDescription>Configura la integración y el intervalo de sincronización</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="integrationName">Nombre de la Integración de Google Drive</Label>
                <Input
                  id="integrationName"
                  value={formData.integrationName}
                  onChange={(e) => setFormData({ ...formData, integrationName: e.target.value })}
                  placeholder="Ej: FINFOCUS"
                />
                <p className="text-xs text-gray-500 mt-1">
                  El nombre exacto de tu integración de Google Drive configurada en la plataforma
                </p>
              </div>

              <div>
                <Label htmlFor="syncInterval">Intervalo de Sincronización (minutos)</Label>
                <Input
                  id="syncInterval"
                  type="number"
                  min="1"
                  value={formData.syncIntervalMinutes}
                  onChange={(e) => setFormData({ ...formData, syncIntervalMinutes: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cada cuántos minutos se sincronizarán los datos (recomendado: 1 minuto)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Google Sheets Management Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Google Sheets Configurados
            </CardTitle>
            <CardDescription>
              Agrega múltiples Google Sheets y configura las hojas individuales a sincronizar ({formData.googleSheets.length} configurados)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Lista de Google Sheets */}
            {formData.googleSheets.length > 0 && (
              <div className="space-y-6 mb-6">
                {formData.googleSheets.map((sheet, sheetIndex) => (
                  <div key={sheetIndex} className="border rounded-lg p-4 bg-gray-50">
                    {/* Header del Google Sheet */}
                    <div className="flex items-center gap-3 mb-4">
                      <FileSpreadsheet className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{sheet.name}</p>
                        <p className="text-xs text-gray-500 truncate">{sheet.sheetId}</p>
                      </div>
                      <Badge variant={sheet.isActive ? "default" : "secondary"}>
                        {sheet.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleSheetActive(sheetIndex)}
                        >
                          {sheet.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveSheet(sheetIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Hojas individuales */}
                    <div className="ml-8 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Hojas Individuales ({sheet.individualSheets?.length || 0})
                        </h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedSheetIndex(selectedSheetIndex === sheetIndex ? null : sheetIndex)}
                        >
                          {selectedSheetIndex === sheetIndex ? 'Ocultar' : 'Agregar Hoja'}
                        </Button>
                      </div>

                      {/* Lista de hojas individuales */}
                      {sheet.individualSheets && sheet.individualSheets.length > 0 && (
                        <div className="space-y-2">
                          {sheet.individualSheets.map((indSheet, indIndex) => (
                            <div key={indIndex} className="flex items-center gap-2 p-3 bg-white border rounded">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{indSheet.sheetName}</p>
                                {indSheet.gid && (
                                  <p className="text-xs text-gray-500">GID: {indSheet.gid}</p>
                                )}
                              </div>
                              <Badge variant={indSheet.isActive ? "default" : "secondary"} className="text-xs">
                                {indSheet.isActive ? 'Activo' : 'Inactivo'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleIndividualSheetActive(sheetIndex, indIndex)}
                              >
                                {indSheet.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveIndividualSheet(sheetIndex, indIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formulario para agregar hoja individual */}
                      {selectedSheetIndex === sheetIndex && (
                        <div className="mt-3 p-3 bg-white border rounded">
                          <h5 className="text-sm font-semibold mb-3">Agregar Hoja Individual</h5>
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor={`sheetName-${sheetIndex}`} className="text-xs">
                                Nombre de la Hoja *
                              </Label>
                              <Input
                                id={`sheetName-${sheetIndex}`}
                                value={newIndividualSheet.sheetName}
                                onChange={(e) => setNewIndividualSheet({ ...newIndividualSheet, sheetName: e.target.value })}
                                placeholder="Ej: RIPTE, IPC, Tasa activa BNA"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`gid-${sheetIndex}`} className="text-xs">
                                GID (opcional)
                              </Label>
                              <Input
                                id={`gid-${sheetIndex}`}
                                value={newIndividualSheet.gid}
                                onChange={(e) => setNewIndividualSheet({ ...newIndividualSheet, gid: e.target.value })}
                                placeholder="Ej: 0, 123456789"
                                className="text-sm"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                El GID aparece en la URL: gid=XXXXXX
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAddIndividualSheet(sheetIndex)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Agregar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSheetIndex(null);
                                  setNewIndividualSheet({ sheetName: '', gid: '', isActive: true });
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario para agregar nuevo Google Sheet */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Agregar Nuevo Google Sheet</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newSheetName">Nombre Descriptivo</Label>
                  <Input
                    id="newSheetName"
                    value={newSheet.name}
                    onChange={(e) => setNewSheet({ ...newSheet, name: e.target.value })}
                    placeholder="Ej: Datos Financieros 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="newSheetId">ID del Google Sheet</Label>
                  <Input
                    id="newSheetId"
                    value={newSheet.sheetId}
                    onChange={(e) => setNewSheet({ ...newSheet, sheetId: e.target.value })}
                    placeholder="Ej: 1abc123def456..."
                  />
                </div>
              </div>
              <Button onClick={handleAddSheet} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Google Sheet
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t">
              <Button onClick={handleSaveConfig} disabled={loading} size="lg">
                <Settings className="h-4 w-4 mr-2" />
                Guardar Configuración Completa
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Categories Card */}
        <Card>
          <CardHeader>
            <CardTitle>Categorías de Datos Sincronizados</CardTitle>
            <CardDescription>
              {financialData.length} categorías disponibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {financialData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay datos sincronizados aún</p>
                <p className="text-sm mt-2">Configura la sincronización y ejecuta una sincronización manual</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {financialData.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {getCategoryLabel(item.category)}
                        </h3>
                        <p className="text-sm text-gray-600">{item.sheetName}</p>
                        {item.googleSheetName && (
                          <p className="text-xs text-purple-600 mt-1">
                            📄 {item.googleSheetName}
                          </p>
                        )}
                      </div>
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Filas:</span>
                        <span className="ml-2 font-medium">{item.rowCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Columnas:</span>
                        <span className="ml-2 font-medium">{item.columnCount || item.headers?.length || 0}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Última actualización: {moment(item.lastSync).format('DD/MM/YYYY HH:mm:ss')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}