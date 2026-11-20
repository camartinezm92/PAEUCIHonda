import React, { useState } from 'react';
import { PAERecord } from '../types';
import { FileText, Download, ArrowLeft, CheckCircle, Clock, CloudUpload, ExternalLink, RefreshCw } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface ViewPAEProps {
  record: PAERecord;
  onBack: () => void;
  onUploadToDrive?: (record: PAERecord) => Promise<void>;
}

export default function ViewPAE({ record, onBack, onUploadToDrive }: ViewPAEProps) {
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);

  const handleDownloadPDF = () => {
    const element = document.getElementById('pae-pdf-content');
    if (!element) return;
    
    const filename = `PAE_${record.patient.name.replace(/\s+/g, '_')}_${new Date(record.date).toISOString().split('T')[0]}.pdf`;
    
    const opt = {
      margin:       10,
      filename:     filename,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak:    { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleDriveUpload = async () => {
    if (!onUploadToDrive || isUploadingDrive) return;
    setIsUploadingDrive(true);
    try {
      await onUploadToDrive(record);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 print:pb-0 print:max-w-none">
      <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        
        {record.status === 'CERRADA' && (
          <div className="flex flex-wrap items-center gap-2">
            {record.driveFileUrl && (
              <a
                href={record.driveFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ver PDF en Drive
              </a>
            )}
            {onUploadToDrive && (
              <button
                onClick={handleDriveUpload}
                disabled={isUploadingDrive}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isUploadingDrive ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Subiendo a Drive...
                  </>
                ) : record.driveFileUrl ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Actualizar en Drive
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4" />
                    Guardar en Drive
                  </>
                )}
              </button>
            )}
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
          </div>
        )}
      </div>

      <div id="pae-pdf-content" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8 print:border-none print:shadow-none print:p-0 text-[13px]">
        {/* Header */}
        <div className="border-b border-slate-200 pb-6 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600" />
              Proceso de Atención de Enfermería (PAE)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Inicio (Antes): {new Date(record.date).toLocaleString()}
              {record.closedDate && (
                <> &nbsp;|&nbsp; Cierre (Después): {new Date(record.closedDate).toLocaleString()}</>
              )}
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
          
          {[...record.nandas].sort((a, b) => parseInt(a.code.match(/\d+/)?.[0] || '0', 10) - parseInt(b.code.match(/\d+/)?.[0] || '0', 10)).map(nanda => (
            <div key={nanda.code} className="border border-slate-200 rounded-lg overflow-hidden mb-6">
              <div className="bg-slate-100 p-2 border-b border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">NANDA [{nanda.code}] - {nanda.name}</h4>
              </div>
              <div className="p-3 space-y-3">
                <div className="grid md:grid-cols-2 gap-4 text-[12px] break-inside-avoid">
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Características Definitorias (m/p):</p>
                    <ul className="list-disc list-inside text-slate-600">
                      {[...nanda.selectedCharacteristics].sort().map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Factores Relacionados (r/c):</p>
                    <ul className="list-disc list-inside text-slate-600">
                      {[...nanda.selectedFactors].sort().map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                </div>

                {nanda.selectedNOCs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="font-semibold text-slate-800 mb-2 text-sm">Resultados (NOC) e Intervenciones (NIC)</p>
                    <div className="space-y-3">
                      {[...nanda.selectedNOCs].sort((a, b) => parseInt(a.code.match(/\d+/)?.[0] || '0', 10) - parseInt(b.code.match(/\d+/)?.[0] || '0', 10)).map(noc => (
                        <div key={noc.code} className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 break-inside-avoid">
                          <div className="flex justify-between items-start mb-1">
                            <h5 className="font-semibold text-emerald-900 text-sm">NOC [{noc.code}] - {noc.name}</h5>
                            <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                              <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-800">
                                Inicial (Antes): {noc.initialRating}
                              </span>
                              {noc.finalRating !== undefined && noc.finalRating !== null && (
                                <>
                                  <span className="bg-emerald-600 px-1.5 py-0.5 rounded text-white">
                                    Final (Después): {noc.finalRating}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded border ${
                                    noc.finalRating - noc.initialRating > 0
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : noc.finalRating - noc.initialRating < 0
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    Cambio: {noc.finalRating - noc.initialRating > 0 ? `+${noc.finalRating - noc.initialRating}` : noc.finalRating - noc.initialRating}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {noc.selectedNICs.length > 0 && (
                            <div className="mt-2 pl-2 border-l-2 border-emerald-200 space-y-1">
                              {[...noc.selectedNICs].sort((a, b) => parseInt(a.code.match(/\d+/)?.[0] || '0', 10) - parseInt(b.code.match(/\d+/)?.[0] || '0', 10)).map(nic => (
                                <div key={nic.code} className="bg-white p-1.5 rounded border border-amber-100">
                                  <h6 className="font-semibold text-amber-900 text-[12px]">NIC [{nic.code}] - {nic.name}</h6>
                                  <ul className="list-disc list-inside text-[11px] text-slate-600 mt-0.5">
                                    {[...nic.activities].sort().map((act, i) => <li key={i}>{act}</li>)}
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

        {/* Footer Info: Before vs After Comparison */}
        <div className="border-t border-slate-200 pt-6 grid md:grid-cols-2 gap-4 break-inside-avoid">
          <div className="bg-blue-50/60 p-4 rounded-lg border border-blue-100 space-y-2">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Registro Inicial (Antes)</h4>
            <p className="text-xs text-slate-600">
              <span className="font-semibold">Fecha/Hora:</span> {new Date(record.date).toLocaleString()}
            </p>
            <p className="text-xs text-slate-700">
              <span className="font-semibold">Evaluador inicial:</span> {record.evaluator || 'No registrado'}
            </p>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Observaciones Iniciales</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{record.observations || 'Ninguna'}</p>
            </div>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-lg border border-emerald-100 space-y-2">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Evaluación y Cierre (Después)</h4>
            <p className="text-xs text-slate-600">
              <span className="font-semibold">Fecha/Hora:</span> {record.closedDate ? new Date(record.closedDate).toLocaleString() : (record.status === 'CERRADA' ? 'No registrada' : 'Pendiente')}
            </p>
            <p className="text-xs text-slate-700">
              <span className="font-semibold">Evaluador de cierre:</span> {record.closingEvaluator || (record.status === 'CERRADA' ? record.evaluator : 'Pendiente')}
            </p>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Observaciones Finales</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {record.status === 'CERRADA'
                  ? (record.finalObservations ?? 'Ninguna')
                  : 'Pendiente por evaluar y cerrar'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
