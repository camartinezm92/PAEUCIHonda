import React, { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  PAERecord, PatientInfo, SelectedNANDA, SelectedNOC, SelectedNIC, 
  TaxonomyNanda, TaxonomyNoc, TaxonomyNic 
} from '../types';
import { 
  SERVICES, NEEDS, EVALUATORS 
} from '../data';
import { useDictionary } from '../contexts/DictionaryContext';
import { ChevronDown, ChevronUp, ChevronRight, Activity, ClipboardList, User, Save, Search } from 'lucide-react';

interface CreatePAEProps {
  records: PAERecord[];
  onSave: (record: PAERecord) => void;
  onCancel: () => void;
}

export default function CreatePAE({ records, onSave, onCancel }: CreatePAEProps) {
  const { taxonomy } = useDictionary();
  const [isSaving, setIsSaving] = useState(false);
  
  // Patient State
  const [patient, setPatient] = useState<PatientInfo>({
    service: '',
    name: '',
    id: '',
    age: '',
    sex: '',
    medicalDiagnosis: ''
  });

  // Needs State
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [otherNeed, setOtherNeed] = useState('');

  // NANDA State
  const [selectedNandas, setSelectedNandas] = useState<SelectedNANDA[]>([]);
  const [nandaSearchQuery, setNandaSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [expandedNandas, setExpandedNandas] = useState<string[]>([]);

  const allNandas = useMemo(() => {
    const all: any[] = [];
    taxonomy.forEach(d => {
      d.classes.forEach(c => {
        c.nandas.forEach(n => {
          all.push({
            ...n,
            domainId: d.id,
            domainName: d.name,
            classId: c.id,
            className: c.name
          });
        });
      });
    });
    return all;
  }, [taxonomy]);

  const filteredNandas = useMemo(() => {
    return allNandas.filter(nanda => {
      const matchesSearch = nanda.code.includes(nandaSearchQuery) || nanda.name.toLowerCase().includes(nandaSearchQuery.toLowerCase());
      const matchesDomain = selectedDomain ? nanda.domainId === selectedDomain : true;
      const matchesClass = selectedClass ? nanda.classId === selectedClass : true;
      return matchesSearch && matchesDomain && matchesClass;
    });
  }, [nandaSearchQuery, selectedDomain, selectedClass, allNandas]);

  const availableClasses = useMemo(() => {
    if (!selectedDomain) return [];
    const domain = taxonomy.find(d => d.id === selectedDomain);
    return domain ? domain.classes : [];
  }, [selectedDomain, taxonomy]);

  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDomain(e.target.value);
    setSelectedClass('');
  };

  const toggleNandaExpansion = (code: string) => {
    setExpandedNandas(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // Footer State
  const [evaluator, setEvaluator] = useState('');
  const [observations, setObservations] = useState('');

  // Handlers
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.target.value;
    
    const existingRecord = records.find(r => r.patient.id === newId);
    if (existingRecord) {
      setPatient({
        ...existingRecord.patient,
        id: newId
      });
    } else {
      setPatient(prev => ({ ...prev, id: newId }));
    }
  };

  const handleNeedToggle = (need: string) => {
    setSelectedNeeds(prev => 
      prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]
    );
  };

  const handleNandaToggle = (nanda: any) => {
    const exists = selectedNandas.find(n => n.code === nanda.code);
    if (exists) {
      setSelectedNandas(selectedNandas.filter(n => n.code !== nanda.code));
      setExpandedNandas(expandedNandas.filter(c => c !== nanda.code));
    } else {
      setSelectedNandas([...selectedNandas, {
        code: nanda.code,
        name: nanda.name,
        selectedCharacteristics: [],
        selectedFactors: [],
        selectedNOCs: []
      }]);
      setExpandedNandas([...expandedNandas, nanda.code]);
    }
  };

  const updateNanda = (code: string, updates: Partial<SelectedNANDA>) => {
    setSelectedNandas(selectedNandas.map(n => n.code === code ? { ...n, ...updates } : n));
  };

  const handleNocToggle = (nandaCode: string, noc: TaxonomyNoc) => {
    const nanda = selectedNandas.find(n => n.code === nandaCode)!;
    const exists = nanda.selectedNOCs.find(n => n.code === noc.code);
    
    let newNocs;
    if (exists) {
      newNocs = nanda.selectedNOCs.filter(n => n.code !== noc.code);
    } else {
      newNocs = [...nanda.selectedNOCs, {
        code: noc.code,
        name: noc.name,
        initialRating: 0,
        selectedNICs: []
      }];
    }
    updateNanda(nandaCode, { selectedNOCs: newNocs });
  };

  const updateNoc = (nandaCode: string, nocCode: string, updates: Partial<SelectedNOC>) => {
    const nanda = selectedNandas.find(n => n.code === nandaCode)!;
    const newNocs = nanda.selectedNOCs.map(n => n.code === nocCode ? { ...n, ...updates } : n);
    updateNanda(nandaCode, { selectedNOCs: newNocs });
  };

  const handleNicToggle = (nandaCode: string, nocCode: string, nic: TaxonomyNic) => {
    const nanda = selectedNandas.find(n => n.code === nandaCode)!;
    const noc = nanda.selectedNOCs.find(n => n.code === nocCode)!;
    const exists = noc.selectedNICs.find(n => n.code === nic.code);

    let newNics;
    if (exists) {
      newNics = noc.selectedNICs.filter(n => n.code !== nic.code);
    } else {
      newNics = [...noc.selectedNICs, {
        code: nic.code,
        name: nic.name,
        activities: [] // Start with no activities selected
      }];
    }
    updateNoc(nandaCode, nocCode, { selectedNICs: newNics });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!patient.name || !patient.id || !evaluator) {
      alert('Por favor complete los datos básicos del paciente y el evaluador.');
      return;
    }

    setIsSaving(true);
    const newRecord: PAERecord = {
      id: uuidv4(),
      date: new Date().toISOString(),
      status: 'INICIADA',
      patient,
      needs: selectedNeeds,
      otherNeed,
      nandas: selectedNandas,
      evaluator,
      observations
    };

    try {
      await onSave(newRecord);
    } catch (error) {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Activity className="text-blue-600" />
          Iniciar PAE Clínico
        </h1>
      </div>

      {/* 1. Datos del Paciente */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-500" /> Datos del Paciente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Servicio</label>
            <select 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={patient.service}
              onChange={e => setPatient({...patient, service: e.target.value as any})}
              required
            >
              <option value="">Seleccione...</option>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Paciente</label>
            <input 
              type="text" 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={patient.name}
              onChange={e => setPatient({...patient, name: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ID Paciente</label>
            <input 
              type="text" 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={patient.id}
              onChange={handleIdChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Edad</label>
            <input 
              type="number" 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={patient.age}
              onChange={e => setPatient({...patient, age: e.target.value ? Number(e.target.value) : ''})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
            <select 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={patient.sex}
              onChange={e => setPatient({...patient, sex: e.target.value as any})}
            >
              <option value="">Seleccione...</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico Médico</label>
            <textarea 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              rows={2}
              value={patient.medicalDiagnosis}
              onChange={e => setPatient({...patient, medicalDiagnosis: e.target.value})}
            />
          </div>
        </div>
      </section>

      {/* 2. Necesidades */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-slate-500" /> Identificación de Necesidades
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NEEDS.map(need => (
            <label key={need} className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={selectedNeeds.includes(need)}
                onChange={() => handleNeedToggle(need)}
              />
              <span className="text-sm text-slate-700">{need}</span>
            </label>
          ))}
          <div className="col-span-1 sm:col-span-2 flex items-center gap-2 mt-2">
            <label className="text-sm text-slate-700 whitespace-nowrap">Otra:</label>
            <input 
              type="text" 
              className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={otherNeed}
              onChange={e => setOtherNeed(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* 3. Selección NANDA */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Selección de Diagnósticos NANDA</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dominio</label>
            <select 
              value={selectedDomain}
              onChange={handleDomainChange}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los dominios</option>
              {taxonomy.map(domain => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Clase</label>
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!selectedDomain}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
            >
              <option value="">Todas las clases</option>
              {availableClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Buscar por código o nombre del diagnóstico NANDA..."
            value={nandaSearchQuery}
            onChange={(e) => setNandaSearchQuery(e.target.value)}
          />
        </div>

        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
          {(() => {
            if (filteredNandas.length === 0) {
              return (
                <div className="p-4 text-center text-sm text-slate-500">
                  No se encontraron diagnósticos que coincidan con la búsqueda.
                </div>
              );
            }

            return filteredNandas.map(nanda => (
              <label key={nanda.code} className="flex items-start gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={!!selectedNandas.find(n => n.code === nanda.code)}
                  onChange={() => handleNandaToggle(nanda)}
                />
                <div>
                  <span className="text-sm text-slate-700">
                    <span className="font-mono font-medium text-slate-500">({nanda.code})</span> {nanda.name}
                  </span>
                  <div className="text-xs text-slate-500 mt-1">
                    {nanda.domainName} &gt; {nanda.className}
                  </div>
                </div>
              </label>
            ));
          })()}
        </div>
      </section>

      {/* 4. NANDA Cards (Cascading) */}
      {selectedNandas.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Plan de Cuidados</h2>
          
          {selectedNandas.map(nanda => {
            const nandaDef = allNandas.find(n => n.code === nanda.code);
            const isExpanded = expandedNandas.includes(nanda.code);

            if (!nandaDef) return null;

            return (
              <div key={nanda.code} className="bg-white rounded-xl shadow-md border-l-4 border-l-blue-600 overflow-hidden">
                <div 
                  className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => toggleNandaExpansion(nanda.code)}
                >
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">
                      NANDA [{nanda.code}] - {nanda.name}
                    </h3>
                    <p className="text-sm text-blue-700 mt-1 italic">{nandaDef.definition}</p>
                  </div>
                  <div>
                    {isExpanded ? <ChevronUp className="w-6 h-6 text-blue-600" /> : <ChevronDown className="w-6 h-6 text-blue-600" />}
                  </div>
                </div>
                
                {isExpanded && (
                <div className="p-5 space-y-6">
                  {/* Características y Factores */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Características definitorias (m/p)</h4>
                      <div className="space-y-1">
                        {nandaDef.characteristics.map((char: string) => (
                          <label key={char} className="flex items-start gap-2 text-sm">
                            <input 
                              type="checkbox" 
                              className="mt-0.5 rounded border-slate-300 text-blue-600"
                              checked={nanda.selectedCharacteristics.includes(char)}
                              onChange={(e) => {
                                const newChars = e.target.checked 
                                  ? [...nanda.selectedCharacteristics, char]
                                  : nanda.selectedCharacteristics.filter(c => c !== char);
                                updateNanda(nanda.code, { selectedCharacteristics: newChars });
                              }}
                            />
                            <span className="text-slate-600">{char}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Factores relacionados (r/c)</h4>
                      <div className="space-y-1">
                        {nandaDef.factors.map((factor: string) => (
                          <label key={factor} className="flex items-start gap-2 text-sm">
                            <input 
                              type="checkbox" 
                              className="mt-0.5 rounded border-slate-300 text-blue-600"
                              checked={nanda.selectedFactors.includes(factor)}
                              onChange={(e) => {
                                const newFactors = e.target.checked 
                                  ? [...nanda.selectedFactors, factor]
                                  : nanda.selectedFactors.filter(f => f !== factor);
                                updateNanda(nanda.code, { selectedFactors: newFactors });
                              }}
                            />
                            <span className="text-slate-600">{factor}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Selección de NOC */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="font-semibold text-slate-800 mb-3">Resultados NOC Aplicables</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {nandaDef.nocs.map((noc: any) => {
                        const isSelected = !!nanda.selectedNOCs.find(n => n.code === noc.code);
                        return (
                          <button
                            key={noc.code}
                            type="button"
                            onClick={() => handleNocToggle(nanda.code, noc)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                              isSelected 
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '} [{noc.code}] {noc.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* NOC Cards */}
                    {nanda.selectedNOCs.length > 0 && (
                      <div className="space-y-4 mt-4">
                        {nanda.selectedNOCs.map(noc => {
                          const nocDef = nandaDef.nocs.find((n: any) => n.code === noc.code);
                          if (!nocDef) return null;
                          
                          return (
                            <div key={noc.code} className="bg-emerald-50/50 rounded-lg border border-emerald-200 p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h5 className="font-bold text-emerald-900">
                                  NOC [{noc.code}] - {noc.name}
                                </h5>
                                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md border border-emerald-100 shadow-sm">
                                  <label className="text-sm font-medium text-slate-700">Calificación Inicial:</label>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(num => (
                                      <button
                                        key={num}
                                        type="button"
                                        onClick={() => updateNoc(nanda.code, noc.code, { initialRating: num })}
                                        className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm transition-colors ${
                                          noc.initialRating === num
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

                              {/* Selección de NIC */}
                              <div className="pl-4 border-l-2 border-emerald-200">
                                <h6 className="text-sm font-semibold text-slate-700 mb-2">Intervenciones NIC Sugeridas</h6>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {nocDef.nics.map((nic: any) => {
                                    const isSelected = !!noc.selectedNICs.find(n => n.code === nic.code);
                                    return (
                                      <button
                                        key={nic.code}
                                        type="button"
                                        onClick={() => handleNicToggle(nanda.code, noc.code, nic)}
                                        className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                                          isSelected 
                                            ? 'bg-amber-100 border-amber-300 text-amber-800' 
                                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                        }`}
                                      >
                                        {isSelected ? '✓ ' : '+ '} [{nic.code}] {nic.name}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* NIC Cards */}
                                {noc.selectedNICs.length > 0 && (
                                  <div className="space-y-3 mt-3">
                                    {noc.selectedNICs.map(nic => (
                                      <div key={nic.code} className="bg-white rounded border border-amber-200 p-3 shadow-sm">
                                        <h6 className="font-bold text-sm text-amber-900 mb-2">
                                          NIC [{nic.code}] - {nic.name}
                                        </h6>
                                        <div className="space-y-1">
                                          {nocDef.nics.find((n: any) => n.code === nic.code)?.activities.map((act: string, i: number) => (
                                            <label key={i} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-amber-50 p-1 rounded">
                                              <input 
                                                type="checkbox" 
                                                className="mt-0.5 rounded border-slate-300 text-amber-600"
                                                checked={nic.activities.includes(act)}
                                                onChange={(e) => {
                                                  const newActivities = e.target.checked 
                                                    ? [...nic.activities, act]
                                                    : nic.activities.filter(a => a !== act);
                                                  
                                                  const newNics = noc.selectedNICs.map(n => 
                                                    n.code === nic.code ? { ...n, activities: newActivities } : n
                                                  );
                                                  updateNoc(nanda.code, noc.code, { selectedNICs: newNics });
                                                }}
                                              />
                                              <span className="text-slate-600">{act}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Cierre del Formulario */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Realizó (Enfermero/a)</label>
            <select 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={evaluator}
              onChange={e => setEvaluator(e.target.value)}
              required
            >
              <option value="">Seleccione profesional...</option>
              {EVALUATORS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <textarea 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              rows={3}
              value={observations}
              onChange={e => setObservations(e.target.value)}
            />
          </div>
        </div>

          <div className="mt-8 flex justify-end gap-4">
            <button 
              type="button" 
              onClick={onCancel}
              disabled={isSaving}
              className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Iniciar PAE
                </>
              )}
            </button>
          </div>
      </section>
    </form>
  );
}
