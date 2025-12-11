import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones } from "lucide-react";

const HERO = "#0f2f4b";

const LOGO_CENTRAL =
  "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765141465481-ae928367/warren_buffet.png";

// Convierte link "view" de Drive → link reproducible
const toDirectDrive = (viewUrl) => {
  if (!viewUrl) return null;
  const match = viewUrl.match(/\/d\/([^/]+)\//);
  if (!match) return null;
  const id = match[1];
  // usar docs.google.com en vez de drive.google.com
  return `https://docs.google.com/uc?export=open&id=${id}`;
};

const libros = [
  {
    titulo: "Aprenda y gane dinero en la Bolsa Argentina",
    desc: "Un libro esencial para iniciarte en inversiones y entender estrategias efectivas en la Bolsa Argentina.",
    logo: "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765140298925-9e0ddc04/aprenda_y_gane.jpg",
    link: "https://drive.google.com/file/d/1ADZI74e-vLeszZBJjTj6rtYsibxUBPvM/view?usp=drive_link",
  },
  {
    titulo: "El inversor inteligente",
    desc: "Considerado la biblia de la inversión en valor, este libro de Benjamin Graham ofrece una guía fundamental para invertir con prudencia y minimizar riesgos. Explica conceptos clave como la inversión a largo plazo, la evaluación de empresas y cómo tomar decisiones financieras racionales.",
    logo: "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765140298947-e37e23e1/el_inversor_inteligente_edited_edited.jpg",
    link: "https://drive.google.com/file/d/1V1SJrQWJ90dXLDnG5_XW4qImcgajEd9J/view?usp=drive_link",
  },
  {
    titulo: "El pequeño libro de la valoración de empresas",
    desc: "Una guía práctica sobre valoración de empresas, explicando métodos clave como el flujo de caja descontado y la valoración relativa. Ideal para inversores y emprendedores.",
    logo: "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765140298942-7dae0597/el_pequeno_libro_edited.jpg",
    link: "https://drive.google.com/file/d/1NMYM_IqxxAETxjTfkcHie0UVszdW5yW/view?usp=drive_link",
    audible: "https://drive.google.com/file/d/15IIDGQkg_ANEvLELWoEPiFtao2DX3THd/view?usp=drive_link",
  },
  {
    titulo: "Lo más importante para invertir con sentido común",
    desc: "Un libro que desglosa los principios esenciales de la inversión exitosa, destacando la importancia de la disciplina, la paciencia y la gestión del riesgo para obtener buenos resultados a largo plazo.",
    logo: "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765140298949-2b4937a9/lo_mas_importante.jpg",
    link: "https://drive.google.com/file/d/1GYu9c1MJCQxhFMJTL_yR0JWak3wXYAFD/view?usp=drive_link",
    audible: "https://drive.google.com/file/d/15a_bdrOPLn-x7a2_DRhaaozUE9Wda5hQ/view?usp=drive_link",
  },
  {
    titulo: "Morir con cero",
    desc: "Este libro explora la idea de aprovechar al máximo la vida y el dinero, incentivando a planificar las finanzas de manera que se disfruten en el presente, sin dejar grandes sumas sin utilizar. Enseña cómo optimizar el uso del capital a lo largo de la vida para maximizar experiencias y bienestar.",
    logo: "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765140298938-9cc46fd5/morir_con_cero.jpg",
    link: "https://drive.google.com/file/d/1oHbuSykjngSyjikxGZeimFu70FgIXXlE/view?usp=drive_link",
    audible: "https://drive.google.com/file/d/1hxwUgCY1wmtyKYbyit6g2YiVOMysxQ5M/view?usp=drive_link",
  },
  {
    titulo: "Mercado de capitales. Manual para no especialistas",
    desc: "Una guía práctica que introduce a los no especialistas en el mundo del mercado de capitales. Explica cómo funcionan las inversiones, los instrumentos financieros y las estrategias básicas para gestionar el riesgo.",
    logo: "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765140298939-b86f2fd6/mercado_de_capitales.jpeg",
    link: "https://drive.google.com/file/d/1-iKBOM4hq-oq00yDDDuXZrkYzNckwf7G/view?usp=drive_link",
  },
  {
    titulo: "Múltiplos y valuación de acciones",
    desc: "Una guía esencial para entender cómo se valoran las empresas en el mercado financiero mediante el uso de múltiplos. Este libro proporciona herramientas prácticas para evaluar acciones y tomar decisiones de inversión informadas.",
    logo: "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765140298953-eacf202f/multiplos.jpeg",
    link: "https://drive.google.com/file/d/1-OU9l-lCX1DuS-Vs-t6BmtTgUCSfzwuX/view?usp=drive_link",
    audible: "https://drive.google.com/file/d/1i9afyz3k_Wc-NH-E67_388k-RQ7ELTK8/view?usp=drive_link",
  },
  {
    titulo: "The Five Rules for Successful Stock Investing",
    desc: "Este libro ofrece una guía práctica para seleccionar acciones de manera inteligente y rentable. Explica principios esenciales para evaluar empresas, gestionar riesgos y construir una cartera de inversión a largo plazo.",
    logo: "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765140298934-6bc90328/the_five.jpg",
    link: "https://drive.google.com/file/d/1T4iwueQ9FNufQYNOapBA8eceAy6HOzH4/view?usp=drive_link",
  },
  {
    titulo: "El pequeño libro que genera riqueza",
    desc: "Un enfoque práctico sobre la generación de riqueza mediante la inversión a largo plazo. Explica cómo los mercados financieros pueden ser aprovechados con estrategias simples pero efectivas.",
    logo: "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765140298942-7dae0597/el_pequeno_libro_edited.jpg",
    link: "https://drive.google.com/file/d/1sHucoksJVH2uOrKY7PqDHKLVIUkaKTjf/view?usp=drive_link",
    audible: "https://drive.google.com/file/d/1igFrqVGiYY0MC9sK790EAhopVd9INSJ6/view?usp=drive_link",
  },
  {
    titulo: "Invirtiendo a largo plazo",
    desc: "Este libro explora el poder del interés compuesto y la importancia de la paciencia en el mundo de las inversiones. Proporciona estrategias y consejos prácticos para maximizar el crecimiento del capital con el tiempo.",
    logo: "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765140298940-0ecb14c5/invirtiendo_a_largo_plazo.jpg",
    link: "https://drive.google.com/file/d/1_TdYDZqmr_FvGvfIbAj4WlafyAKExfsD/view?usp=drive_link",
    audible: "https://drive.google.com/file/d/1TDFwOn_gC5zwbfYMFbe_j3OP54j1P2l6/view?usp=drive_link",
  },
];

export default function BibliotecaFinanzas() {
  return (
    <div className="w-full mx-auto max-w-5xl py-10 px-4">
      {/* LOGO CENTRAL */}
      <div className="w-full flex justify-center mb-10">
        <img
          src={LOGO_CENTRAL}
          alt="Warren Buffet"
          className="w-40 h-40 object-contain rounded-full shadow-lg"
        />
      </div>

      <h1
        className="text-center text-3xl font-bold mb-6"
        style={{ color: HERO }}
      >
        Biblioteca FINFOCUS
      </h1>

      <p className="text-center text-gray-600 max-w-2xl mx-auto mb-10">
        Una selección de libros fundamentales para formarte en inversiones,
        finanzas personales, valuación y toma de decisiones racionales.
      </p>

      {/* GRID DE LIBROS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {libros.map((libro, i) => {
          const audioSrc = libro.audible ? toDirectDrive(libro.audible) : null;

          return (
            <Card
              key={i}
              className="shadow-md hover:shadow-lg transition-all flex flex-col"
            >
<CardHeader>
  <img
    src={libro.logo}
    alt={libro.titulo}
    className="w-full h-48 object-cover rounded-md"
  />
  <CardTitle className="mt-3 text-lg font-bold text-[#0f2f4b] text-center">
    {libro.titulo}
  </CardTitle>
</CardHeader>

<CardContent className="flex flex-col flex-1">
  {/* Resumen CENTRADO */}
  <p className="text-sm text-gray-600 mb-4 text-center">
    {libro.desc}
  </p>

  {/* BLOQUE DE BOTONES ANCLADO ABAJO */}
  <div className="mt-auto space-y-2 pt-2">
    {/* Escuchar (si existe) */}
    {libro.audible && (
      <Button
        className="w-full bg-white border border-[#0f2f4b] text-[#0f2f4b] hover:bg-gray-50"
        onClick={() =>
          window.open(libro.audible, "_blank", "noopener,noreferrer")
        }
      >
        <Headphones className="w-4 h-4 mr-2" />
        Resumen audible
      </Button>
    )}

    {/* Leer libro (siempre abajo del todo) */}
    <Button
      className="w-full bg-[#0f2f4b] hover:bg-[#14385f]"
      onClick={() =>
        window.open(libro.link, "_blank", "noopener,noreferrer")
      }
    >
      <BookOpen className="w-4 h-4 mr-2" />
      Leer libro
    </Button>
  </div>
</CardContent>

            </Card>
          );
        })}
      </div>
    </div>
  );
}
