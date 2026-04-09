import React from 'react';
import { PAERecord } from '../types';
import { FileText, Activity } from 'lucide-react';
import { getPatientGlobalEmoji } from '../utils/emojiUtils';

interface DashboardProps {
  records: PAERecord[];
  onSelectPatient: (patientId: string) => void;
}

export default function Dashboard({ records, onSelectPatient }: DashboardProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <FileText className="w-16 h-16 mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700">No hay pacientes registrados</h2>
        <p className="mt-2 text-sm">Inicia un nuevo Proceso de Atención de Enfermería para comenzar.</p>
      </div>
    );
  }

  // Group records by patient ID
  const patientsMap = new Map<string, { info: PAERecord['patient'], records: PAERecord[] }>();
  
  records.forEach(record => {
    const pId = record.patient.id;
    if (!patientsMap.has(pId)) {
      patientsMap.set(pId, { info: record.patient, records: [] });
    }
    patientsMap.get(pId)!.records.push(record);
  });

  const patientsList = Array.from(patientsMap.values()).sort((a, b) => 
    a.info.name.localeCompare(b.info.name)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Fichas de Pacientes</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {patientsList.map((patientData) => {
          const { info, records: patientRecords } = patientData;
          const activePAEs = patientRecords.filter(r => r.status === 'INICIADA').length;

          return (
            <div 
              key={info.id} 
              onClick={() => onSelectPatient(info.id)}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="p-5 flex-grow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-3xl group-hover:bg-blue-100 transition-colors shadow-sm border border-blue-100">
                    {getPatientGlobalEmoji(patientRecords)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">{info.name}</h3>
                    <p className="text-sm text-slate-500">ID: {info.id}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  <p><span className="font-medium text-slate-700">Servicio:</span> {info.service}</p>
                  <p><span className="font-medium text-slate-700">Diagnóstico:</span> <span className="line-clamp-1">{info.medicalDiagnosis}</span></p>
                </div>
              </div>
              
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <Activity className="w-4 h-4" />
                  {patientRecords.length} PAE{patientRecords.length !== 1 ? 's' : ''}
                </div>
                {activePAEs > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    {activePAEs} en curso
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
