import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Case } from '@/entities/Case';
import { Briefcase, ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateCase() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    caseNumber: '',
    court: '',
    plaintiff: '',
    defendant: '',
    status: 'active',
    startDate: '',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const user = await User.me();
    
    const newCase = await Case.create({
      ...formData,
      userId: user.id,
      documents: []
    });

    navigate(createPageUrl(`CaseDetail?caseId=${newCase.id}`));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-blue-600" />
            Nuevo Juicio
          </h1>
          <p className="text-gray-600 mt-1">Registra un nuevo caso legal</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Juicio</CardTitle>
            <CardDescription>Completa los datos del caso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título del Juicio *</Label>
              <Input
                id="title"
                placeholder="Ej: Juicio Laboral - García vs. Empresa XYZ"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
            </div>

            {/* Case Number */}
            <div className="space-y-2">
              <Label htmlFor="caseNumber">Número de Expediente</Label>
              <Input
                id="caseNumber"
                placeholder="Ej: EXP-2024-001234"
                value={formData.caseNumber}
                onChange={(e) => handleChange('caseNumber', e.target.value)}
              />
            </div>

            {/* Court */}
            <div className="space-y-2">
              <Label htmlFor="court">Juzgado/Tribunal</Label>
              <Input
                id="court"
                placeholder="Ej: Juzgado Nacional del Trabajo N° 5"
                value={formData.court}
                onChange={(e) => handleChange('court', e.target.value)}
              />
            </div>

            {/* Plaintiff and Defendant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plaintiff">Demandante</Label>
                <Input
                  id="plaintiff"
                  placeholder="Nombre del demandante"
                  value={formData.plaintiff}
                  onChange={(e) => handleChange('plaintiff', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defendant">Demandado</Label>
                <Input
                  id="defendant"
                  placeholder="Nombre del demandado"
                  value={formData.defendant}
                  onChange={(e) => handleChange('defendant', e.target.value)}
                />
              </div>
            </div>

            {/* Status and Start Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                    <SelectItem value="archived">Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales sobre el caso..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !formData.title}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Crear Juicio'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}