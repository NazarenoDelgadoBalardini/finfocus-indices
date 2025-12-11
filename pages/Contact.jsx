import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContactMessage } from '@/entities/ContactMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import axios from 'axios';

export default function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.category) {
      newErrors.category = 'Selecciona una categoría';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = 'El asunto es requerido';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'El mensaje es requerido';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'El mensaje debe tener al menos 10 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Guardar el mensaje en la base de datos
      const savedMessage = await ContactMessage.create({
        ...formData,
        status: 'Pendiente'
      });

      // Enviar email de notificación al admin
      await axios.post(`${process.env.PROXY_INTEGRATION_URL}/emails/send`, {
        to: ['nazarenodelgado@gmail.com', 'fede.noguera.fn@gmail.com'],
        subject: `Nueva consulta de contacto: ${formData.category}`,
        html: `
          <h2>Nueva consulta recibida</h2>
          <p><strong>Nombre:</strong> ${formData.name}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Categoría:</strong> ${formData.category}</p>
          <p><strong>Asunto:</strong> ${formData.subject}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${formData.message}</p>
          <hr>
          <p><small>Enviado desde el formulario de contacto de FinFocus</small></p>
        `
      }, {
        headers: {
          "x-api-key": window.config.apiKey
        }
      });

      // Mostrar mensaje de éxito
      setSubmitSuccess(true);
      
      // Limpiar formulario
      setFormData({
        name: '',
        email: '',
        category: '',
        subject: '',
        message: ''
      });

      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setErrors({ submit: 'Hubo un error al enviar tu mensaje. Por favor intenta nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header centrado */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contáctanos</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            ¿Tienes alguna pregunta o sugerencia? Estamos aquí para ayudarte. 
            Completa el formulario y te responderemos lo antes posible.
          </p>
        </div>

        {/* Grid de información y formulario - centrado */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Información de contacto */}
          <div className="space-y-6">
            {/* Email Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-center">
                  <Mail className="h-5 w-5 mr-2 text-blue-600" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-gray-600">nazarenodelgado@gmail.com</p>
                    <p className="text-sm text-gray-600">fede.noguera.fn@gmail.com</p>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center space-y-2">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Teléfono</p>
                    <p className="text-sm text-gray-600">Solo mensajes a través de este formulario.</p>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center space-y-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Ubicación</p>
                    <p className="text-sm text-gray-600">Tucumán, Argentina</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Horario Card */}
            <Card className="hover:shadow-lg transition-shadow overflow-hidden">
              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-[#0b1726] via-[#0f2f4b] to-[#1e3a8a] p-6 text-white shadow-xl border border-white/10">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />
                
                <div className="relative text-center">
                  <div className="flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 mr-2" />
                    <h3 className="text-xl font-semibold">Horario de Atención</h3>
                  </div>
                  <div className="space-y-2 text-blue-100">
                    <p className="flex justify-between">
                      <span>Lunes a Viernes:</span>
                      <span className="font-medium">9:00 - 18:00</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Sábados:</span>
                      <span className="font-medium">9:00 - 13:00</span>
                    </p>
                    <p className="flex justify-between text-blue-200/70">
                      <span>Domingos:</span>
                      <span>Cerrado</span>
                    </p>
                  </div>
                  <p className="text-xs text-blue-100/70 mt-4">
                    Respondemos todas las consultas dentro de las 24 horas hábiles
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Formulario de contacto */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.submit && (
                  <Alert className="mb-6 bg-red-50 border-red-200">
                    <AlertDescription className="text-red-800">
                      {errors.submit}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      placeholder="Juan Pérez"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="juan@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleChange('category', value)}
                  >
                    <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Soporte técnico">Soporte técnico</SelectItem>
                      <SelectItem value="Consultas comerciales">Consultas comerciales</SelectItem>
                      <SelectItem value="Sugerencias">Sugerencias</SelectItem>
                      <SelectItem value="Reportar un problema">Reportar un problema</SelectItem>
                      <SelectItem value="Solicitud de beca">Solicitud de beca</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-600">{errors.category}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto *</Label>
                  <Input
                    id="subject"
                    placeholder="¿En qué podemos ayudarte?"
                    value={formData.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    className={errors.subject ? 'border-red-500' : ''}
                  />
                  {errors.subject && (
                    <p className="text-sm text-red-600">{errors.subject}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensaje *</Label>
                  <Textarea
                    id="message"
                    placeholder="Cuéntanos más sobre tu consulta..."
                    rows={6}
                    value={formData.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    className={errors.message ? 'border-red-500' : ''}
                  />
                  {errors.message && (
                    <p className="text-sm text-red-600">{errors.message}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {formData.message.length} / 5000 caracteres
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Mensaje
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

                {/* Quiénes somos */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Quiénes somos
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Un equipo interdisciplinario que combina derecho, finanzas,
              tecnología y gestión para ayudarte a tomar mejores decisiones.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Federico */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex gap-4">
                <img
                  src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765276157609-c9707683/federico.png"
                  alt="Federico Noguera"
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Consultor FINLEGAL
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Federico Noguera
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Abogado y Procurador. Universidad Nacional de Tucumán (UNT). Maestrando en Derecho Procesal
                    (UNR). Diplomado en Derecho Individual y Colectivo de Trabajo de la Universidad Nacional de Tres de Febrero
                    (UNTREF).
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Secretario Coordinador en la Oficina de Gestión Asociada del
                    Trabajo del Poder Judicial de Tucumán.
                  </p>
    </div>
    {/* Margarita A NIVEL DE TARJETA */}
    <p className="text-xl text-center mt-4 mb-2">🌼</p>
  </CardContent>
            </Card>

            {/* Julieta */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex gap-4">
                <img
                  src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765277834428-ffc85497/juli_edited.png "
                  alt="Julieta M. Viola Hidalgo"
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Finance research &amp; officer compliance
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Julieta M. Viola Hidalgo
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Contadora Pública,  graduada en la Universidad del Norte Santo Tomás de Aquino (UNSTA) y Máster MBA Executive
                    en la Universidad Austral - IAE (2024). Especializada en Compliance
                    en ADEN International Business School.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Forma parte del equipo de Finanzas de un grupo empresarial
                    líder en la industria azucarera y agrícola argentina,
                    con diversificación en granos, hacienda vacuna y bodegas vitinícolas. 
                  </p>
    </div>
    {/* Margarita A NIVEL DE TARJETA */}
    <p className="text-xl text-center mt-4 mb-2">🌼</p>
  </CardContent>
            </Card>

            {/* Romina */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex gap-4">
                <img
                  src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765276157613-4dab1970/noni.png"
                  alt="Romina Pedraza Nassar"
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Finance research
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Romina Pedraza Nassar
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Licenciada en Finanzas gradudada de la Universidad de San Pablo T (USPT) y analista técnico financiero y
                    bursátil (UTN BA), especializada en planeamiento patrimonial.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Encargada de las finanzas del Palacio de Emir, local
                    gastronómico especializado en cocina árabe, cuidando el
                    equilibrio entre tradición, eficiencia económica e innovación.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Nazareno */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex gap-4">
                <img
                  src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765276157607-23a96241/nazareno_foto.jpg"
                  alt="Nazareno Delgado Balardini"
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Project Manager
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Nazareno Delgado Balardini
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Licenciado en Economía de la Universidad Nacional de Tucumán (UNT) y Máster en Finanzas
                    de la Universidad de San Andrés (UdeSA).
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Trabaja en el Poder Judicial de Tucumán. Profesor de Teoría
                    Económica Aplicada (UNT) y docente a cargo de Mercado de
                    Capitales en la Especialización en Finanzas de la Universidad Católica de Salta (UCASAL).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Nicolás */}
            <Card className="hover:shadow-lg transition-shadow md:col-span-2">
              <CardContent className="p-6 flex gap-4">
                <img
                  src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765276157605-0743693d/nicolas.png"
                  alt="Daniel Nicolás Pinto"
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Project Manager
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Daniel Nicolás Pinto
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Licenciado en Economía y Máster en Finanzas de la Universidad de San Andrés (UdeSA),
                    especializado en planeamiento legal y financiero.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Co-fundador y Chief Legal-Fin Officer de Wootic, compañía de
                    servicios legales, financieros y tecnológicos. Co-fundador y
                    director de la compañía de servicios legales y financieros
                    Pinberai.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mensaje de éxito - centrado */}
        {submitSuccess && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full animate-in fade-in zoom-in duration-300">
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      ¡Mensaje Enviado!
                    </h3>
                    <p className="text-gray-600">
                      Gracias por contactarnos. Te responderemos dentro de las 24 horas hábiles.
                    </p>
                  </div>
                  <Button
                    onClick={() => setSubmitSuccess(false)}
                    variant="outline"
                    className="mt-4"
                  >
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}