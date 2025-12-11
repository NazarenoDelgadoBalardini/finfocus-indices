import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

// =====================
// Helpers y constantes
// =====================
const quitarTildes = (str) =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const excepciones = [
  { calle: /saenz pena/, min: 0, max: 899, soloImpar: true },
  { calle: /moreno|mariano moreno/, min: 0, max: 899 },
  { calle: /entre rios/, min: 0, max: 899 },
  { calle: /las heras|juan gregorio de las heras/, min: 0, max: 899 },
  { calle: /congreso de tucuman|congreso/, min: 0, max: 899 },
  { calle: /9 de julio( de 1816)?/, min: 0, max: 899 },
  {
    calle: /buenos aires|provincia de buenos aires|pcia de buenos aires/,
    min: 0,
    max: 899,
  },
  { calle: /chacabuco|batalla de chacabuco/, min: 0, max: 899 },
  { calle: /ayacucho|batalla de ayacucho/, min: 0, max: 899 },
  { calle: /cama(n|ñ)o|pasaje cama(n|ñ)o/, min: 800, max: 899 },
  { calle: /jujuy|provincia de jujuy|pcia de jujuy/, min: 0, max: 899 },
  {
    calle: /la rioja|provincia de la rioja|pcia de la rioja/,
    min: 0,
    max: 899,
  },
  { calle: /grimau y galvez|pasaje grimau/, min: 700, max: 899 },
  { calle: /alberdi|juan bautista alberdi/, min: 0, max: 899 },
  { calle: /bernabe araoz|b araoz/, min: 2, max: 898, soloPar: true },
  { calle: /rio negro/, min: 500, max: 599 },
  { calle: /2 de abril/, min: 300, max: 399 },
  { calle: /roca|av gral roca/, min: 1, max: 1199, soloImpar: true },
  { calle: /antonio saenz|pasaje saenz/, min: 1100, max: 1199 },
  { calle: /jose rondeau/, min: 0, max: 1199 },
  { calle: /simon bolivar/, min: 0, max: 1199 },
  { calle: /dorrego/, min: 1000, max: 1199 },
  { calle: /lavalle|juan galo lavalle/, min: 1, max: 1199 },
  { calle: /padilla|tiburcio padilla/, min: 100, max: 199 },
  { calle: /lamadrid|gregorio araoz de lamadrid/, min: 1, max: 1199 },
  { calle: /jose maria paz/, min: 1, max: 1199 },
  { calle: /velez sarsfield/, min: 400, max: 500 },
  { calle: /san lorenzo|combate de san lorenzo/, min: 1, max: 1199 },
  { calle: /combate de las piedras|las piedras/, min: 1, max: 1199 },
  { calle: /crisostomo|juan crisostomo alvarez/, min: 1, max: 1199 },
  { calle: /24 de septiembre de 1812/, min: 2, max: 1198, soloPar: true },
];

function getResultadoClasses(variant) {
  const base =
    'mt-4 text-center font-semibold rounded-md px-4 py-3 border transition-colors';
  if (variant === 'success')
    return `${base} bg-green-50 text-green-700 border-green-200`;
  if (variant === 'error')
    return `${base} bg-red-50 text-red-700 border-red-200`;
  if (variant === 'warning')
    return `${base} bg-yellow-50 text-yellow-800 border-yellow-200`;
  return base;
}

// =====================
// Componente principal
// =====================
export default function VerificadorBonoMovilidad({ toolName }) {
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [resultText, setResultText] = useState('');
  const [resultVariant, setResultVariant] = useState(null); // 'success' | 'error' | 'warning'
  const [loading, setLoading] = useState(false);

  const verificarDireccion = () => {
    const calleNormalizada = quitarTildes(calle || '');
    const numeroInt = parseInt(numero, 10);

    if (!calleNormalizada || isNaN(numeroInt)) {
      setResultText('⚠️ Por favor ingresa una calle y número válidos.');
      setResultVariant('warning');
      return;
    }

    // Limpiar y mostrar spinner
    setResultText('');
    setResultVariant(null);
    setLoading(true);

    // Dejar spinner visible 1 segundo SIEMPRE
    setTimeout(() => {
      const esPar = numeroInt % 2 === 0;
      const esImpar = !esPar;

      for (let ex of excepciones) {
        if (calleNormalizada.match(ex.calle)) {
          const dentroRango = numeroInt >= ex.min && numeroInt <= ex.max;
          const okPar = !ex.soloPar || esPar;
          const okImpar = !ex.soloImpar || esImpar;

          if (dentroRango && okPar && okImpar) {
            setResultText('✅ No requiere bono de movilidad.');
            setResultVariant('success');
            setLoading(false);
            return;
          }
        }
      }

      setResultText('❗ Requiere bono de movilidad.');
      setResultVariant('error');
      setLoading(false);
    }, 1000);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-[#0f2f4b]">
          <MapPin className="h-5 w-5 text-[#0f2f4b]" />
          {toolName || 'Verificador de Bono de Movilidad'}
        </CardTitle>
        <p className="text-sm text-gray-700 mt-2">
          Comprobá si una dirección requiere bono de movilidad. Ingresá la calle y número
          para verificar.
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Calle */}
          <div className="space-y-1">
            <Label htmlFor="calle">Calle</Label>
            <Input
              id="calle"
              list="calles"
              placeholder="Ej: 9 de Julio de 1816"
              value={calle}
              onChange={(e) => setCalle(e.target.value)}
            />
            <datalist id="calles">
              <option value="Av. Sáenz Peña" />
              <option value="9 de Julio" />
              <option value="9 de Julio de 1816" />
              <option value="Moreno" />
              <option value="Entre Ríos" />
              <option value="Las Heras" />
              <option value="Congreso de Tucumán" />
              <option value="Buenos Aires" />
              <option value="Batalla de Chacabuco" />
              <option value="Batalla de Ayacucho" />
              <option value="Camaño" />
              <option value="Jujuy" />
              <option value="La Rioja" />
              <option value="Pasaje Grimau y Gálvez" />
              <option value="Alberdi" />
              <option value="Bernabé Aráoz" />
              <option value="Pasaje Río Negro" />
              <option value="Pasaje 2 de Abril" />
              <option value="Av. Roca" />
              <option value="Pasaje Antonio Sáenz" />
              <option value="José Rondeau" />
              <option value="Simón Bolívar" />
              <option value="Dorrego" />
              <option value="Lavalle" />
              <option value="Pasaje Tiburcio Padilla" />
              <option value="Lamadrid" />
              <option value="José María Paz" />
              <option value="Pasaje Vélez Sarsfield" />
              <option value="San Lorenzo" />
              <option value="Combate de las Piedras" />
              <option value="Juan Crisóstomo Álvarez" />
              <option value="Av. 24 de Septiembre de 1812" />
            </datalist>
          </div>

          {/* Número */}
          <div className="space-y-1">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              type="number"
              placeholder="Ej: 205"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>

          {/* Botón */}
          <Button
            onClick={verificarDireccion}
            disabled={loading}
            className="w-full bg-[#0f2f4b] hover:bg-[#0c243b]"
          >
            {loading ? 'Verificando…' : 'Verificar'}
          </Button>

          {/* Spinner */}
          {loading && (
            <div
              id="spinnerWrap"
              className="flex items-center justify-center mt-3"
              aria-live="polite"
              role="status"
            >
              <svg width="32" height="32" viewBox="0 0 44 44">
                <g fill="none" fillRule="evenodd" strokeWidth="4">
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    stroke="#e5e7eb"
                    opacity="0.45"
                  />
                  <path d="M40 22a18 18 0 0 0-18-18" stroke="#0f2f4b">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 22 22"
                      to="360 22 22"
                      dur="0.75s"
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
              </svg>
            </div>
          )}

          {/* Resultado */}
          {resultText && (
            <div className={getResultadoClasses(resultVariant)}>
              {resultText}
            </div>
          )}

          {/* Nota */}
          <p className="text-xs text-gray-600 mt-4 text-center">
            <strong>Nota:</strong> Para notificaciones fuera de la ciudad de San Miguel de
            Tucumán, deberán ser realizadas mediante <strong>Cédula Judicial</strong> a
            través del <strong>Juzgado de Paz</strong> correspondiente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
