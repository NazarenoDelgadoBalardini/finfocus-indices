import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Rocket, Scale, Zap, Crown, Shield, Info } from 'lucide-react';
import { Subscription } from '@/entities/Subscription';
import { User } from '@/entities/User';

/* ============================
   TÉRMINOS INLINE FINFOCUS
   ============================ */

const FinfocusTermsInline = () => (
  <div className="space-y-3 text-xs md:text-sm text-slate-700">
    <p>
      Los presentes términos y condiciones regulan el acceso y uso de los servicios ofrecidos a través
      del sitio web <span className="font-semibold">www.finfocus.com.ar</span>. Al suscribirse a alguno de nuestros
      servicios, el usuario manifiesta entender con claridad y cumplir con lo siguiente:
    </p>

    <p className="font-semibold">1. Naturaleza del Servicio</p>
    <p>
      FINFOCUS proporciona información y análisis de mercado con fines educativos e informativos. Los
      suscriptores reciben información sobre las inversiones que FINFOCUS realiza con su propio capital,
      con el objetivo de brindar transparencia, independencia financiera y ejemplos prácticos sobre cómo invertir.
    </p>
    <p>
      Cada suscriptor tiene plena libertad sobre cómo invertir su dinero, en qué activos y cuánto decide o no invertir.
      Los planes FINFOCUS <span className="font-semibold">NO</span> ofrecen asesoramiento financiero personalizado ni
      recomendaciones específicas u obligatorias. Las inversiones mencionadas son <span className="font-semibold">SUGERENCIAS</span>
       basadas en un análisis exhaustivo y cotidiano del mercado. Cada usuario es absolutamente responsable de sus
      propias decisiones de inversión y de los riesgos asociados.
    </p>

    <p className="font-semibold">2. Riesgos de Inversión</p>
    <p>
      La inversión en mercados financieros conlleva riesgos, incluida la posibilidad de pérdida circunstancial de capital.
      Los planes FINFOCUS son proyectos a largo plazo, para invertir con constancia y paciencia. Rendimientos pasados
      no garantizan rendimientos futuros y FINFOCUS <span className="font-semibold">no garantiza ni promete rendimientos específicos</span>.
    </p>

    <p className="font-semibold">3. Renovación automática y cancelación</p>
    <p>
      Al suscribirse, el usuario acepta la renovación automática mensual de la suscripción mediante el medio de pago
      elegido. El usuario puede cancelar:
    </p>
    <ul className="list-disc pl-5 space-y-1">
      <li>
        Desde el medio de pago utilizado, siguiendo las instrucciones del proveedor del servicio de pago.
      </li>
      <li>
        Solic itándolo desde la pestaña <span className="italic">Contacto</span> con el asunto &quot;Solicitud de baja&quot;,
        incluyendo los datos de su suscripción.
      </li>
    </ul>
    <p>
      Las cancelaciones antes de la fecha de renovación evitan el cobro del siguiente período. No hay reembolsos por
      períodos ya abonados.
    </p>

    <p className="font-semibold">4. Independencia y responsabilidad del usuario</p>
    <p>
      Los usuarios administran sus propias cuentas y ejecutan sus propias operaciones. FINFOCUS brinda tutoriales,
      videos y canales de consulta, pero cada operación ejecutada por el suscriptor es de su exclusiva responsabilidad.
      FINFOCUS no tiene acceso ni control sobre las cuentas comitentes de los usuarios.
    </p>

    <p className="font-semibold">5. Transparencia y divulgación</p>
    <p>
      FINFOCUS tiene como principal valor la transparencia y busca transformar la educación financiera a través de
      acompañamiento genuino y de largo plazo, compartiendo experiencias para que cada persona pueda construir una
      fuente alternativa de ingresos a su medida.
    </p>

    <p className="font-semibold">6. Limitación de responsabilidad</p>
    <p>
      FINFOCUS no será responsable por pérdidas o daños derivados de decisiones de inversión de los usuarios ni por
      errores u omisiones que éstos pudieran cometer. Es un proyecto independiente sin vinculación contractual con las
      empresas, títulos, acciones, sociedades de bolsa o fondos comunes de inversión que eventualmente decida suscribir
      con su propio capital.
    </p>

    <p className="font-semibold">7. Propiedad intelectual</p>
    <p>
      Todo el contenido proporcionado por FINFOCUS es de su propiedad y está protegido por derechos de autor. Queda
      prohibida su reproducción, distribución o modificación sin autorización expresa.
    </p>

    <p className="font-semibold">8. Privacidad</p>
    <p>
      La información personal se trata conforme la Ley 25.326 de Protección de Datos Personales. La plataforma se
      compromete a mantener la confidencialidad de la información del usuario.
    </p>

    <p className="font-semibold">9. Modificaciones y fuerza mayor</p>
    <p>
      FINFOCUS puede modificar estos términos en cualquier momento, notificando a los usuarios. Cláusula de Fuerza
      Mayor: FINFOCUS no será responsable por retrasos o incumplimientos debidos a causas fuera de su control razonable,
      como desastres naturales, actos de guerra o disturbios civiles.
    </p>

    <p className="font-semibold">10. Marco legal nacional vigente</p>
    <p>
      En cumplimiento con la Ley 24.240 de Defensa del Consumidor, FINFOCUS se compromete a brindar información clara,
      precisa y detallada sobre sus servicios. Los usuarios pueden dar de baja su suscripción por los mismos medios por
      los que se adhirieron, sin resistencia alguna de la plataforma.
    </p>

    <p className="font-semibold">11. Aceptación</p>
    <p>
      He leído, comprendo y acepto con plena libertad y discernimiento los términos y condiciones previamente detallados.
    </p>
  </div>
);

/* ============================
   TÉRMINOS INLINE FINLEGAL
   ============================ */

const FinlegalTermsInline = () => (
  <div className="space-y-3 text-xs md:text-sm text-slate-700">
    <p>
      Estos términos regulan el acceso y uso de los servicios de FINLEGAL ofrecidos a través del sitio{" "}
      <span className="font-semibold">www.finfocus.com.ar/finlegal</span>. Al suscribirse, el usuario manifiesta
      entender y cumplir con lo siguiente:
    </p>

    <p className="font-semibold">1. Naturaleza del servicio</p>
    <p>
      FINLEGAL ofrece herramientas, calculadoras y plantillas jurídicas para agilizar y optimizar tareas de los
      usuarios. Todas tienen carácter educativo, colaborativo y de apoyo práctico, pero no constituyen asesoramiento
      legal personalizado ni reemplazan el juicio profesional del usuario. Al ser herramientas interactivas, no se
      garantiza que los resultados sean 100% precisos; se recomienda verificar con criterio profesional.
    </p>

    <p className="font-semibold">2. Ámbito de aplicación y normativa</p>
    <p>
      El acceso y uso de los servicios se realiza exclusivamente a través de{" "}
      <span className="font-semibold">www.finfocus.com.ar/finlegal</span>, basándose en normativa vigente de la
      República Argentina.
    </p>

    <p className="font-semibold">3. Función formativa y mejora de procesos</p>
    <p>
      FINLEGAL tiene un enfoque formativo, simplificador y orientado a la mejora continua de procesos jurídicos,
      promoviendo buenas prácticas profesionales y una propuesta solidaria e inclusiva que fomenta la humanización de
      la justicia mediante el intercambio y la colaboración.
    </p>

    <p className="font-semibold">4. Modelos de suscripción, becas y renovación</p>
    <p>
      FINLEGAL ofrece los planes: FINLEGAL Esencial, FINLEGAL Esencial+, FINLEGAL Total y FINLEGAL Test
      (versión gratuita de prueba por 14 días). Puede otorgar becas parciales o totales según necesidad o contribución
      al proyecto, previa evaluación interna.
    </p>
    <p>
      Al suscribirse, el usuario acepta la renovación automática mensual mediante el medio de pago elegido. Puede
      cancelar desde el medio de pago o solicitándolo desde la pestaña <span className="italic">Contacto</span> con el
      asunto &quot;Solicitud de baja&quot; y los datos de su suscripción. No se realizan reembolsos por períodos ya abonados.
    </p>

    <p className="font-semibold">5. Responsabilidad del usuario</p>
    <p>
      Cada usuario es responsable de la interpretación y aplicación de los resultados y formatos entregados. FINLEGAL
      no asume responsabilidad por decisiones profesionales ni por resultados de procedimientos basados en las
      herramientas. Las herramientas se actualizan permanentemente y el usuario debe asegurarse de usar la versión
      vigente. La plataforma no almacena datos ingresados en las aplicaciones, garantizando la confidencialidad.
      El uso y destino de las herramientas es de exclusiva responsabilidad del usuario.
    </p>

    <p className="font-semibold">6. Ética y cumplimiento</p>
    <p>
      Los usuarios se comprometen a usar FINLEGAL conforme a las normativas del Poder Judicial y de los Colegios
      profesionales de su jurisdicción. Cualquier uso que vulnere la confidencialidad de expedientes o fundamentos
      judiciales puede implicar la suspensión inmediata del servicio. Está prohibido el uso para actividades ilícitas,
      automatización masiva indebida o extracción sistemática de datos.
    </p>

    <p className="font-semibold">7. Desarrollo de soluciones a medida</p>
    <p>
      FINLEGAL puede desarrollar herramientas jurídicas a medida para estudios u oficinas, regidas por contratos
      específicos que definen alcance, plazos, honorarios y confidencialidad.
    </p>

    <p className="font-semibold">8. Propiedad intelectual y uso de suscripción</p>
    <p>
      Todo el contenido (códigos, diseños, manuales, plantillas, colores) es propiedad de FINFOCUS y está protegido por
      derechos de autor. La suscripción es personal e intransferible; cualquier irregularidad puede implicar la baja
      unilateral para proteger a la comunidad.
    </p>

    <p className="font-semibold">9. Licenciamiento y fuentes de datos</p>
    <p>
      Las calculadoras y plantillas se nutren de fuentes oficiales y públicas (INDEC, MTEySS, etc.). FINLEGAL no
      garantiza la inmediatez en la actualización de índices de terceros; los valores se ofrecen &quot;tal cual&quot;
      están disponibles en su origen. Todo aporte o código que el usuario comparta puede incorporarse a la plataforma
      para su mejora colaborativa.
    </p>

    <p className="font-semibold">10. Privacidad y tratamiento de datos</p>
    <p>
      La recolección y uso de datos personales se realiza conforme Ley 25.326. FINLEGAL adopta medidas razonables de
      seguridad, puede usar cookies para mejorar la experiencia y fines estadísticos, y el usuario puede configurar su
      navegador para restringirlas.
    </p>

    <p className="font-semibold">11. Disponibilidad y soporte</p>
    <p>
      FINLEGAL procura un nivel de servicio óptimo, pero puede haber interrupciones por mantenimiento o causas ajenas,
      priorizando siempre la <span className="font-semibold">TRANSPARENCIA</span> en la comunicación con los usuarios.
    </p>

    <p className="font-semibold">12. Modificaciones a los términos</p>
    <p>
      FINLEGAL puede modificar estos términos, publicando las actualizaciones en el sitio y notificando a los usuarios
      suscriptos.
    </p>

    <p className="font-semibold">13. Ley aplicable y jurisdicción</p>
    <p>
      Estos términos se rigen por la legislación sustantiva argentina. Las partes se someten a los tribunales competentes
      de la provincia de Tucumán.
    </p>

    <p className="font-semibold">Aceptación</p>
    <p>
      Al utilizar <span className="font-semibold">www.finfocus.com.ar/finlegal</span> y/o suscribirte a cualquiera de
      nuestros servicios, confirmás que leíste, comprendés y aceptás estos Términos y Condiciones en su integridad.
      FINLEGAL agradece tu confianza y compromiso con la mejora continua de la práctica jurídica.
    </p>
  </div>
);

export default function Planes() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual' | 'combo'
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);

  // 🧩 NUEVO: plan seleccionado y modal de T&C
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Cargar usuario actual (igual que en Layout)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await User.me();
        if (me?.id) {
          setUser(me);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error cargando usuario en Planes:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // =====================
  // PLANES FINFOCUS
  // =====================
  const finFocusPlans = [
    {
      id: 'finfocus-start-monthly',
      name: 'FINFOCUS START',
      description: 'Un proyecto pensado para perfiles conservadores en pesos',
      price: 4.99,
      currency: 'USD',
      cycle: 'monthly',
      type: 'FINFOCUS',
      role: 'FINFOCUS_START',
      icon: Rocket,
      features: [
        'Sugerencia de inversión mensual',
        'Comunidad Whatsapp',
        'Flujo de fondos online',
        'Curva de rendimiento $',
        'Calculadora de LECAPS',
        'Videos explicativos',
        'Libros',
      ],
      mpPlanId: '2c93808496a524800196a5d69d70003a', // START mensual
    },
    {
      id: 'finfocus-start-annual',
      name: 'FINFOCUS START',
      description: 'Un proyecto pensado para perfiles conservadores en pesos',
      price: 49.99,
      currency: 'USD',
      cycle: 'annual',
      type: 'FINFOCUS',
      role: 'FINFOCUS_START',
      icon: Rocket,
      features: [
        'Sugerencia de inversión mensual',
        'Comunidad Whatsapp',
        'Flujo de fondos online',
        'Curva de rendimiento $',
        'Calculadora de LECAPS',
        'Videos explicativos',
        'Libros',
      ],
      mpPlanId: '2c93808496a5246f0196a5d8643a0047', // START anual
    },
    {
      id: 'finfocus-monthly',
      name: 'FINFOCUS',
      description: 'Un proyecto pensado para perfiles moderados en USD',
      price: 4.99,
      currency: 'USD',
      cycle: 'monthly',
      type: 'FINFOCUS',
      role: 'FINFOCUS',
      icon: Zap,
      features: [
        'Sugerencia de inversión mensual',
        'Comunidad Whatsapp',
        'Flujo de fondos online',
        'Curva de rendimiento $ y USD',
        'Calculadora de LECAPS',
        'Videos explicativos',
        'Informes FINFOCUS',
        'Informes calificadoras de riesgo',
        'Libros',
      ],
      mpPlanId: '2c938084955cc4800195a143f9a31ebb', // FINFOCUS mensual
    },
    {
      id: 'finfocus-annual',
      name: 'FINFOCUS',
      description: 'Un proyecto pensado para perfiles moderados en USD',
      price: 49.99,
      currency: 'USD',
      cycle: 'annual',
      type: 'FINFOCUS',
      role: 'FINFOCUS',
      icon: Zap,
      features: [
        'Sugerencia de inversión mensual',
        'Comunidad Whatsapp',
        'Flujo de fondos online',
        'Curva de rendimiento $ y USD',
        'Calculadora de LECAPS',
        'Videos explicativos',
        'Informes FINFOCUS',
        'Informes calificadoras de riesgo',
        'Libros',
      ],
      mpPlanId: '2c938084955cc4800195a145096d1ebc', // FINFOCUS anual
    },
    {
      id: 'finfocus-plus-monthly',
      name: 'FINFOCUS+',
      description: 'Un proyecto pensado para perfiles agresivos en USD',
      price: 9.99,
      currency: 'USD',
      cycle: 'monthly',
      type: 'FINFOCUS',
      role: 'FINFOCUS_PLUS',
      icon: Crown,
      features: [
        'Sugerencia de inversión mensual',
        'Comunidad Whatsapp',
        'Flujo de fondos online',
        'Curva de rendimiento $ y USD',
        'Calculadora de LECAPS',
        'Videos explicativos',
        'Informes FINFOCUS',
        'Informes calificadoras de riesgo',
        'Libros',
      ],
      mpPlanId: '2c9380849564460a0195a145e3bd1ae3', // FINFOCUS+ mensual
    },
    {
      id: 'finfocus-plus-annual',
      name: 'FINFOCUS+',
      description: 'Un proyecto pensado para perfiles agresivos en USD',
      price: 99.99,
      currency: 'USD',
      cycle: 'annual',
      type: 'FINFOCUS',
      role: 'FINFOCUS_PLUS',
      icon: Crown,
      features: [
        'Sugerencia de inversión mensual',
        'Comunidad Whatsapp',
        'Flujo de fondos online',
        'Curva de rendimiento $ y USD',
        'Calculadora de LECAPS',
        'Videos explicativos',
        'Informes FINFOCUS',
        'Informes calificadoras de riesgo',
        'Libros',
      ],
      mpPlanId: 'f12a090820d54f7da708b5e6103d7d06', // FINFOCUS+ anual
    },
    {
      id: 'finfocus-combo',
      name: 'FINFOCUS START + FINFOCUS',
      description: 'Combiná proyectos y diversificá',
      price: 7.49,
      currency: 'USD',
      cycle: 'combo',
      type: 'COMBO',
      role: 'FINFOCUS_PLATINO',
      icon: Zap,
      features: [
        'Acceso a FINFOCUS START',
        'Acceso a FINFOCUS',
        'Descuento por combinar',
      ],
      mpPlanId: '2c93808496d4b6670196d5fa1e5c00b1', // START + FOCUS
    },
    {
      id: 'finfocus-combo-plus',
      name: 'FINFOCUS START + FINFOCUS+',
      description: 'Combiná proyectos y diversificá',
      price: 12.49,
      currency: 'USD',
      cycle: 'combo',
      type: 'COMBO',
      role: 'FINFOCUS_ADVANCED',
      icon: Crown,
      features: [
        'Acceso a FINFOCUS START',
        'Acceso a FINFOCUS+',
        'Descuento por combinar',
      ],
      mpPlanId: '2c93808496ce9c1b0196d5fd21b0036d', // START + PLUS
    },
  ];

  // =====================
  // PLANES FINLEGAL
  // =====================
  const finLegalPlans = [
    {
      id: 'finlegal-esencial-monthly',
      name: 'FINLEGAL ESENCIAL',
      description: 'Herramientas legales básicas',
      price: 2999.99,
      currency: 'ARS',
      cycle: 'monthly',
      type: 'FINLEGAL',
      role: 'FINLEGAL_ESENCIAL',
      icon: Scale,
      features: [
        'Calculadoras legales',
        'Soporte técnico',
      ],
      mpPlanId: '2c938084965e44a001966aa7c51b0626', // mensual
    },
    {
      id: 'finlegal-esencial-annual',
      name: 'FINLEGAL ESENCIAL',
      description: 'Herramientas legales básicas anual',
      price: 28799.99,
      currency: 'ARS',
      cycle: 'annual',
      type: 'FINLEGAL',
      role: 'FINLEGAL_ESENCIAL',
      icon: Scale,
      features: [
        'Calculadoras legales',
        'Soporte técnico',
      ],
      mpPlanId: '2c93808497f5fac301980f9ba68d09bc', // anual
    },
    {
      id: 'finlegal-plus-monthly',
      name: 'FINLEGAL ESENCIAL+',
      description: 'Herramientas legales avanzadas',
      price: 7999.99,
      currency: 'ARS',
      cycle: 'monthly',
      type: 'FINLEGAL',
      role: 'FINLEGAL_PLUS',
      icon: Shield,
      features: [
        '+Calculadoras legales',
        'Soporte técnico',
      ],
      mpPlanId: '2c9380849817d4bc0198194c812a0072', // mensual
    },
    {
      id: 'finlegal-plus-annual',
      name: 'FINLEGAL ESENCIAL+',
      description: 'Herramientas legales avanzadas anual',
      price: 76799.99,
      currency: 'ARS',
      cycle: 'annual',
      type: 'FINLEGAL',
      role: 'FINLEGAL_PLUS',
      icon: Shield,
      features: [
        '+Calculadoras legales',
        'Soporte técnico',
      ],
      mpPlanId: '2c9380849817d4a20198194d62de007f', // anual
    },
    {
      id: 'finlegal-total-monthly',
      name: 'FINLEGAL TOTAL',
      description: 'Acceso completo',
      price: 12499.99,
      currency: 'ARS',
      cycle: 'monthly',
      type: 'FINLEGAL',
      role: 'FINLEGAL_TOTAL',
      icon: Crown,
      features: [
        'Todas las herramientas',
        'Calendario privado',
        'Evento del día',
        'Soporte técnico',
      ],
      mpPlanId: '2c9380849817d4a30198194e9c1f0076', // mensual
    },
    {
      id: 'finlegal-total-annual',
      name: 'FINLEGAL TOTAL',
      description: 'Acceso completo anual',
      price: 119999.99,
      currency: 'ARS',
      cycle: 'annual',
      type: 'FINLEGAL',
      role: 'FINLEGAL_TOTAL',
      icon: Crown,
      features: [
        'Todas las herramientas',
        'Calendario privado',
        'Evento del día',
        'Soporte técnico',
      ],
      mpPlanId: '2c9380849817d4a30198194de85a0074', // anual
    },
  ];

  // Filtra planes según ciclo seleccionado
  const getPlansForCurrentCycle = (plans) => {
    if (billingCycle === 'monthly') return plans.filter((p) => p.cycle === 'monthly');
    if (billingCycle === 'annual') return plans.filter((p) => p.cycle === 'annual');
    if (billingCycle === 'combo') return plans.filter((p) => p.cycle === 'combo');
    return plans;
  };

  // 🔥 Redirección al plan de suscripción recurrente
  const redirectToMercadoPago = async (plan) => {
    try {
      if (!user || !user.id) {
        alert('Debes iniciar sesión para suscribirte');
        return;
      }

      if (!plan.mpPlanId) {
        alert('Este plan no tiene configurado su ID de suscripción en Mercado Pago.');
        return;
      }

      setProcessingPlan(plan.id);

      const url = `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${plan.mpPlanId}&external_reference=${user.email}`;
      window.location.href = url;
    } catch (error) {
      console.error('Error al iniciar suscripción:', error);
      alert('Ocurrió un error al iniciar la suscripción. Intentá de nuevo.');
      setProcessingPlan(null);
    }
  };

// 🧩 NUEVO: cuando se hace click en "Suscribirse"
const handleSubscribeClick = (plan) => {
  if (!user || !user.id) {
    alert('Debes iniciar sesión para suscribirte');
    return;
  }

  setSelectedPlan(plan);
  setShowTermsModal(true);
};

// 🧩 NUEVO: aceptar T&C en el modal → redirigir a MP
const handleConfirmTerms = () => {
  if (!selectedPlan) return;
  redirectToMercadoPago(selectedPlan);
};

const handleCloseTerms = () => {
  setShowTermsModal(false);
  setSelectedPlan(null);
};

const PlanCard = ({ plan, bgColor, textColor, onSubscribe }) => {
  const Icon = plan.icon;
  const isProcessing = processingPlan === plan.id;

  return (
    <Card
      className={`
        ${bgColor}
        border-2 border-transparent hover:border-[#5EA6D7]
        transition-all duration-300 hover:shadow-xl
        flex flex-col
      `}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-8 w-8 ${textColor}`} />
          {plan.cycle === 'annual' && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              AHORRA 2 MESES
            </span>
          )}
        </div>
        <CardTitle className={`${textColor} text-2xl`}>{plan.name}</CardTitle>
        <CardDescription className={`${textColor}/70`}>
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-1">
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${textColor}`}>
              {plan.type === 'FINLEGAL' ? '$ ' : ''}
              {plan.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            <span className={`${textColor}/70 text-sm`}>
              {plan.currency} / {plan.cycle === 'monthly' ? 'mes' : plan.cycle === 'annual' ? 'año' : 'mes'}
            </span>
          </div>
        </div>

        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className={`${textColor}/80 text-sm`}>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={() => onSubscribe(plan)} // 🧩 AQUÍ
          disabled={isProcessing || loading}
          className={`
            w-full mt-auto font-semibold 
            ${bgColor.includes('white')
              ? 'bg-[#0f2f4b] text-white hover:bg-[#0f2f4b]/90'
              : 'bg-white text-[#0f2f4b] hover:bg-gray-100'}
          `}
        >
          {isProcessing ? 'Redirigiendo…' : 'Suscribirse'}
        </Button>
      </CardContent>
    </Card>
  );
};

  const visibleFinFocusPlans = getPlansForCurrentCycle(finFocusPlans);
  const visibleFinLegalPlans = getPlansForCurrentCycle(finLegalPlans);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* HERO */}
        <div className="bg-gradient-to-r from-[#0f2f4b] via-[#1a4f72] to-[#0f2f4b] rounded-3xl p-8 md:p-10 text-white mb-10 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Planes de suscripción FINFOCUS &amp; FINLEGAL
              </h1>
              <p className="text-sm md:text-base text-blue-100 max-w-xl">
                Elegí el plan que mejor se adapte a tu forma de trabajar.
                FINFOCUS para el análisis financiero e inveresiones y FINLEGAL para herramientas integrales para tus juicios.
              </p>
              {user ? (
                <p className="mt-3 text-xs md:text-sm text-blue-100 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Suscribiendo con el usuario:{' '}
                  <span className="font-semibold">
                    {user.fullName || user.email}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-xs md:text-sm text-yellow-100 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Debes iniciar sesión para completar la suscripción.
                </p>
              )}
            </div>

            {/* Selector de ciclo */}
            <div className="bg-white/10 rounded-2xl p-3 flex flex-col items-center">
              <span className="text-xs uppercase tracking-wide text-blue-100 mb-2">
                Ciclo de facturación
              </span>
              <div className="flex rounded-xl bg-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1 text-xs md:text-sm rounded-lg ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-[#0f2f4b] font-semibold'
                      : 'text-blue-100'
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-3 py-1 text-xs md:text-sm rounded-lg ${
                    billingCycle === 'annual'
                      ? 'bg-white text-[#0f2f4b] font-semibold'
                      : 'text-blue-100'
                  }`}
                >
                  Anual
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('combo')}
                  className={`px-3 py-1 text-xs md:text-sm rounded-lg ${
                    billingCycle === 'combo'
                      ? 'bg-white text-[#0f2f4b] font-semibold'
                      : 'text-blue-100'
                  }`}
                >
                  Combos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Aviso si no está logueado */}
        {!loading && !user && (
          <Alert className="mb-6 border-yellow-300 bg-yellow-50">
            <AlertDescription>
              Iniciá sesión para poder confirmar tu suscripción después de elegir un plan.
            </AlertDescription>
          </Alert>
        )}

{/* Planes FINFOCUS */}
<section className="mb-10">
  <h2 className="text-xl md:text-2xl font-semibold mb-4 text-slate-800">
    Planes FINFOCUS
  </h2>
  {visibleFinFocusPlans.length === 0 ? (
    <p className="text-sm text-slate-600">
      No hay planes disponibles para el ciclo seleccionado.
    </p>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {visibleFinFocusPlans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          bgColor="bg-[#0f2f4b]"
          textColor="text-white"
          onSubscribe={handleSubscribeClick} // 🧩
        />
      ))}
    </div>
  )}
</section>

{/* Planes FINLEGAL */}
<section className="mb-10">
  <h2 className="text-xl md:text-2xl font-semibold mb-4 text-slate-800">
    Planes FINLEGAL
  </h2>
  {visibleFinLegalPlans.length === 0 ? (
    <p className="text-sm text-slate-600">
      No hay planes disponibles para el ciclo seleccionado.
    </p>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {visibleFinLegalPlans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          bgColor="bg-white"
          textColor="text-[#0f2f4b]"
          onSubscribe={handleSubscribeClick} // 🧩
        />
      ))}
    </div>
  )}
</section>

        {/* Footer info */}
        <div className="mt-12 text-center text-xs md:text-sm text-slate-500">
          <p className="mb-2">
            ¿Tienes preguntas? Podés escribirnos para ayudarte a elegir el plan que mejor
            se adapte a tu estudio o proyecto.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <span>✓ Cancelás cuando quieras</span>
            <span>✓ Soporte incluido</span>
            <span>✓ Actualizaciones permanentes</span>
          </div>
        </div>

{showTermsModal && selectedPlan && (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-2xl p-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-1">
          <Info className="h-5 w-5 text-[#0f2f4b]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Términos y condiciones
          </h3>
          <p className="text-sm text-slate-600">
            Estás por suscribirte al plan{" "}
            <span className="font-semibold">{selectedPlan.name}</span>. Leé los
            términos y condiciones antes de continuar.
          </p>
        </div>
      </div>

      {/* Recuadro scrollable con los términos completos */}
      <div className="mt-2 max-h-80 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
        {selectedPlan.type === "FINLEGAL" ? (
          <FinlegalTermsInline />
        ) : (
          <FinfocusTermsInline />
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleCloseTerms}
          className="border-slate-300"
        >
          Cancelar
        </Button>

        <Button
          onClick={handleConfirmTerms}
          disabled={processingPlan === selectedPlan.id}
          className="bg-[#0f2f4b] text-white hover:bg-[#0f2f4b]/90"
        >
          {processingPlan === selectedPlan.id
            ? "Redirigiendo…"
            : "Acepto y continuar al pago"}
        </Button>
      </div>
    </div>
  </div>
)}


      </div>
    </div>
  );
}