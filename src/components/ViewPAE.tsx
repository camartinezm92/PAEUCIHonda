import React from 'react';
import { PAERecord } from '../types';
import { FileText, Download, ArrowLeft, CheckCircle, Clock } from 'lucide-react';

interface ViewPAEProps {
  record: PAERecord;
  onBack: () => void;
}

export default function ViewPAE({ record, onBack }: ViewPAEProps) {
  const handleDownloadPDF = () => {
    const originalTitle = document.title;
    document.title = `PAE_${record.patient.name.replace(/\s+/g, '_')}_${new Date(record.date).toISOString().split('T')[0]}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 print:pb-0 print:max-w-none">
      <div className="flex justify-between items-center print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        
        {record.status === 'CERRADA' && (
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8 print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="border-b border-slate-200 pb-6 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600" />
              Proceso de Atención de Enfermería (PAE)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Fecha de inicio: {new Date(record.date).toLocaleString()}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
            record.status === 'INICIADA' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {record.status === 'INICIADA' ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {record.status}
          </span>
        </div>

        {/* Patient Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Paciente</p>
            <p className="font-medium text-slate-800">{record.patient.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">ID</p>
            <p className="font-medium text-slate-800">{record.patient.id}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Edad / Sexo</p>
            <p className="font-medium text-slate-800">{record.patient.age} / {record.patient.sex}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Servicio</p>
            <p className="font-medium text-slate-800">{record.patient.service}</p>
          </div>
          <div className="col-span-2 md:col-span-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Diagnóstico Médico</p>
            <p className="font-medium text-slate-800">{record.patient.medicalDiagnosis}</p>
          </div>
        </div>

        {/* Needs */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Necesidades Identificadas</h3>
          <div className="flex flex-wrap gap-2">
            {record.needs.map(need => (
              <span key={need} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-100">
                {need}
              </span>
            ))}
            {record.otherNeed && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-100">
                Otra: {record.otherNeed}
              </span>
            )}
          </div>
        </div>

        {/* NANDAs */}
        <div className="space-y-6 mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Diagnósticos y Plan de Cuidados</h3>
          
          {record.nandas.map(nanda => (
            <div key={nanda.code} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-3 border-b border-slate-200">
                <h4 className="font-bold text-slate-800">NANDA [{nanda.code}] - {nanda.name}</h4>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Características Definitorias (m/p):</p>
                    <ul className="list-disc list-inside text-slate-600">
                      {nanda.selectedCharacteristics.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Factores Relacionados (r/c):</p>
                    <ul className="list-disc list-inside text-slate-600">
                      {nanda.selectedFactors.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                </div>

                {nanda.selectedNOCs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="font-semibold text-slate-800 mb-3">Resultados (NOC) e Intervenciones (NIC)</p>
                    <div className="space-y-3">
                      {nanda.selectedNOCs.map(noc => (
                        <div key={noc.code} className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold text-emerald-900">NOC [{noc.code}] - {noc.name}</h5>
                            <div className="flex gap-3 text-sm font-medium">
                              <span className="bg-white px-2 py-1 rounded border border-emerald-200 text-emerald-800">
                                Inicial: {noc.initialRating}
                              </span>
                              {noc.finalRating && (
                                <span className="bg-emerald-600 px-2 py-1 rounded text-white">
                                  Final: {noc.finalRating}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {noc.selectedNICs.length > 0 && (
                            <div className="mt-3 pl-3 border-l-2 border-emerald-200 space-y-2">
                              {noc.selectedNICs.map(nic => (
                                <div key={nic.code} className="bg-white p-2 rounded border border-amber-100">
                                  <h6 className="font-semibold text-amber-900 text-sm">NIC [{nic.code}] - {nic.name}</h6>
                                  <ul className="list-disc list-inside text-xs text-slate-600 mt-1">
                                    {nic.activities.map((act, i) => <li key={i}>{act}</li>)}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="border-t border-slate-200 pt-6 grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Evaluador (Enfermero/a)</p>
            <p className="font-medium text-slate-800">{record.evaluator}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Observaciones</p>
            <p className="text-sm text-slate-700">{record.observations || 'Ninguna'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
