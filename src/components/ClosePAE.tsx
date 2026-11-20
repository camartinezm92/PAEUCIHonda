import React, { useState } from 'react';
import { PAERecord, SelectedNANDA } from '../types';
import { EVALUATORS } from '../data';
import { CheckCircle, XCircle, Save, Clock, User } from 'lucide-react';

interface ClosePAEProps {
  record: PAERecord;
  onSave: (record: PAERecord) => void;
  onCancel: () => void;
}

export default function ClosePAE({ record, onSave, onCancel }: ClosePAEProps) {
  const [nandas, setNandas] = useState<SelectedNANDA[]>(record.nandas);
  const [finalObservations, setFinalObservations] = useState(record.finalObservations ?? '');
  const [closingEvaluator, setClosingEvaluator] = useState(record.closingEvaluator || record.evaluator || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const updateFinalRating = (nandaCode: string, nocCode: string, rating: number) => {
    setValidationError(null);
    setNandas(nandas.map(nanda => {
      if (nanda.code === nandaCode) {
        return {
          ...nanda,
          selectedNOCs: nanda.selectedNOCs.map(noc => {
            if (noc.code === nocCode) {
              return { ...noc, finalRating: rating };
            }
            return noc;
          })
        };
      }
      return nanda;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    let allRated = true;
    nandas.forEach(nanda => {
      nanda.selectedNOCs.forEach(noc => {
        if (!noc.finalRating) allRated = false;
      });
    });

    if (!allRated) {
      setValidationError('Por favor asigne una calificación final a todos los NOCs seleccionados.');
      return;
    }

    if (!closingEvaluator) {
      setValidationError('Por favor seleccione el profesional que realiza el cierre.');
      return;
    }

    setIsSaving(true);

    const colombiaClosedISO = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()).replace(' ', 'T');

    const updatedRecord: PAERecord = {
      ...record,
      nandas,
      // Preserve original initial observations untouched
      observations: record.observations || '',
      finalObservations,
      closedDate: record.status === 'CERRADA' && record.closedDate ? record.closedDate : colombiaClosedISO,
      closingEvaluator,
      status: 'CERRADA'
    };

    try {
      await onSave(updatedRecord);
    } catch (error) {
      setIsSaving(false);
    }
  };

  const nandasWithNocs = nandas.filter(n => n.selectedNOCs.length > 0);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle />
            Cierre y Evaluación de PAE
          </h1>
          <p className="mt-2 text-blue-100">
            Paciente: <span className="font-semibold">{record.patient.name}</span> (ID: {record.patient.id})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Read-only Initial Context (Antes) */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-blue-900 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Registro Inicial (Antes) — Solo Lectura
              </span>
              <span className="text-blue-700 normal-case font-medium">
                Inicio: {new Date(record.date).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Evaluador inicial:</span> {record.evaluator || 'No registrado'}
            </p>
            <div className="bg-white p-3 rounded-lg border border-blue-100 text-sm text-slate-700">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Observaciones Iniciales:</p>
              <p className="whitespace-pre-wrap">{record.observations || 'Sin observaciones iniciales registradas.'}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700">
            <p>Evalúe el estado final del paciente para cada uno de los resultados (NOC) planteados al inicio.</p>
          </div>

          {validationError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {validationError}
            </div>
          )}

          <div className="space-y-6">
            {nandasWithNocs.map(nanda => (
              <div key={nanda.code} className="border border-slate-200 rounded-lg overflow-hidden break-inside-avoid mb-6">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800">
                    NANDA [{nanda.code}] - {nanda.name}
                  </h3>
                </div>
                
                <div className="p-4 space-y-4">
                  {nanda.selectedNOCs.map(noc => (
                    <div key={noc.code} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                      <div>
                        <h4 className="font-semibold text-emerald-900">
                          NOC [{noc.code}] - {noc.name}
                        </h4>
                        <p className="text-sm text-emerald-700 mt-1">
                          Calificación Inicial (Antes): <span className="font-bold">{noc.initialRating}</span>
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                          Calificación Final:
                        </label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(num => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => updateFinalRating(nanda.code, noc.code, num)}
                              className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm transition-colors ${
                                noc.finalRating === num
                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50'
                              } border`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-500" />
                Evaluador de Cierre (Después)
              </label>
              <select
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border"
                value={closingEvaluator}
                onChange={e => setClosingEvaluator(e.target.value)}
                required
              >
                <option value="">Seleccione profesional...</option>
                {EVALUATORS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Observaciones Finales (Después)</label>
              <textarea 
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                rows={4}
                placeholder="Ingrese la evolución y observaciones finales al cierre del proceso (el comentario inicial se conservará intacto)..."
                value={finalObservations}
                onChange={e => setFinalObservations(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end gap-4">
            <button 
              type="button" 
              onClick={onCancel}
              disabled={isSaving}
              className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar y Cerrar PAE
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
