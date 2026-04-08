import React, { useState } from 'react';
import { PAERecord, SelectedNANDA } from '../types';
import { CheckCircle, XCircle, Save } from 'lucide-react';

interface ClosePAEProps {
  record: PAERecord;
  onSave: (record: PAERecord) => void;
  onCancel: () => void;
}

export default function ClosePAE({ record, onSave, onCancel }: ClosePAEProps) {
  // We need to keep track of the final ratings for all NOCs in this record
  const [nandas, setNandas] = useState<SelectedNANDA[]>(record.nandas);
  const [observations, setObservations] = useState(record.observations || '');
  const [isSaving, setIsSaving] = useState(false);

  const updateFinalRating = (nandaCode: string, nocCode: string, rating: number) => {
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

    // Check if all NOCs have a final rating
    let allRated = true;
    nandas.forEach(nanda => {
      nanda.selectedNOCs.forEach(noc => {
        if (!noc.finalRating) allRated = false;
      });
    });

    if (!allRated) {
      alert('Por favor asigne una calificación final a todos los NOCs seleccionados.');
      return;
    }

    setIsSaving(true);
    const updatedRecord: PAERecord = {
      ...record,
      nandas,
      observations,
      status: 'CERRADA'
    };

    try {
      await onSave(updatedRecord);
    } catch (error) {
      setIsSaving(false);
    }
  };

  // Only show NANDAs that have selected NOCs
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

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700">
            <p>Por favor, evalúe el estado final del paciente para cada uno de los resultados (NOC) que se plantearon al inicio del PAE.</p>
          </div>

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
                          Calificación Inicial: <span className="font-bold">{noc.initialRating}</span>
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

          <div className="pt-6 border-t border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">Observaciones Finales</label>
            <textarea 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
              rows={4}
              placeholder="Ingrese observaciones sobre la evolución y cierre del proceso..."
              value={observations}
              onChange={e => setObservations(e.target.value)}
            />
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
