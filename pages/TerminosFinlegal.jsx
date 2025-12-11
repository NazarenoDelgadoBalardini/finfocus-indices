import React from "react";

export default function TerminosFinlegal() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 shadow-md border border-slate-200">
        <h1 className="text-3xl font-bold text-[#0f2f4b] mb-6">
          Términos y condiciones – FINLEGAL
        </h1>

        <p className="text-slate-700 mb-4">
          Los presentes términos y condiciones regulan el acceso y uso de los
          servicios ofrecidos a través del sitio web{" "}
          <span className="font-semibold">www.finfocus.com.ar</span>. Al suscribirse
          a alguno de nuestros servicios, el usuario manifiesta entender con claridad
          y cumplir con lo siguiente:
        </p>

        {/* 1. Naturaleza del servicio */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            1. Naturaleza del servicio
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              1.1 FINLEGAL ofrece un conjunto de herramientas, calculadoras y
              plantillas jurídicas diseñadas para agilizar y optimizar las tareas
              de los usuarios.
            </p>
            <p>
              1.2 Todas las herramientas tienen carácter educativo, colaborativo y
              de apoyo práctico: proporcionan resultados de cálculos, formatos y
              guías, pero no constituyen asesoramiento legal personalizado, ni
              reemplazan el juicio profesional del usuario.
            </p>
            <p>
              1.3 Al tratarse de herramientas de uso interactivo por parte del
              usuario, no garantizamos que los resultados sean 100% precisos;
              recomendamos siempre verificar con criterio profesional.
            </p>
          </div>
        </section>

        {/* 2. Ámbito de aplicación y normativa */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            2. Ámbito de aplicación y normativa
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              2.1 El acceso y uso de los servicios que se brindan se realiza
              exclusivamente a través de{" "}
              <span className="font-semibold">www.finfocus.com.ar/finlegal</span>.
            </p>
            <p>
              2.2 Las herramientas allí contenidas están cimentadas en la normativa
              vigente de la República Argentina.
            </p>
          </div>
        </section>

        {/* 3. Función formativa y mejora de procesos */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            3. Función formativa y mejora de procesos
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              3.1 FINLEGAL tiene un enfoque formativo, simplificador y orientado a
              la mejora continua de procesos jurídicos, contribuyendo a las buenas
              prácticas profesionales.
            </p>
            <p>
              3.2 FINLEGAL, además, se trata de una propuesta solidaria y de acceso
              inclusivo a la información, que busca optimizar recursos y fomentar
              la humanización de la justicia a través del intercambio y la
              colaboración.
            </p>
          </div>
        </section>

        {/* 4. Modelos de suscripción, becas y renovación */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            4. Modelos de suscripción, becas y renovación
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              4.1 FINLEGAL ofrece los siguientes planes de suscripción, con sus
              respectivas características detalladas en cada segmento, además de
              que todas las herramientas cuentan con un período de prueba
              gratuito:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>FINLEGAL Esencial</li>
              <li>FINLEGAL Esencial+</li>
              <li>FINLEGAL Total</li>
              <li>FINLEGAL Test (versión gratuita de prueba por 7 días)</li>
            </ul>
            <p>
              4.2 Atento a que FINLEGAL tiene una matriz colaborativa e inclusiva,
              podrá otorgar becas parciales o totales a profesionales, oficinas o
              equipos que demuestren necesidad o contribución al proyecto, previa
              evaluación interna y conforme disponibilidad.
            </p>
            <p>
              4.3 <span className="font-semibold">Renovación automática y cancelación de la suscripción.</span> 
              {" "}Al suscribirse a FINLEGAL, el usuario acepta que el pago de la
              suscripción seleccionada se renovará automáticamente cada mes,
              debitándose el monto correspondiente a través del medio de pago
              elegido al momento de la suscripción.
            </p>
            <p>El usuario podrá cancelar su suscripción en cualquier momento de las siguientes maneras:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                desde el medio de pago utilizado, siguiendo las instrucciones de
                cancelación del proveedor del servicio de pago.
              </li>
              <li>
                solicitándolo por un mensaje, desde la pestaña{" "}
                <span className="italic">Contacto</span> con el asunto
                &quot;Solicitud de baja&quot; e incluyendo en el cuerpo del mensaje
                los datos de su suscripción.
              </li>
            </ul>
            <p>
              Las cancelaciones procesadas antes de la fecha de renovación evitarán
              el cobro del siguiente período. No se realizarán reembolsos por
              períodos ya abonados.
            </p>
          </div>
        </section>

        {/* 5. Responsabilidad del usuario */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            5. Responsabilidad del usuario
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              5.1 Cada usuario es responsable de la interpretación y aplicación de
              los resultados y formatos entregados por FINLEGAL.
            </p>
            <p>
              5.2 FINLEGAL no asume responsabilidad alguna por decisiones
              profesionales ni resultados de procedimientos basados en las
              herramientas.
            </p>
            <p>
              5.3 Atento al contenido de las herramientas, éstas se actualizan
              permanentemente. El usuario debe asegurarse de estar utilizando la
              versión vigente.
            </p>
            <p>
              5.4 La plataforma no registra ni almacena ningún dato que se ingrese
              en las aplicaciones, garantizando la confidencialidad de la información
              proporcionada.
            </p>
            <p>
              5.5 El uso o el destino que se diera a las herramientas que se
              proporcionan es bajo la exclusiva responsabilidad del usuario.
            </p>
          </div>
        </section>

        {/* 6. Ética y cumplimiento */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            6. Ética y cumplimiento
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              6.1 Los usuarios se comprometen a usar FINLEGAL conforme a las
              normativas propias del Poder Judicial y de los Colegios
              profesionales de la jurisdicción en la que se desempeñen. Cualquier
              uso que atente contra la confidencialidad de expedientes o fundamentos
              judiciales será motivo de suspensión inmediata del servicio.
            </p>
            <p>
              6.2 <span className="font-semibold">Política de uso aceptable:</span> Queda prohibido el uso de
              FINLEGAL para actividades ilícitas, automatización masiva indebida o
              extracción sistemática de datos. El incumplimiento dará lugar a la
              suspensión de la cuenta.
            </p>
          </div>
        </section>

        {/* 7. Desarrollo de soluciones a medida */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            7. Desarrollo de soluciones a medida
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              7.1 FINLEGAL ofrece además servicios profesionales de desarrollo a
              medida de herramientas jurídicas para estudios u oficinas
              jurisdiccionales.
            </p>
            <p>
              7.2 Cada proyecto se rige por un contrato específico que definirá
              alcance, plazos, honorarios y cláusulas de confidencialidad.
            </p>
          </div>
        </section>

        {/* 8. Propiedad intelectual y uso de suscripción */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            8. Propiedad intelectual y uso de suscripción
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              8.1 Todo el contenido (códigos, diseños, manuales, plantillas y
              colores) son propiedad de FINFOCUS y están protegidos por derechos de
              autor.
            </p>
            <p>
              8.2 La suscripción es personal e intransferible; ante cualquier
              irregularidad en el uso de la plataforma, FINLEGAL podrá dar de baja
              la cuenta unilateralmente para proteger a la comunidad.
            </p>
          </div>
        </section>

        {/* 9. Licenciamiento y fuentes de datos */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            9. Licenciamiento y fuentes de datos
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              9.1 Nuestras calculadoras y plantillas se nutren de fuentes oficiales
              y públicas (INDEC, MTEySS, etc.). FINLEGAL no garantiza la inmediatez
              en la actualización de índices de terceros; los valores se ofrecen
              &quot;tal cual&quot; están disponibles en su origen.
            </p>
            <p>
              9.2 <span className="font-semibold">Propiedad de mejoras y feedback:</span> Todo aporte,
              sugerencia o código que el usuario comparta con FINLEGAL podrá
              incorporarse libremente a la plataforma para su mejora colaborativa.
            </p>
          </div>
        </section>

        {/* 10. Privacidad y tratamiento de datos */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            10. Privacidad y tratamiento de datos
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              10.1 La recolección y uso de datos personales se realiza de acuerdo
              con la Ley 25.326 de Protección de Datos Personales.
            </p>
            <p>
              10.2 FINLEGAL adoptará medidas razonables de seguridad para preservar
              la confidencialidad de tu información.
            </p>
            <p>
              10.3 El sitio puede utilizar cookies y tecnologías similares para
              mejorar la experiencia de usuario y fines estadísticos.
            </p>
            <p>
              10.4 El usuario puede configurar su navegador para restringir o
              bloquear cookies, sin que ello afecte el funcionamiento básico de las
              herramientas.
            </p>
          </div>
        </section>

        {/* 11. Disponibilidad y soporte */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            11. Disponibilidad y soporte
          </h2>
          <p className="text-slate-700 text-sm md:text-base">
            FINLEGAL se esfuerza por mantener un nivel de servicio óptimo y de
            máxima calidad para sus usuarios. Sin embargo, pueden producirse
            interrupciones de servicio por mantenimiento o causas fuera de nuestro
            control, todo lo que será oportunamente puesto en conocimiento de los
            usuarios, priorizando siempre, como valor rector, el de la{" "}
            <span className="font-semibold">TRANSPARENCIA</span>.
          </p>
        </section>

        {/* 12. Modificaciones a los términos */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            12. Modificaciones a los términos
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              12.1 FINLEGAL se reserva el derecho de modificar estos términos en
              cualquier momento, previa notificación a los suscriptores vigentes.
            </p>
            <p>
              12.2 Las actualizaciones de estos términos y condiciones se
              publicarán en el sitio y se notificarán a los usuarios suscriptos.
            </p>
          </div>
        </section>

        {/* 13. Ley aplicable y jurisdicción */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            13. Ley aplicable y jurisdicción
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              13.1 Estos términos se rigen por la legislación sustantiva argentina.
            </p>
            <p>
              13.2 Para cualquier disputa, las partes se someten a la jurisdicción
              de los tribunales competentes de la provincia de Tucumán.
            </p>
          </div>
        </section>

        {/* Aceptación */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            Aceptación
          </h2>
          <p className="text-slate-700 text-sm md:text-base">
            Al utilizar <span className="font-semibold">www.finfocus.com.ar/finlegal</span> y/o
            suscribirte a cualquiera de nuestros servicios, confirmás que leíste,
            comprendés y aceptás estos Términos y Condiciones en su integridad.
          </p>
        </section>

        <p className="text-slate-500 mt-10 text-xs">
          FINLEGAL agradece tu confianza y compromiso con la mejora continua de la
          práctica jurídica.
        </p>
      </div>
    </div>
  );
}
