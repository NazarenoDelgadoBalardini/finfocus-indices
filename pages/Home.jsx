import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import {
  LineChart,
  Gavel,
  FolderKanban,
  HeartHandshake,
  LogIn,
  Search,
  Shield,
  Brain,
  DollarSign,
  CheckCircle,
  Target,
  Users,
  HelpCircle,
  UserCircle,
  Wallet,
  ClipboardCheck,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { motion } from 'framer-motion';

const AZUL = '#0f2f4b';
const CELESTE = '#5EA6D7';

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const FaqSection = () => (
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.32 }}
    className="space-y-10"
  >
    {/* HERO FAQ */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-4">
        <HelpCircle className="h-16 w-16 mx-auto" style={{ color: AZUL }} />
        <CardTitle
          className="text-3xl md:text-4xl font-bold"
          style={{ color: AZUL }}
        >
          Preguntas frecuentes
        </CardTitle>
      </CardHeader>
    </Card>

    {/* ¿Quiénes somos? */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <UserCircle className="h-14 w-14 mx-auto" style={{ color: AZUL }} />
        <CardTitle className="text-2xl md:text-3xl font-bold" style={{ color: AZUL }}>
          ¿Quiénes somos?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-3xl mx-auto text-gray-700 text-lg md:text-xl leading-relaxed text-center">
          Para conocernos mejor, puedes ingresar a la sección de contacto, una vez registrado.
        </p>
      </CardContent>
    </Card>

    {/* ¿En qué consiste el proyecto FINFOCUS? */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <LineChart className="h-14 w-14 mx-auto" style={{ color: AZUL }} />
        <CardTitle className="text-2xl md:text-3xl font-bold" style={{ color: AZUL }}>
          ¿En qué consiste el proyecto FINFOCUS?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-4xl mx-auto text-gray-700 text-lg md:text-xl leading-relaxed space-y-4 text-left md:text-center">
          <p>
            Desde nuestro canal de difusión, compartiremos la sugerencia de inversión
            (de acuerdo a la comunidad que te hayas sumado) que realizaremos cada mes,
            por 100 USD (o su equivalente en pesos).
          </p>
          <p>
            <strong>¡Sí, nosotros también participamos en el proyecto!</strong>
          </p>
          <p>
            Aquel que desee invertir más, por ej. 200 USD, compraría el doble de activos,
            obteniendo el doble de rendimiento en términos nominales, pero el mismo en términos relativos.
            Si uno invierte 50 USD por mes, obtendrá la mitad en términos nominales.
          </p>
          <p>
            Es importante aclarar que cada persona tendrá su propia cuenta, donde cada individuo
            administrará los fondos y/o valores negociables, decidiendo o no seguir nuestra
            sugerencia de inversión.
          </p>
        </div>
      </CardContent>
    </Card>

    {/* ¿Se requiere capital inicial? */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <Wallet className="h-14 w-14 mx-auto" style={{ color: AZUL }} />
        <CardTitle className="text-2xl md:text-3xl font-bold" style={{ color: AZUL }}>
          ¿Se requiere un capital inicial?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-4xl mx-auto text-gray-700 text-lg md:text-xl leading-relaxed space-y-4 text-left md:text-center">
          <p>
            No necesitas capital inicial. El proyecto está pensado, a largo plazo,
            para que puedas aportar lo que desees mes a mes. ¡Tenemos un largo camino juntos por delante!
          </p>
          <p>
            De todos modos, si tenés un capital inicial que desees invertir y obtener rendimientos,
            ¡también podés hacerlo! Luego continuarás con los aportes mensuales a la medida de tus posibilidades.
          </p>
        </div>
      </CardContent>
    </Card>

    {/* No sé cómo cargar la orden */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <ClipboardCheck className="h-14 w-14 mx-auto" style={{ color: AZUL }} />
        <CardTitle className="text-2xl md:text-3xl font-bold" style={{ color: AZUL }}>
          No sé cómo cargar la orden de compra/venta, ¿cómo aprendo?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-4xl mx-auto text-gray-700 text-lg md:text-xl leading-relaxed space-y-4 text-left md:text-center">
          <p>
            La carga de las órdenes se mostrará a través de un video explicativo
            al que tienen acceso sólo los suscriptores. Aprenderlo es una inversión
            de 5 minutos y hacerlo mensualmente no toma más de 1 minuto.
          </p>
          <p>
            Conoce los planes de suscripción en la sección de <strong>Planes</strong>.
          </p>
        </div>
      </CardContent>
    </Card>

    {/* ¿Qué necesito para invertir? */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <Wallet className="h-14 w-14 mx-auto" style={{ color: AZUL }} />
        <CardTitle className="text-2xl md:text-3xl font-bold" style={{ color: AZUL }}>
          ¿Qué necesito para invertir?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-4xl mx-auto text-gray-700 text-lg md:text-xl leading-relaxed space-y-4 text-left md:text-center">
          <p>
            Tener una <strong>CUENTA COMITENTE</strong>. Así como tenemos una cuenta de email
            para administrar nuestro correo, una cuenta comitente nos permite administrar
            nuestros valores negociables (acciones, bonos, obligaciones negociables, CEDEARs, etc.).
          </p>
          <p>
            Cada persona abrirá su propia cuenta en Balanz (nuestro ALyC) a través de este enlace:{' '}
            <a
              href="https://balanz.com/abrir-cuenta-2.aspx?reference=nazarenodelgado@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              balanz.com/abrir-cuenta
            </a>.
          </p>
          <p>
            El proceso de apertura es simple, intuitivo y por celular. Te vamos a guiar en todo el proceso.
          </p>
          <p>
            Si bien podrías operar desde cualquier broker, te aconsejamos Balanz porque todos nuestros
            videos y tutoriales serán desde esa plataforma. Además, allí contarás con nosotros mismos
            como tus asesores.
          </p>
        </div>
      </CardContent>
    </Card>

    {/* …podés seguir agregando el resto de preguntas igual que estas… */}
  </motion.section>
);

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState('finfo'); // FINFOCUS por defecto

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await User.me();
      if (userData?.id) {
        window.location.href = createPageUrl('Dashboard');
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: LineChart,
      title: 'FINFOCUS',
      description: 'Herramientas financieras avanzadas y actualizadas.',
    },
    {
      icon: Gavel,
      title: 'FINLEGAL',
      description: 'Cálculos legales precisos y automatizados.',
    },
    {
      icon: FolderKanban,
      title: 'Gestión de Casos',
      description: 'Administra tus juicios de forma integral.',
    },
    {
      icon: HeartHandshake,
      title: 'Comunidad',
      description: 'Acompañamiento y soporte constante.',
    },
  ];

  const benefits = [
    'Cálculos financieros y legales automatizados',
    'Actualización diaria de índices oficiales',
    'Gestión completa de juicios',
    'Calendario integrado con plazos judiciales',
    'Resultados exportables y guardados en la plataforma',
    'Soporte técnico especializado',
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* HERO FINFOCUS */}
      <div
        className="w-full py-20 px-4"
        style={{
          background: `linear-gradient(135deg, ${AZUL} 0%, #0b253a 60%, #081a28 100%)`,
        }}
      >
        <div className="max-w-6xl mx-auto text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            FINFOCUS
          </h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            La plataforma integral para profesionales legales y asesoramiento en inversiones.
            Cálculos avanzados, gestión de casos y resultados precisos.
          </p>

          <Button
            onClick={() => (window.location.href = '/login')}
            size="lg"
            className="mt-10 px-10 py-6 text-xl rounded-2xl shadow-md font-semibold inline-flex items-center justify-center"
style={{
  background: "white",
  color: AZUL,
}}
          >
            <LogIn className="mr-2 h-6 w-6" />
            Acceder
          </Button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-6xl mx-auto px-4 pb-16 flex-1 w-full text-center">
        {/* BLOQUE: Ejes de la plataforma (siempre arriba de los tabs) */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-10"
        >
          <Card className="rounded-2xl shadow-xl border border-gray-100 mb-8">
            <CardHeader className="text-center">
              <CardTitle
                className="text-3xl md:text-4xl font-bold"
                style={{ color: AZUL }}
              >
                Ejes de la plataforma
              </CardTitle>
              <CardDescription className="text-lg">
                Finanzas, derecho y gestión de casos en un mismo ecosistema.
              </CardDescription>
            </CardHeader>
<CardContent>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 justify-items-center">
    {features.map((f, i) => {
      const Icon = f.icon;
      return (
        <div
          key={i}
          className="flex flex-col items-center text-center px-4 py-4"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: '#e8f2fb' }}
          >
            <Icon className="h-8 w-8" style={{ color: AZUL }} />
          </div>
          <h3
            className="mt-4 text-xl font-semibold"
            style={{ color: AZUL }}
          >
            {f.title}
          </h3>
          <p className="mt-2 text-lg text-gray-700">
            {f.description}
          </p>
        </div>
      );
    })}
  </div>
</CardContent>
          </Card>
        </motion.section>

{/* TABS GLOBALES */}
<Tabs value={tabValue} onValueChange={setTabValue} className="w-full">

  <div className="sticky top-0 z-20 bg-white px-0 py-0 -mx-4 mb-8">
    <TabsList
      className="
        w-full
        grid grid-cols-2
        gap-0
        rounded-none
        p-0
        m-0
        bg-white
        border-none
        shadow-none
      "
    >
      <TabsTrigger
        value="finfo"
        className="
          text-xl md:text-2xl font-semibold
          py-6
          w-full
          rounded-none
          transition-all

          data-[state=active]:bg-[#0f2f4b]
          data-[state=active]:text-white
          data-[state=active]:shadow-md

          data-[state=inactive]:bg-gradient-to-br
          data-[state=inactive]:from-[#eaf1f7]
          data-[state=inactive]:to-white
          data-[state=inactive]:text-[#0f2f4b]
          data-[state=inactive]:opacity-90
          data-[state=inactive]:hover:opacity-100
        "
      >
        FINFOCUS
      </TabsTrigger>

      <TabsTrigger
        value="finlegal"
        className="
          text-xl md:text-2xl font-semibold
          py-6
          w-full
          rounded-none
          transition-all

          data-[state=active]:bg-[#0f2f4b]
          data-[state=active]:text-white
          data-[state=active]:shadow-md

          data-[state=inactive]:bg-gradient-to-br
          data-[state=inactive]:from-[#eaf1f7]
          data-[state=inactive]:to-white
          data-[state=inactive]:text-[#0f2f4b]
          data-[state=inactive]:opacity-90
          data-[state=inactive]:hover:opacity-100
        "
      >
        FINLEGAL
      </TabsTrigger>
    </TabsList>
  </div>

          <div className="mt-10 space-y-10">
            {/* TAB FINFOCUS */}
<TabsContent value="finfo" className="space-y-10">
  {/* MISIÓN DEL PROYECTO */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5 }}
    className="mt-20 md:mt-20"
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center">
        <CardTitle
          className="text-3xl md:text-4xl font-bold"
          style={{ color: AZUL }}
        >
          MISIÓN DEL PROYECTO
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-3xl mx-auto text-gray-700 leading-relaxed text-lg md:text-xl">
          <p>
            Transformar la educación financiera, ofreciéndote un
            acompañamiento y asesoramiento transparente y a largo
            plazo, para que puedas construir una fuente alternativa
            de ingresos, a tu propia medida.
          </p>
        </div>
      </CardContent>
    </Card>
  </motion.section>

  {/* NUESTROS VALORES */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.05 }}
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center">
        <CardTitle
          className="text-3xl md:text-4xl font-bold"
          style={{ color: AZUL }}
        >
          NUESTROS VALORES
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-3xl mx-auto text-gray-700 text-lg md:text-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-items-center">
            <div className="flex items-center gap-3">
              <Search className="h-7 w-7" style={{ color: AZUL }} />
              <span>Transparencia</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-7 w-7" style={{ color: AZUL }} />
              <span>Seguridad</span>
            </div>
            <div className="flex items-center gap-3">
              <Brain className="h-7 w-7" style={{ color: AZUL }} />
              <span>Capacitación</span>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-7 w-7" style={{ color: AZUL }} />
              <span>Libertad financiera</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.section>

  {/* ¿QUÉ HACEMOS? */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.1 }}
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center">
        <CardTitle
          className="text-3xl md:text-4xl font-bold"
          style={{ color: AZUL }}
        >
          ¿QUÉ HACEMOS?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-4xl mx-auto space-y-8 text-gray-700 text-lg md:text-xl">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <img
              src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765305284828-e67740da/que_hacemos.png"
              alt="¿Qué hacemos en FINFOCUS?"
              className="w-full max-w-xs md:max-w-sm"
            />
            <p className="leading-relaxed text-center md:text-center">
              Además de brindar asesoramiento personalizado en inversiones,
              creamos los proyectos <strong>FINFOCUS</strong>, para que puedas
              animarte a dar tus primeros pasos en el mundo de las inversiones,
              en forma segura, confiable y transparente.
            </p>
          </div>

          <div className="space-y-3 text-left md:text-center">
            <p>
              En los planes <strong>FINFOCUS</strong>, todos los meses
              invertimos nuestro capital.
            </p>
            <p>
              <strong>¡Sí, también participamos!</strong> Vamos a
              compartirte cada decisión y te mostraremos cómo, para que
              puedas replicarlo.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.section>

  {/* COMUNIDAD FINFOCUS 🚀 */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.15 }}
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <img
            src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765305284817-97d9a137/comunidad.png"
            alt="Comunidad FINFOCUS"
            className="w-40 md:w-52 rounded-2xl"
          />
        </div>
        <CardTitle
          className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-2"
          style={{ color: AZUL }}
        >
          COMUNIDAD FINFOCUS <span>🚀</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-3xl mx-auto space-y-6 text-gray-700 leading-relaxed text-lg md:text-xl">
          <p className="text-left md:text-center">
            A través de nuestra comunidad de Whatsapp, compartiremos todos
            los meses la sugerencia de inversión por <strong>100 USD</strong>{' '}
            (o su equivalente en pesos).
          </p>

          <div>
            <p className="font-semibold mb-3 text-left md:text-center">
              Al suscribirte, tendrás acceso a:
            </p>
            <div className="space-y-2">
              {[
                'Comunidad de Whatsapp',
                'Información financiera de las compañías',
                'Videos explicativos',
                '¡Y mucho más!',
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 justify-start md:justify-center"
                >
                  <CheckCircle
                    className="h-6 w-6 mt-1 shrink-0"
                    style={{ color: AZUL }}
                  />
                  <span className="text-base md:text-lg text-left">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.section>

  {/* ¿POR QUÉ LO HACEMOS? – TÍTULO + IMAGEN */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.18 }}
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <CardTitle
          className="text-3xl md:text-4xl font-bold"
          style={{ color: AZUL }}
        >
          ¿POR QUÉ LO HACEMOS?
        </CardTitle>
        <p className="text-lg md:text-xl text-gray-600">
          La diferencia de un pequeño esfuerzo en forma consistente.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <img
            src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765305284810-00fcbc98/por_que_lo_hacemos.png"
            alt="Por qué lo hacemos"
            className="w-full max-w-3xl mx-auto"
          />
        </div>
      </CardContent>
    </Card>
  </motion.section>

  {/* BLOQUE: SABÍAS QUE... */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.2 }}
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardContent>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 text-gray-700 text-lg md:text-xl leading-relaxed">
          <div className="flex-1 space-y-3 text-center">
            <p>
              Si tu sueldo de bolsillo es de <strong>1.500 USD</strong>,
              entre vos y tu empleador aportaron al sistema previsional{' '}
              <strong>450 USD</strong> por mes.
            </p>
            <p>
              Luego de 30 años de aportes, tu jubilación (en el mejor de los
              casos) rondará los <strong>450 USD</strong>.
            </p>
            <p className="font-semibold">
              O sea, LO MISMO <span role="img" aria-label="corazón roto">💔</span>
            </p>
          </div>
          <div className="flex-shrink-0">
            <img
              src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765305831420-006887cd/sabias_que.png"
              alt="¿Sabías que?"
              className="w-full max-w-xs md:max-w-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.section>

  {/* BLOQUE: NO TODO ESTÁ PERDIDO */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.22 }}
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardContent>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 text-gray-700 text-lg md:text-xl leading-relaxed">
          <div className="flex-shrink-0 order-2 md:order-1">
            <img
              src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765305950192-740a1f75/no_todo_esta_perdido.png"
              alt="No todo está perdido"
              className="w-full max-w-xs md:max-w-sm"
            />
          </div>
          <div className="flex-1 space-y-3 text-left order-1 md:order-2">
            <p>
              Invirtiendo <strong>100 dólares</strong> todos los meses,
              durante <strong>30 años</strong>, a un rendimiento anual del{' '}
              <strong>8%</strong>, alcanzaríamos la suma de{' '}
              <strong>150.000 USD</strong>.
            </p>
            <p>
              Si lográramos mejorar ese rendimiento al{' '}
              <strong>10% anual</strong>, la cifra se elevaría a{' '}
              <strong>230.000 USD</strong>.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.section>

  {/* BLOQUE: LOGRANDO UN INGRESO EXTRA */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.24 }}
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardContent>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 text-gray-700 text-lg md:text-xl leading-relaxed">
          <div className="flex-1 space-y-3 text-center">
            <p>
              Un capital de <strong>150.000 USD</strong> nos permitirá
              generar una renta mensual promedio de{' '}
              <strong>1.000 USD</strong>.
            </p>
            <p>
              <strong>¡Invertimos 4 veces menos (100 USD) para obtener 2 veces más (1.000 USD)!</strong>
            </p>
            <p>
              ¡Sin fecha de caducidad y conservando tu capital!
            </p>
          </div>
          <div className="flex-shrink-0">
            <img
              src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765305284821-872c4b12/logrando_un_ingreso_extra.png"
              alt="Logrando un ingreso extra"
              className="w-full max-w-xs md:max-w-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.section>

  {/* BLOQUE: ALBERT EINSTEIN / INTERÉS COMPUESTO */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.26 }}
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardContent>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 text-gray-700 text-lg md:text-xl leading-relaxed">
          <div className="flex-shrink-0">
            <img
              src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765305284825-a795c6f2/albert_einstein.png"
              alt="Albert Einstein"
              className="w-full max-w-xs md:max-w-sm"
            />
          </div>
<div className="flex-1 space-y-4 text-center">
  <p className="italic">
    "El interés compuesto es la 8va maravilla del mundo. Aquel que
    lo comprende, lo gana, pero aquel que no, lo paga"
  </p>

  <p className="font-semibold">Albert Einstein.</p>

  <p>¿Dónde está la trampa? En ningún lado.</p>

  <p className="font-bold">
    La llave está en sostener la conducta a largo plazo.
  </p>
</div>
        </div>
      </CardContent>
    </Card>
  </motion.section>

  {/* ¿QUÉ NECESITAS? + QR BALANZ */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.28 }}
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center">
        <CardTitle
          className="text-3xl md:text-4xl font-bold"
          style={{ color: AZUL }}
        >
          ¿QUÉ NECESITAS?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 text-gray-700 text-lg md:text-xl leading-relaxed">
          <div className="flex-1 space-y-4 text-left md:text-left">
            <p>
              Si bien, con nuestras sugerencias, podrías operar desde
              cualquier Broker, te aconsejamos que crees una cuenta en{' '}
              <strong>Balanz</strong> porque todos nuestros videos y
              tutoriales serán realizados desde esa plataforma.
            </p>
            <p>
              Además, ¡allí contarás con nosotros mismos como tus asesores!
              Puedes escanear el QR con tu celular.
            </p>

            <div className="space-y-2 mt-4">
              <p className="font-semibold">
                Cómo abrir tu cuenta en 5 minutos en Balanz
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://drive.google.com/file/d/1O4ihzzU8O277avcqil0qfE2uBHjuYxCH/view?usp=drive_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 rounded-full border border-[#0f2f4b] text-sm md:text-base font-medium text-[#0f2f4b] hover:bg-[#0f2f4b] hover:text-white transition-colors"
                >
                  Instructivo (PDF)
                </a>
                <a
                  href="https://cms.balanz.com/PFS/085023_01.cmoabrirtucuentaenbalanzen5minutos.mp4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 rounded-full border border-[#0f2f4b] text-sm md:text-base font-medium text-[#0f2f4b] hover:bg-[#0f2f4b] hover:text-white transition-colors"
                >
                  Video explicativo
                </a>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex justify-center">
            <img
              src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765305284800-d798d2db/qr_abrirse_cuenta_balanz.png"
              alt="QR para abrir cuenta en Balanz"
              className="w-full max-w-xs md:max-w-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.section>

  {/* Beneficios de la plataforma */}
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: 0.3 }}
  >
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center">
        <CardTitle
          className="text-3xl md:text-4xl font-bold"
          style={{ color: AZUL }}
        >
          ¿Por qué elegir FINFOCUS?
        </CardTitle>
        <CardDescription className="text-lg">
          Beneficios que obtendrás al usar la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {benefits.map((b, i) => (
          <div key={i} className="flex items-start gap-3 justify-center">
            <CheckCircle
              className="h-6 w-6 mt-1 shrink-0"
              style={{ color: CELESTE }}
            />
            <span className="text-gray-700 text-base md:text-lg text-left md:text-center">
              {b}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  </motion.section>

  {/* NUEVA SECCIÓN: PREGUNTAS FRECUENTES */}
  <FaqSection />
</TabsContent>

{/* TAB FINLEGAL */}
<TabsContent value="finlegal" className="space-y-8">
  <motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5 }}
    className="space-y-10 mt-20 md:mt-20"
  >

    {/* BLOQUE 1 — Bienvenida */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <Gavel className="h-12 w-12 mx-auto" style={{ color: AZUL }} />
        <CardTitle className="text-3xl md:text-4xl font-bold" style={{ color: AZUL }}>
          Bienvenido a FINLEGAL
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-4xl mx-auto text-gray-700 text-lg md:text-xl leading-relaxed text-center">
          Nos complace enormemente contar con tu presencia en este nuevo
          espacio diseñado especialmente para quienes, como vos,
          intervienen en el ámbito de la justicia ejerciendo,
          practicando, colaborando o aprendiendo tareas jurídicas.
        </p>
      </CardContent>
    </Card>

    {/* BLOQUE 2 — ¿Qué es FINLEGAL? */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <FolderKanban className="h-12 w-12 mx-auto" style={{ color: AZUL }} />
        <CardTitle className="text-3xl md:text-4xl font-bold" style={{ color: AZUL }}>
          ¿Qué es FINLEGAL?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-4xl mx-auto text-gray-700 text-lg md:text-xl leading-relaxed text-center">
          FINLEGAL es un entorno colaborativo, dinámico,
          multidisciplinario y generoso que pone al alcance de tu mano
          herramientas modernas para transformar tu trabajo jurídico.
        </p>
      </CardContent>
    </Card>

    {/* BLOQUE 3 — Recursos incluidos */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <CheckCircle className="h-12 w-12 mx-auto" style={{ color: AZUL }} />
        <CardTitle className="text-3xl md:text-4xl font-bold" style={{ color: AZUL }}>
          Recursos incluidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-3xl mx-auto text-gray-700 text-lg md:text-xl leading-relaxed space-y-3 text-center">
          <p>En FINLEGAL encontrarás:</p>
<ul className="space-y-3 w-fit mx-auto">
  <li className="flex items-start gap-3">
    <CheckCircle className="h-6 w-6 mt-1 shrink-0" style={{ color: AZUL }} />
    <span className="text-lg">
      Guías prácticas de cálculo y plantillas.
    </span>
  </li>

  <li className="flex items-start gap-3">
    <CheckCircle className="h-6 w-6 mt-1 shrink-0" style={{ color: AZUL }} />
    <span className="text-lg">
      Calculadoras especializadas (intereses, indemnizaciones,
      plazos, pagos) con un diseño ágil e intuitivo.
    </span>
  </li>

  <li className="flex items-start gap-3">
    <CheckCircle className="h-6 w-6 mt-1 shrink-0" style={{ color: AZUL }} />
    <span className="text-lg">
Registro de juicios, agenda y manejo de calendario, con recordatorios de eventos.
    </span>
  </li>

</ul>
        </div>
      </CardContent>
    </Card>

    {/* BLOQUE 4 — Nuestra misión */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <Target className="h-12 w-12 mx-auto" style={{ color: AZUL }} />
        <CardTitle className="text-3xl md:text-4xl font-bold" style={{ color: AZUL }}>
          Nuestra misión
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-4xl mx-auto text-gray-700 text-lg md:text-xl leading-relaxed text-center">
          Facilitar tu tarea cotidiana, impulsar buenas prácticas y
          brindarte herramientas, recursos y contenidos orientados a
          optimizar tiempos y procesos en el ámbito jurídico.
        </p>
      </CardContent>
    </Card>

    {/* BLOQUE 5 — Colaboración y mejora continua */}
    <Card className="rounded-2xl shadow-xl border border-gray-100">
      <CardHeader className="text-center space-y-3">
        <Users className="h-12 w-12 mx-auto" style={{ color: AZUL }} />
        <CardTitle className="text-3xl md:text-4xl font-bold" style={{ color: AZUL }}>
          Colaboración y mejora continua
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-4xl mx-auto text-gray-700 text-lg md:text-xl leading-relaxed text-center space-y-3">
          <p>
            En FINLEGAL creemos que la colaboración y el intercambio de
            conocimiento fortalecen nuestra labor.
          </p>
          <p>
            Si tenés sugerencias, detectás un error o deseás proponer un
            nuevo recurso, estamos para escucharte y mejorar contigo.
          </p>
        </div>
      </CardContent>
    </Card>

  </motion.section>
</TabsContent>
          </div>
        </Tabs>
      </div>

      {/* PIÉ DE PÁGINA */}
      <footer className="border-t mt-auto py-8 text-center text-[11px] md:text-xs text-gray-500 px-4">
        <p className="mb-1">
          | Nazareno Delgado Balardini. AP Balanz. Asesor Idóneo CNV. Matrícula 2490 |
        </p>
        <p className="mb-1">
          | Daniel Nicolás Pinto. AP Balanz. Asesor Idóneo CNV. Matrícula 1729 |
        </p>
        <p className="mb-2">
          | Federico Noguera. Abog. Consultor honorífico FINLEGAL |
        </p>
        <p>© FINFOCUS 2025</p>
      </footer>
    </div>
  );
}
