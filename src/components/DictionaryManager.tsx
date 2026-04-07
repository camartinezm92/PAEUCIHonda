import React, { useState } from 'react';
import { useDictionary } from '../contexts/DictionaryContext';
import { TaxonomyDomain, TaxonomyClass, TaxonomyNanda, TaxonomyNoc, TaxonomyNic } from '../types';
import { ArrowLeft, Plus, Save, AlertCircle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type FormType = 'DOMAIN' | 'CLASS' | 'NANDA' | 'NOC' | 'NIC' | null;

const formLabels: Record<NonNullable<FormType>, string> = {
  DOMAIN: 'Dominio',
  CLASS: 'Clase',
  NANDA: 'NANDA',
  NOC: 'NOC',
  NIC: 'NIC'
};

interface FormItem {
  id: string;
  numberInput: string;
  infoInput: string;
  definitionInput: string;
  characteristicsInput: string;
  factorsInput: string;
  activitiesInput: string;
}

const createNewItem = (): FormItem => ({
  id: uuidv4(),
  numberInput: '',
  infoInput: '',
  definitionInput: '',
  characteristicsInput: '',
  factorsInput: '',
  activitiesInput: ''
});

interface DictionaryManagerProps {
  onBack: () => void;
}

export default function DictionaryManager({ onBack }: DictionaryManagerProps) {
  const { taxonomy, loading, error: contextError, updateTaxonomy } = useDictionary();
  const [activeForm, setActiveForm] = useState<FormType>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedNanda, setSelectedNanda] = useState<string>('');
  const [selectedNoc, setSelectedNoc] = useState<string>('');

  const [items, setItems] = useState<FormItem[]>([createNewItem()]);

  const resetForm = () => {
    setItems([createNewItem()]);
    setError(null);
    setSuccess(null);
  };

  const handleFormChange = (form: FormType) => {
    setActiveForm(form);
    resetForm();
    setSelectedDomain('');
    setSelectedClass('');
    setSelectedNanda('');
    setSelectedNoc('');
  };

  const updateItem = (id: string, field: keyof FormItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const addItem = () => {
    setItems([...items, createNewItem()]);
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccess(null);
      
      let newTaxonomy = JSON.parse(JSON.stringify(taxonomy)) as TaxonomyDomain[];

      for (const item of items) {
        const { numberInput, infoInput, definitionInput, characteristicsInput, factorsInput, activitiesInput } = item;

        if (activeForm === 'DOMAIN') {
          if (!numberInput || !infoInput) throw new Error('Complete todos los campos en todos los elementos');
          if (newTaxonomy.some(d => d.id === numberInput)) throw new Error(`El número de dominio ${numberInput} ya existe`);
          
          newTaxonomy.push({
            id: numberInput,
            name: `DOMINIO ${numberInput}: ${infoInput.toUpperCase()}`,
            definition: definitionInput,
            classes: []
          });
        } 
        else if (activeForm === 'CLASS') {
          if (!selectedDomain || !numberInput || !infoInput) throw new Error('Complete todos los campos en todos los elementos');
          const domainIndex = newTaxonomy.findIndex(d => d.id === selectedDomain);
          if (domainIndex === -1) throw new Error('Dominio no encontrado');
          
          if (newTaxonomy[domainIndex].classes.some(c => c.id === numberInput)) {
            throw new Error(`El número de clase ${numberInput} ya existe en este dominio`);
          }

          newTaxonomy[domainIndex].classes.push({
            id: numberInput,
            name: `Clase ${numberInput}. ${infoInput}`,
            definition: definitionInput,
            nandas: []
          });
        }
        else if (activeForm === 'NANDA') {
          if (!selectedDomain || !selectedClass || !numberInput || !infoInput) throw new Error('Complete todos los campos básicos en todos los elementos');
          const domainIndex = newTaxonomy.findIndex(d => d.id === selectedDomain);
          const classIndex = newTaxonomy[domainIndex].classes.findIndex(c => c.id === selectedClass);
          
          if (newTaxonomy[domainIndex].classes[classIndex].nandas.some(n => n.code === numberInput)) {
            throw new Error(`El código NANDA ${numberInput} ya existe en esta clase`);
          }

          newTaxonomy[domainIndex].classes[classIndex].nandas.push({
            code: numberInput,
            name: `(${numberInput}) - ${infoInput}`,
            definition: definitionInput || infoInput,
            characteristics: characteristicsInput.split('\n').filter(s => s.trim()),
            factors: factorsInput.split('\n').filter(s => s.trim()),
            nocs: []
          });
        }
        else if (activeForm === 'NOC') {
          if (!selectedDomain || !selectedClass || !selectedNanda || !numberInput || !infoInput) throw new Error('Complete todos los campos en todos los elementos');
          const domainIndex = newTaxonomy.findIndex(d => d.id === selectedDomain);
          const classIndex = newTaxonomy[domainIndex].classes.findIndex(c => c.id === selectedClass);
          const nandaIndex = newTaxonomy[domainIndex].classes[classIndex].nandas.findIndex(n => n.code === selectedNanda);
          
          if (newTaxonomy[domainIndex].classes[classIndex].nandas[nandaIndex].nocs.some(n => n.code === numberInput)) {
            throw new Error(`El código NOC ${numberInput} ya existe en este NANDA`);
          }

          newTaxonomy[domainIndex].classes[classIndex].nandas[nandaIndex].nocs.push({
            code: numberInput,
            name: infoInput,
            definition: definitionInput,
            nics: []
          });
        }
        else if (activeForm === 'NIC') {
          if (!selectedDomain || !selectedClass || !selectedNanda || !selectedNoc || !numberInput || !infoInput) throw new Error('Complete todos los campos en todos los elementos');
          const domainIndex = newTaxonomy.findIndex(d => d.id === selectedDomain);
          const classIndex = newTaxonomy[domainIndex].classes.findIndex(c => c.id === selectedClass);
          const nandaIndex = newTaxonomy[domainIndex].classes[classIndex].nandas.findIndex(n => n.code === selectedNanda);
          const nocIndex = newTaxonomy[domainIndex].classes[classIndex].nandas[nandaIndex].nocs.findIndex(n => n.code === selectedNoc);
          
          if (newTaxonomy[domainIndex].classes[classIndex].nandas[nandaIndex].nocs[nocIndex].nics.some(n => n.code === numberInput)) {
            throw new Error(`El código NIC ${numberInput} ya existe en este NOC`);
          }

          newTaxonomy[domainIndex].classes[classIndex].nandas[nandaIndex].nocs[nocIndex].nics.push({
            code: numberInput,
            name: infoInput,
            definition: definitionInput,
            activities: activitiesInput.split('\n').filter(s => s.trim())
          });
        }
      }

      await updateTaxonomy(newTaxonomy);
      setSuccess(`Guardado exitosamente en la nube (${items.length} elemento${items.length > 1 ? 's' : ''})`);
      resetForm();
      
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando diccionario desde la nube...</div>;
  }

  if (contextError) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5" /> Error de Conexión
          </h2>
          <p className="mb-4">{contextError}</p>
          <p className="text-sm">
            Es posible que las reglas de seguridad de Firestore no estén configuradas para permitir lectura/escritura en la colección app_settings.
          </p>
          <button 
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-medium transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const currentDomain = taxonomy.find(d => d.id === selectedDomain);
  const currentClass = currentDomain?.classes.find(c => c.id === selectedClass);
  const currentNanda = currentClass?.nandas.find(n => n.code === selectedNanda);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-slate-600 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Agregar Información al Diccionario</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['DOMAIN', 'CLASS', 'NANDA', 'NOC', 'NIC'] as FormType[]).map((type) => (
          <button
            key={type}
            onClick={() => handleFormChange(type)}
            className={`p-4 rounded-xl border text-sm font-medium transition-all ${
              activeForm === type 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            Agregar {formLabels[type!]}
          </button>
        ))}
      </div>

      {activeForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-lg font-bold text-slate-800">
            Nuevo {formLabels[activeForm]}
          </h2>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> {error}
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> {success}
            </div>
          )}

          <div className="space-y-4">
            {/* Cascading Selects */}
            {['CLASS', 'NANDA', 'NOC', 'NIC'].includes(activeForm) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Dominio</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={selectedDomain}
                  onChange={(e) => { setSelectedDomain(e.target.value); setSelectedClass(''); setSelectedNanda(''); setSelectedNoc(''); }}
                >
                  <option value="">Seleccione...</option>
                  {taxonomy.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {['NANDA', 'NOC', 'NIC'].includes(activeForm) && selectedDomain && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Clase</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setSelectedNanda(''); setSelectedNoc(''); }}
                >
                  <option value="">Seleccione...</option>
                  {currentDomain?.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {['NOC', 'NIC'].includes(activeForm) && selectedClass && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar NANDA</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={selectedNanda}
                  onChange={(e) => { setSelectedNanda(e.target.value); setSelectedNoc(''); }}
                >
                  <option value="">Seleccione...</option>
                  {currentClass?.nandas.map(n => <option key={n.code} value={n.code}>{n.name}</option>)}
                </select>
              </div>
            )}

            {activeForm === 'NIC' && selectedNanda && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar NOC</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={selectedNoc}
                  onChange={(e) => setSelectedNoc(e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  {currentNanda?.nocs.map(n => <option key={n.code} value={n.code}>[{n.code}] {n.name}</option>)}
                </select>
              </div>
            )}

            <div className="border-t border-slate-200 pt-6 mt-6">
              <h3 className="text-md font-semibold text-slate-700 mb-4">Elementos a agregar</h3>
              
              <div className="space-y-6">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 border border-blue-100 bg-blue-50/30 rounded-xl relative">
                    {items.length > 1 && (
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                        title="Eliminar elemento"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    
                    <div className="mb-2 font-medium text-blue-800 text-sm">Elemento #{index + 1}</div>
                    
                    {/* Common Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {activeForm === 'DOMAIN' || activeForm === 'CLASS' ? 'Número (#)' : 'Código'}
                        </label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                          value={item.numberInput}
                          onChange={(e) => updateItem(item.id, 'numberInput', e.target.value)}
                          placeholder="Ej: 3, 00343..."
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Información / Nombre
                        </label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                          value={item.infoInput}
                          onChange={(e) => updateItem(item.id, 'infoInput', e.target.value)}
                          placeholder="Ej: ELIMINACIÓN E INTERCAMBIO"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Definición / Descripción <span className="text-xs text-slate-500">(Opcional)</span>
                      </label>
                      <textarea 
                        className="w-full p-2 border border-slate-300 rounded-lg h-20 bg-white"
                        value={item.definitionInput}
                        onChange={(e) => updateItem(item.id, 'definitionInput', e.target.value)}
                        placeholder="Escribe aquí la definición o descripción..."
                      />
                    </div>

                    {/* NANDA Specific Inputs */}
                    {activeForm === 'NANDA' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Características Definitorias (m/p) <span className="text-xs text-slate-500">(Una por línea)</span>
                          </label>
                          <textarea 
                            className="w-full p-2 border border-slate-300 rounded-lg h-32 bg-white"
                            value={item.characteristicsInput}
                            onChange={(e) => updateItem(item.id, 'characteristicsInput', e.target.value)}
                            placeholder="Característica 1&#10;Característica 2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Factores Relacionados (r/c) <span className="text-xs text-slate-500">(Uno por línea)</span>
                          </label>
                          <textarea 
                            className="w-full p-2 border border-slate-300 rounded-lg h-32 bg-white"
                            value={item.factorsInput}
                            onChange={(e) => updateItem(item.id, 'factorsInput', e.target.value)}
                            placeholder="Factor 1&#10;Factor 2"
                          />
                        </div>
                      </div>
                    )}

                    {/* NIC Specific Inputs */}
                    {activeForm === 'NIC' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Intervenciones / Actividades <span className="text-xs text-slate-500">(Una por línea)</span>
                        </label>
                        <textarea 
                          className="w-full p-2 border border-slate-300 rounded-lg h-32 bg-white"
                          value={item.activitiesInput}
                          onChange={(e) => updateItem(item.id, 'activitiesInput', e.target.value)}
                          placeholder="Actividad 1&#10;Actividad 2"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={addItem}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <Plus className="w-4 h-4" /> Agregar otra tarjeta de {formLabels[activeForm]}
                </button>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200 flex justify-end">
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Save className="w-5 h-5" /> Guardar todo en la Nube
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
