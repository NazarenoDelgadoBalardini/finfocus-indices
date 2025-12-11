import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Info,
  RefreshCw
} from 'lucide-react';
import { getFinancialData, getAllFinancialData } from '@/utils/FinancialDataSync';

/**
 * Componente de ejemplo que muestra cómo usar los datos financieros sincronizados
 * en tus calculadoras.
 * 
 * IMPORTANTE: Este es un componente de EJEMPLO para que veas cómo acceder a los datos.
 * Puedes copiar este patrón en tus propias calculadoras.
 */
export default function FinancialDataExample() {
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('tasas_bna');

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      // Opción 1: Obtener TODOS los datos de una vez
      const data = await getAllFinancialData();
      setAllData(data);

      // Opción 2: Obtener datos de una categoría específica
      // const tasasBNA = await getFinancialData('tasas_bna');
      // const indices = await getJFinancialData('indices');
      // const ripte = await getFinancialData('ripte');
      
      setLoading(false);
    } catch (error) {
      console.error('Error cargando datos financieros:', error);
      setLoading(false);
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'tasas_bna': 'Tasas BNA (Activa)',
      'tasas_bcra': 'Tasas BCRA (Pasiva)',
      'indices': 'Índices (CER, UVA, UVI, ICL)',
      'ripte': 'RIPTE',
      'ipc': 'IPC (Inflación)',
      'smvm': 'SMVM (Salario Mínimo)',
      'licencias_abogados': 'Licencias de Abogados',
      'dias_inhabiles': 'Días Inhábiles'
    };
    return labels[category] || category;
  };

  const renderDataTable = (categoryData) => {
    if (!categoryData || !categoryData.data || categoryData.data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay datos disponibles para esta categoría</p>
          <p className="text-sm mt-2">Configura la sincronización en el panel de administración</p>
        </div>
      );
    }

    const headers = categoryData.headers || [];
    const rows = [...(categoryData.data || [])].reverse();

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.slice(0, 10).map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 10 && (
          <div className="text-center py-4 text-sm text-gray-500">
            Mostrando 10 de {rows.length} filas
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos financieros...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableCategories = Object.keys(allData);

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>💡 Ejemplo de Uso:</strong> Este componente muestra cómo acceder a los datos financieros 
          sincronizados desde tu Google Sheet. Los datos se actualizan automáticamente cada minuto y están 
          disponibles instantáneamente sin límites de API.
        </AlertDescription>
      </Alert>

      {/* Code Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cómo Usar en Tus Calculadoras
          </CardTitle>
          <CardDescription>Copia este código en tus componentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`import { getFinancialData, getAllJFinancialData } from '@/utils/FinancialDataSync';

// En tu componente:
const [tasasBNA, setTasasBNA] = useState(null);

useEffect(() => {
  const loadData = async () => {
    // Obtener datos de una categoría específica
    const data = await getFinancialData('tasas_bna');
    setTasasBNA(data);
    
    // O obtener todos los datos
    const allData = await getAllFinancialData();
    // allData.tasas_bna, allData.indices, etc.
  };
  loadData();
}, []);

// Usar los datos:
// tasasBNA.data = array de filas
// tasasBNA.headers = array de encabezados
// tasasBNA.rowCount = cantidad de filas`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Data Viewer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Datos Financieros Disponibles</CardTitle>
              <CardDescription>
                {availableCategories.length} categorías sincronizadas
              </CardDescription>
            </div>
            <Button onClick={loadFinancialData} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {availableCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay datos sincronizados</p>
              <p className="text-sm mt-2">Configura la sincronización en el panel de administración</p>
            </div>
          ) : (
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto">
                {availableCategories.map((category) => (
                  <TabsTrigger 
                    key={category} 
                    value={category}
                    className="text-xs"
                  >
                    {getCategoryLabel(category).split(' ')[0]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {availableCategories.map((category) => (
                <TabsContent key={category} value={category} className="mt-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{getCategoryLabel(category)}</h3>
                    <p className="text-sm text-gray-600">
                      {allData[category]?.rowCount || 0} filas • 
                      {allData[category]?.headers?.length || 0} columnas • 
                      Última actualización: {allData[category]?.lastSync 
                        ? new Date(allData[category].lastSync).toLocaleString('es-AR')
                        : 'Nunca'}
                    </p>
                  </div>
                  {renderDataTable(allData[category])}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Categories Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {availableCategories.map((category) => {
          const data = allData[category];
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {getCategoryLabel(category)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Filas:</span>
                    <span className="font-semibold">{data?.rowCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Columnas:</span>
                    <span className="font-semibold">{data?.headers?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}