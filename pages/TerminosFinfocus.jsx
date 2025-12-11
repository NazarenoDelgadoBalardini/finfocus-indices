import React from "react";

export default function TerminosFinfocus() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 shadow-md border border-slate-200">
        <h1 className="text-3xl font-bold text-[#0f2f4b] mb-6">
          Términos y condiciones – FINFOCUS
        </h1>

        <p className="text-slate-700 mb-4">
          Los presentes términos y condiciones regulan el acceso y uso de los servicios
          ofrecidos a través del sitio web <span className="font-semibold">www.finfocus.com.ar</span>. 
          Al suscribirse a alguno de nuestros servicios, el usuario manifiesta entender con claridad 
          y cumplir con lo siguiente:
        </p>

        {/* 1. Naturaleza del Servicio */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            1. Naturaleza del Servicio
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              FINFOCUS proporciona información y análisis de mercado con fines educativos e informativos.
            </p>
            <p>
              Los suscriptores de los planes FINFOCUS reciben información sobre las inversiones que desde el 
              proyecto FINFOCUS se realizan con su propio capital, con el objetivo de brindar transparencia, 
              independencia financiera y ejemplos prácticos sobre cómo invertir.
            </p>
            <p>
              Cada suscriptor tiene plena libertad sobre cómo invertir su dinero, en qué activos y sobre todo, 
              sobre cuánto decide o no invertir.
            </p>
            <p>
              Los planes FINFOCUS <span className="font-semibold">NO</span> ofrecen asesoramiento financiero personalizado 
              ni recomendaciones específicas u obligatorias de inversión.
            </p>
            <p>
              Las inversiones mencionadas en FINFOCUS son <span className="font-semibold">SUGERENCIAS</span> basadas en un 
              análisis exhaustivo y cotidiano que se hace del mercado de capitales. Las decisiones de inversión de 
              FINFOCUS son propias del proyecto y no deben interpretarse como recomendaciones de compra o venta.
            </p>
            <p>
              Cada usuario es absolutamente responsable de sus propias decisiones de inversión y de los riesgos asociados.
            </p>
          </div>
        </section>

        {/* 2. Riesgos de Inversión */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            2. Riesgos de Inversión
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              La inversión en los mercados financieros, como cualquier otro tipo de inversión, conlleva riesgos, 
              incluida la posibilidad de pérdida circunstancial de capital. Los planes de suscripción FINFOCUS son 
              proyectos a largo plazo para invertir con constancia y paciencia.
            </p>
            <p>
              Los rendimientos pasados no garantizan rendimientos futuros. Las tasas y los rendimientos pueden oscilar. 
              El éxito del proyecto radica en la paciencia y la constancia.
            </p>
            <p>
              FINFOCUS <span className="font-semibold">NO</span> garantiza ni promete rendimientos específicos.
            </p>
          </div>
        </section>

        {/* 3. Renovación automática y cancelación */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            3. Renovación automática y cancelación de la suscripción
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              Al suscribirse a FINFOCUS, el usuario acepta que el pago de la suscripción seleccionada se renovará 
              automáticamente cada mes, debitándose el monto correspondiente a través del medio de pago elegido 
              al momento de la suscripción.
            </p>
            <p>El usuario podrá cancelar su suscripción en cualquier momento de las siguientes maneras:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                desde el medio de pago utilizado, siguiendo las instrucciones de cancelación del proveedor del 
                servicio de pago.
              </li>
              <li>
                solicitándolo por un mensaje, enviándolo desde la pestaña <span className="italic">Contacto</span> 
                con el asunto &quot;Solicitud de baja&quot; e incluyendo en el cuerpo del mensaje los datos de su suscripción.
              </li>
            </ul>
            <p>
              Las cancelaciones procesadas antes de la fecha de renovación evitarán el cobro del siguiente período. 
              No se realizarán reembolsos por períodos ya abonados.
            </p>
          </div>
        </section>

        {/* 4. Independencia y responsabilidad del usuario */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            4. Independencia y responsabilidad del usuario
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              Los usuarios son responsables de administrar sus propias cuentas de inversión y de ejecutar sus propias 
              operaciones. Si bien van a recibir tutoriales y videos explicativos para cada uno de los pasos que decidan 
              dar, así como canales de consulta ante cualquier dificultad, la responsabilidad por cada operación que un 
              suscriptor decida ejecutar, corre por su exclusiva cuenta.
            </p>
            <p>
              FINFOCUS no tiene acceso ni control sobre las cuentas comitentes de inversión de los usuarios. Cada 
              suscriptor es responsable por la seguridad de su cuenta y de sus contraseñas.
            </p>
            <p>
              Los usuarios son libres de retirar su capital en cualquier momento y de tomar sus propias decisiones de inversión.
            </p>
          </div>
        </section>

        {/* 5. Transparencia y divulgación */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            5. Transparencia y divulgación
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              FINFOCUS tiene como principal valor la transparencia y aspira a transformar la educación financiera, 
              ofreciendo a sus suscriptores un acompañamiento genuino y a largo plazo, compartiendo experiencias para 
              que cada uno pueda construir una fuente alternativa de ingresos, a su propia medida.
            </p>
            <p>
              FINFOCUS comparte con sus suscriptores las inversiones que realiza con su propio capital, según el plan de
              inversión al que se adhieran pero no está obligado a asesorar individualmente a cada suscriptor ni a operar 
              por su cuenta.
            </p>
          </div>
        </section>

        {/* 6. Limitación de responsabilidad */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            6. Limitación de responsabilidad
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              FINFOCUS no será responsable de ninguna pérdida o daño sufrido por los usuarios como resultado de sus 
              decisiones de inversión.
            </p>
            <p>
              FINFOCUS no será responsable por eventuales errores u omisiones cometidos por los suscriptores en sus 
              propias cuentas conforme la información que le fuera proporcionada.
            </p>
            <p>
              FINFOCUS es un proyecto independiente que no responde a ningún otro interés que el de generar educación y 
              libertad financiera a sus suscriptores. En ese contexto, no tiene vinculación contractual ni de ningún otro 
              tipo con las empresas, títulos, acciones, sociedades de bolsa, fondos comunes de inversión que eventualmente 
              el proyecto decida suscribir con su propio capital.
            </p>
          </div>
        </section>

        {/* 7. Propiedad intelectual */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            7. Propiedad intelectual
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              Todo el contenido y la información proporcionada por FINFOCUS son propiedad de FINFOCUS y están protegidos 
              por derechos de autor.
            </p>
            <p>
              Los usuarios no pueden reproducir, distribuir o modificar el contenido del material fílmico o escrito que 
              se facilite, sin el permiso expreso de FINFOCUS.
            </p>
          </div>
        </section>

        {/* 8. Cláusulas de privacidad */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            8. Cláusulas de privacidad
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              La información personal del usuario será tratada de acuerdo con la Ley de Protección de Datos Personales, 
              Ley 25.326.
            </p>
            <p>
              La plataforma se compromete a mantener la confidencialidad de la información del usuario.
            </p>
          </div>
        </section>

        {/* 9. Modificaciones a los Términos y Condiciones */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            9. Modificaciones a los Términos y Condiciones
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              FINFOCUS se reserva el derecho de modificar estos términos y condiciones en cualquier momento.
            </p>
            <p>
              Los usuarios serán notificados de cualquier cambio.
            </p>
            <p className="text-sm text-slate-600 italic">
              Cláusula de Fuerza Mayor: &quot;FINFOCUS no será responsable de ningún retraso o incumplimiento en 
              el cumplimiento de sus obligaciones debido a causas fuera de su control razonable, como desastres 
              naturales, actos de guerra o disturbios civiles.&quot;
            </p>
          </div>
        </section>

        {/* 10. Marco legal nacional vigente */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            10. Marco legal nacional vigente
          </h2>
          <div className="space-y-2 text-slate-700 text-sm md:text-base">
            <p>
              En cumplimiento con la Ley de Defensa del Consumidor, Ley 24.240, FINFOCUS se compromete siempre y en todo 
              momento a brindar información clara, precisa y detallada sobre los servicios que ofrece.
            </p>
            <p>
              Conforme lo establecido en la cláusula N°3, los usuarios pueden dar de baja su suscripción del mismo modo 
              y por la misma vía a través de la cual adhirieron al servicio. La plataforma tiene completamente vedado 
              ofrecer resistencia alguna al efecto.
            </p>
            <p>
              Si bien la plataforma www.finfocus.com.ar no asesora individualmente a sus suscriptores ni da instrucciones 
              sobre operaciones en particular, la plataforma cuenta con profesionales formados y especializados en la materia, 
              en másters dictados por las universidades más prestigiosas del país, matriculados por ante la Comisión Nacional 
              de Valores (CNV), que velarán siempre y en todo momento por el cumplimiento de la normativa vigente.
            </p>
          </div>
        </section>

        {/* 11. Aceptación de los Términos y Condiciones */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#0f2f4b] mb-2">
            11. Aceptación de los Términos y Condiciones
          </h2>
          <p className="text-slate-700 text-sm md:text-base">
            He leído, comprendo y acepto con plena libertad y discernimiento los términos y condiciones previamente detallados.
          </p>
        </section>

        <p className="text-slate-500 mt-10 text-xs">
          Última actualización: {new Date().getFullYear()}.
        </p>
      </div>
    </div>
  );
}
