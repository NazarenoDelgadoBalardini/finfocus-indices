import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const QUESTIONS = [
  {
    id: "p1",
    text: "1. ¿Ahorras al menos el 10% de tus ingresos mensuales?",
    options: ["Nunca", "A veces", "Sí, regularmente"]
  },
  {
    id: "p2",
    text: "2. ¿Llevas un registro de ingresos y gastos mensualmente?",
    options: ["No llevo registro", "Ocasionalmente", "Sí, siempre"]
  },
  {
    id: "p3",
    text: "3. ¿Tienes un fondo de emergencia equivalente a al menos 3 meses de gastos?",
    options: ["No", "En construcción", "Sí, completado"]
  },
  {
    id: "p4",
    text: "4. ¿Pagas el total de tu tarjeta de crédito cada mes?",
    options: ["No, solo el mínimo", "A veces excedo", "Sí, siempre"]
  },
  {
    id: "p5",
    text: "5. ¿Tienes un presupuesto definido y lo sigues cada mes?",
    options: ["No tengo presupuesto", "Tengo pero no sigo", "Sí, lo sigo"]
  },
  {
    id: "p6",
    text: "6. ¿Tienes deudas de alto interés controladas o pagadas?",
    options: ["No, pendientes", "En proceso", "No tengo"]
  },
  {
    id: "p7",
    text: "7. ¿Has diversificado tus inversiones (más de un instrumento)?",
    options: ["No", "Poca", "Sí"]
  },
  {
    id: "p8",
    text: "8. ¿Revisas tu informe de crédito al menos una vez al año?",
    options: ["No lo reviso", "Rara vez", "Sí"]
  },
  {
    id: "p9",
    text: "9. ¿Tienes objetivos financieros claros para el próximo año?",
    options: ["No", "Algunos", "Sí"]
  },
  {
    id: "p10",
    text: "10. ¿Revisas y ajustas tu presupuesto cada trimestre?",
    options: ["Nunca", "Algunos trimestres", "Sí"]
  }
];

export default function FinancialHealthTest() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);

  const current = QUESTIONS[step];

  const handleSelect = (value) => {
    const newAns = { ...answers, [current.id]: value };
    setAnswers(newAns);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      calculateResult(newAns);
    }
  };

  const calculateResult = (ans) => {
    const numeric = Object.values(ans).reduce((acc, val) => acc + val, 0);
    const percent = Math.round((numeric / (QUESTIONS.length * 2)) * 100);

    const message =
      percent < 50
        ? "Necesitas mejorar tu salud financiera."
        : percent < 75
        ? "Tu salud financiera es regular."
        : "¡Excelente salud financiera!";

    setDone({ percent, message });
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="text-[#0f2f4b] max-w-5xl mx-auto p-6">  
      <style>{`
        @keyframes finfocusFade {
          from { opacity: 0; transform: translateX(20px);}
          to { opacity: 1; transform: translateX(0);}
        }
      `}</style>

      <Card className="shadow-xl bg-white rounded-2xl p-4 md:p-10">
        <CardHeader className="text-center pb-0">
          <div className="flex justify-center mb-4">
            <span className="inline-flex justify-center items-center w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full text-2xl">
              📊
            </span>
          </div>

          <CardTitle className="text-4xl font-extrabold">
            
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Selecciona tu respuesta y avanza automáticamente
          </p>
        </CardHeader>

        {/* Preguntas */}
        {!done && (
          <CardContent
            style={{ animation: "finfocusFade 0.5s ease" }}
            className="bg-white rounded-xl border p-6 mt-6"
          >
            {step > 0 && (
              <Button
                variant="ghost"
                className="mb-4 text-gray-500 hover:text-gray-700"
                onClick={goBack}
              >
                ← Volver
              </Button>
            )}

            <p className="font-semibold text-xl mb-4">{current.text}</p>

            {current.options.map((opt, index) => (
              <div
                key={opt}
                className="cursor-pointer border rounded-lg p-4 mb-3 hover:bg-indigo-50 transition"
                onClick={() => handleSelect(index)}
              >
                {opt}
              </div>
            ))}
          </CardContent>
        )}

        {/* Resultado */}
        {done && (
          <CardContent className="bg-white rounded-xl shadow p-8 text-center mt-6">
            <p className="text-5xl font-bold mb-3">{done.percent}%</p>
            <p className="text-xl font-semibold mb-4">{done.message}</p>
            <p className="text-gray-600 text-sm">
              Este test es orientativo y no reemplaza asesoramiento profesional.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
