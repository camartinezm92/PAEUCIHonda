import React from 'react';
import { PAERecord, PatientInfo } from '../types';
import { User, Activity, Clock, CheckCircle, Eye, Trash2, Edit, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface PatientDetailProps {
  patient: PatientInfo;
  records: PAERecord[];
  onBack: () => void;
  onViewPAE: (id: string) => void;
  onClosePAE: (id: string) => void;
  onEditClosedPAE: (id: string) => void;
  onDeletePAE: (id: string) => void;
  onDeletePatient: (patientId: string) => void;
}

export default function PatientDetail({ 
  patient, 
  records, 
  onBack, 
  onViewPAE, 
  onClosePAE, 
  onEditClosedPAE,
  onDeletePAE,
  onDeletePatient
}: PatientDetailProps) {
  
  // Sort records by date (newest first)
  const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDownloadAllPDF = () => {
    const element = document.getElementById('patient-history-content');
    if (!element) return;
    
    const filename = `Historial_Completo_${patient.name.replace(/\s+/g, '_')}.pdf`;
    
    const opt = {
      margin:       10,
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={onBack}
            className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
          >
            &larr; Volver al Historial
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownloadAllPDF}
              disabled={sortedRecords.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Descargar Historial (PDF)
            </button>
            <button 
              onClick={() => onDeletePatient(patient.id)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Paciente
            </button>
          </div>
        </div>
      </div>

      <div id="patient-history-content" className="space-y-6">
        {/* Patient Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
            <p className="text-slate-500">ID: {patient.id}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Edad</p>
            <p className="font-medium text-slate-800">{patient.age || 'No especificada'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sexo</p>
            <p className="font-medium text-slate-800">{patient.sex || 'No especificado'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Servicio Actual</p>
            <p className="font-medium text-slate-800">{patient.service}</p>
          </div>
          <div className="col-span-2 md:col-span-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Diagnóstico Médico</p>
            <p className="font-medium text-slate-800">{patient.medicalDiagnosis}</p>
          </div>
        </div>
      </div>

      {/* PAE List */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Registros PAE ({records.length})
        </h2>
        
        <div className="space-y-4">
          {sortedRecords.map(record => (
            <div key={record.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    record.status === 'INICIADA' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {record.status === 'INICIADA' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {record.status}
                  </span>
                  <span className="text-sm text-slate-500 font-medium">
                    {new Date(record.date).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Evaluador:</span> {record.evaluator}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  <span className="font-semibold">Diagnósticos NANDA:</span> {record.nandas.length} seleccionados
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => onViewPAE(record.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  <Eye className="w-4 h-4" /> Ver
                </button>
                
                {record.status === 'INICIADA' ? (
                  <button 
                    onClick={() => onClosePAE(record.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Evaluar / Cerrar
                  </button>
                ) : (
                  <button 
                    onClick={() => onEditClosedPAE(record.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" /> Editar
                  </button>
                )}

                <button 
                  onClick={() => onDeletePAE(record.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Hidden container for PDF generation */}
      <div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black font-sans text-[12px]">
        <div id="print-all-records" className="w-full">
          {sortedRecords.map((record, index) => (
            <div key={`print-${record.id}`} className={`p-8 ${index > 0 ? 'break-before-page' : ''}`}>
              <div className="border-b border-slate-200 pb-4 mb-4">
                <h1 className="text-2xl font-bold text-slate-800">Proceso de Atención de Enfermería (PAE)</h1>
                <p className="text-sm text-slate-500">Fecha: {new Date(record.date).toLocaleString()} | Estado: {record.status}</p>
              </div>
              
              {/* Patient Info */}
              <div className="grid grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div><p className="text-xs font-bold uppercase text-slate-500">Paciente</p><p className="font-medium">{record.patient.name}</p></div>
                <div><p className="text-xs font-bold uppercase text-slate-500">ID</p><p className="font-medium">{record.patient.id}</p></div>
                <div><p className="text-xs font-bold uppercase text-slate-500">Edad/Sexo</p><p className="font-medium">{record.patient.age} / {record.patient.sex}</p></div>
                <div><p className="text-xs font-bold uppercase text-slate-500">Servicio</p><p className="font-medium">{record.patient.service}</p></div>
                <div className="col-span-4"><p className="text-xs font-bold uppercase text-slate-500">Diagnóstico Médico</p><p className="font-medium">{record.patient.medicalDiagnosis}</p></div>
              </div>
              
              {/* Needs */}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2 text-slate-800">Necesidades</h3>
                <p className="text-sm text-slate-700">{record.needs.join(', ')} {record.otherNeed ? `- ${record.otherNeed}` : ''}</p>
              </div>
              
              {/* NANDAs */}
              <div className="space-y-3">
                {record.nandas.map(nanda => (
                  <div key={nanda.code} className="border border-slate-200 rounded-lg p-3 mb-3">
                    <h4 className="font-bold text-blue-900 mb-1 text-sm">NANDA [{nanda.code}] - {nanda.name}</h4>
                    <div className="grid grid-cols-2 gap-4 text-[11px] mb-3 break-inside-avoid">
                      <div><p className="font-bold text-slate-700">Características (m/p):</p><ul className="list-disc pl-4 text-slate-600">{nanda.selectedCharacteristics.map((c,i)=><li key={i}>{c}</li>)}</ul></div>
                      <div><p className="font-bold text-slate-700">Factores (r/c):</p><ul className="list-disc pl-4 text-slate-600">{nanda.selectedFactors.map((f,i)=><li key={i}>{f}</li>)}</ul></div>
                    </div>
                    {nanda.selectedNOCs.map(noc => (
                      <div key={noc.code} className="bg-emerald-50 p-2 rounded border border-emerald-100 mb-2 break-inside-avoid">
                        <div className="flex justify-between font-bold text-emerald-900 mb-1 text-[12px]">
                          <span>NOC [{noc.code}] - {noc.name}</span>
                          <span className="text-[11px]">Inicial: {noc.initialRating} {noc.finalRating ? `| Final: ${noc.finalRating}` : ''}</span>
                        </div>
                        {noc.selectedNICs.map(nic => (
                          <div key={nic.code} className="bg-white p-1.5 rounded border border-amber-100 mb-1">
                            <p className="font-bold text-amber-900 text-[11px]">NIC [{nic.code}] - {nic.name}</p>
                            <ul className="list-disc pl-4 text-[10px] mt-0.5 text-slate-600">{nic.activities.map((a,i)=><li key={i}>{a}</li>)}</ul>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-200 text-sm">
                <p><strong>Evaluador:</strong> {record.evaluator}</p>
                <p><strong>Observaciones:</strong> {record.observations || 'Ninguna'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
