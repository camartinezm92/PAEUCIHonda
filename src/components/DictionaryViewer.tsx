import React, { useState, useMemo } from 'react';
import { useDictionary } from '../contexts/DictionaryContext';
import { Search, BookOpen, ArrowLeft, ChevronRight, Trash2, Edit2, Save, X, AlertCircle } from 'lucide-react';
import { deleteFromTaxonomy, updateInTaxonomy } from '../utils/taxonomyHelpers';

type SearchType = 'ALL' | 'DOMAIN' | 'CLASS' | 'NANDA' | 'NOC' | 'NIC';

interface DictionaryViewerProps {
  onBack: () => void;
  requireAuth: (onSuccess: () => void) => void;
}

export default function DictionaryViewer({ onBack, requireAuth }: DictionaryViewerProps) {
  const { taxonomy, loading, updateTaxonomy } = useDictionary();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('ALL');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const flattened = useMemo(() => {
    const items: any[] = [];
    taxonomy.forEach(d => {
      items.push({ type: 'DOMAIN', id: d.id, name: d.name, path: [d.name], raw: d, parentIds: { domainId: d.id } });
      d.classes.forEach(c => {
        items.push({ type: 'CLASS', id: c.id, name: c.name, path: [d.name, c.name], raw: c, parentIds: { domainId: d.id, classId: c.id } });
        c.nandas.forEach(n => {
          items.push({ type: 'NANDA', id: n.code, name: n.name, path: [d.name, c.name, n.name], raw: n, parentIds: { domainId: d.id, classId: c.id, nandaCode: n.code } });
          n.nocs.forEach(no => {
            items.push({ type: 'NOC', id: no.code, name: no.name, path: [d.name, c.name, n.name, `[${no.code}] ${no.name}`], raw: no, parentIds: { domainId: d.id, classId: c.id, nandaCode: n.code, nocCode: no.code } });
            no.nics.forEach(ni => {
              items.push({ type: 'NIC', id: ni.code, name: ni.name, path: [d.name, c.name, n.name, `[${no.code}] ${no.name}`, `[${ni.code}] ${ni.name}`], raw: ni, parentIds: { domainId: d.id, classId: c.id, nandaCode: n.code, nocCode: no.code, nicCode: ni.code } });
            });
          });
        });
      });
    });
    return items;
  }, [taxonomy]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim() && searchType === 'ALL') return [];
    
    return flattened.filter(item => {
      if (searchType !== 'ALL' && item.type !== searchType) return false;
      const q = searchQuery.toLowerCase();
      return item.id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
    }).slice(0, 50);
  }, [flattened, searchQuery, searchType]);

  const navigateTo = (type: SearchType, id: string) => {
    const item = flattened.find(i => i.type === type && i.id === id);
    if (item) {
      setSelectedItem(item);
      setIsEditing(false);
      setConfirmDelete(false);
    }
  };

  const handleDelete = () => {
    requireAuth(async () => {
      if (!selectedItem) return;
      try {
        const p = selectedItem.parentIds;
        const newTaxonomy = deleteFromTaxonomy(taxonomy, selectedItem.type, p.domainId, p.classId, p.nandaCode, p.nocCode, p.nicCode);
        await updateTaxonomy(newTaxonomy);
        setSelectedItem(null);
        setConfirmDelete(false);
      } catch (err: any) {
        setEditError(err.message || 'Error al eliminar');
      }
    });
  };

  const startEdit = () => {
    requireAuth(() => {
      setEditError(null);
      setEditData({
        ...selectedItem.raw,
        parentIds: { ...selectedItem.parentIds },
        // Convert arrays to strings for textareas
        characteristicsStr: selectedItem.raw.characteristics?.join('\n') || '',
        factorsStr: selectedItem.raw.factors?.join('\n') || '',
        activitiesStr: selectedItem.raw.activities?.join('\n') || ''
      });
      setIsEditing(true);
    });
  };

  const handleSaveEdit = async () => {
    try {
      setEditError(null);
      
      // Prepare updated raw data
      const updatedRaw = { ...editData };
      delete updatedRaw.parentIds;
      delete updatedRaw.characteristicsStr;
      delete updatedRaw.factorsStr;
      delete updatedRaw.activitiesStr;

      if (selectedItem.type === 'NANDA') {
        updatedRaw.characteristics = editData.characteristicsStr.split('\n').filter((s: string) => s.trim());
        updatedRaw.factors = editData.factorsStr.split('\n').filter((s: string) => s.trim());
      }
      if (selectedItem.type === 'NIC') {
        updatedRaw.activities = editData.activitiesStr.split('\n').filter((s: string) => s.trim());
      }

      const newTaxonomy = updateInTaxonomy(
        taxonomy,
        selectedItem.type,
        selectedItem.parentIds,
        editData.parentIds,
        updatedRaw
      );

      await updateTaxonomy(newTaxonomy);
      
      // Update selected item view
      const newItemId = selectedItem.type === 'DOMAIN' || selectedItem.type === 'CLASS' ? updatedRaw.id : updatedRaw.code;
      
      setIsEditing(false);
      
      // Find the new item in the updated taxonomy (we have to wait for context to update, but we can just clear selection for now or try to find it)
      // For simplicity, let's just clear selection so user can search again, or we can just mock the update.
      setSelectedItem(null);
      
    } catch (err: any) {
      setEditError(err.message || 'Error al guardar cambios');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando biblioteca...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-slate-600 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          Consultar Biblioteca
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Results */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar por código o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'DOMAIN', 'CLASS', 'NANDA', 'NOC', 'NIC'] as SearchType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setSearchType(type)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    searchType === type 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'ALL' ? 'Todos' : type}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ height: '600px' }}>
            <div className="p-3 border-b border-slate-100 bg-slate-50 font-medium text-sm text-slate-600">
              Resultados ({filtered.length})
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-sm">
                  {searchQuery ? 'No se encontraron resultados' : 'Escribe para buscar o selecciona un filtro'}
                </div>
              ) : (
                filtered.map((item, idx) => (
                  <button
                    key={`${item.type}-${item.id}-${idx}`}
                    onClick={() => { setSelectedItem(item); setIsEditing(false); setConfirmDelete(false); }}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                      selectedItem?.id === item.id && selectedItem?.type === item.type
                        ? 'bg-blue-50 border-blue-200 border'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-blue-600">{item.type}</span>
                      <span className="text-xs text-slate-500 font-mono">{item.id}</span>
                    </div>
                    <div className="font-medium text-slate-800 line-clamp-2">{item.name}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-2">
          {selectedItem ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full overflow-y-auto">
              
              {/* Header Actions */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 flex-wrap">
                    {selectedItem.path.map((p: string, i: number) => (
                      <React.Fragment key={i}>
                        <span className={i === selectedItem.path.length - 1 ? 'font-bold text-slate-800' : ''}>
                          {p}
                        </span>
                        {i < selectedItem.path.length - 1 && <ChevronRight className="w-4 h-4" />}
                      </React.Fragment>
                    ))}
                  </div>
                  {!isEditing && (
                    <>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        <span className="text-blue-600 mr-2">[{selectedItem.type}]</span>
                        {selectedItem.name}
                      </h2>
                      <div className="text-sm font-mono text-slate-500 bg-slate-100 inline-block px-2 py-1 rounded">
                        ID / Código: {selectedItem.id}
                      </div>
                    </>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex gap-2 ml-4">
                    <button 
                      onClick={startEdit}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setConfirmDelete(true)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {confirmDelete && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <h3 className="text-red-800 font-bold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> ¿Estás seguro de eliminar este elemento?
                  </h3>
                  <p className="text-red-600 text-sm mb-4">
                    Esta acción eliminará también todos los elementos que dependan de él (por ejemplo, si eliminas un NANDA, se eliminarán sus NOCs y NICs asociados). Esta acción no se puede deshacer.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">
                      Sí, eliminar
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {editError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> {editError}
                </div>
              )}

              {/* EDIT MODE */}
              {isEditing ? (
                <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-slate-800">Modificar {selectedItem.type}</h3>
                    <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Association Dropdowns */}
                  {selectedItem.type !== 'DOMAIN' && (
                    <div className="p-4 bg-white rounded-lg border border-slate-200 mb-4 space-y-3">
                      <h4 className="font-medium text-sm text-slate-700">Asociación (Mover a otro padre)</h4>
                      
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Dominio</label>
                        <select 
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                          value={editData.parentIds.domainId}
                          onChange={(e) => setEditData({...editData, parentIds: {...editData.parentIds, domainId: e.target.value, classId: '', nandaCode: '', nocCode: ''}})}
                        >
                          {taxonomy.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>

                      {['NANDA', 'NOC', 'NIC'].includes(selectedItem.type) && editData.parentIds.domainId && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Clase</label>
                          <select 
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                            value={editData.parentIds.classId}
                            onChange={(e) => setEditData({...editData, parentIds: {...editData.parentIds, classId: e.target.value, nandaCode: '', nocCode: ''}})}
                          >
                            <option value="">Seleccione Clase...</option>
                            {taxonomy.find(d => d.id === editData.parentIds.domainId)?.classes.map(c => 
                              <option key={c.id} value={c.id}>{c.name}</option>
                            )}
                          </select>
                        </div>
                      )}

                      {['NOC', 'NIC'].includes(selectedItem.type) && editData.parentIds.classId && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">NANDA</label>
                          <select 
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                            value={editData.parentIds.nandaCode}
                            onChange={(e) => setEditData({...editData, parentIds: {...editData.parentIds, nandaCode: e.target.value, nocCode: ''}})}
                          >
                            <option value="">Seleccione NANDA...</option>
                            {taxonomy.find(d => d.id === editData.parentIds.domainId)?.classes.find(c => c.id === editData.parentIds.classId)?.nandas.map(n => 
                              <option key={n.code} value={n.code}>{n.name}</option>
                            )}
                          </select>
                        </div>
                      )}

                      {selectedItem.type === 'NIC' && editData.parentIds.nandaCode && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">NOC</label>
                          <select 
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                            value={editData.parentIds.nocCode}
                            onChange={(e) => setEditData({...editData, parentIds: {...editData.parentIds, nocCode: e.target.value}})}
                          >
                            <option value="">Seleccione NOC...</option>
                            {taxonomy.find(d => d.id === editData.parentIds.domainId)?.classes.find(c => c.id === editData.parentIds.classId)?.nandas.find(n => n.code === editData.parentIds.nandaCode)?.nocs.map(no => 
                              <option key={no.code} value={no.code}>{no.name}</option>
                            )}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">ID / Código</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border border-slate-300 rounded-lg"
                        value={editData.id || editData.code}
                        onChange={(e) => setEditData({...editData, [selectedItem.type === 'DOMAIN' || selectedItem.type === 'CLASS' ? 'id' : 'code']: e.target.value})}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border border-slate-300 rounded-lg"
                        value={editData.name}
                        onChange={(e) => setEditData({...editData, name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Definición / Descripción</label>
                    <textarea 
                      className="w-full p-2 border border-slate-300 rounded-lg h-24"
                      value={editData.definition || ''}
                      onChange={(e) => setEditData({...editData, definition: e.target.value})}
                    />
                  </div>

                  {selectedItem.type === 'NANDA' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Características (Una por línea)</label>
                        <textarea 
                          className="w-full p-2 border border-slate-300 rounded-lg h-32"
                          value={editData.characteristicsStr}
                          onChange={(e) => setEditData({...editData, characteristicsStr: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Factores (Uno por línea)</label>
                        <textarea 
                          className="w-full p-2 border border-slate-300 rounded-lg h-32"
                          value={editData.factorsStr}
                          onChange={(e) => setEditData({...editData, factorsStr: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {selectedItem.type === 'NIC' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Actividades (Una por línea)</label>
                      <textarea 
                        className="w-full p-2 border border-slate-300 rounded-lg h-32"
                        value={editData.activitiesStr}
                        onChange={(e) => setEditData({...editData, activitiesStr: e.target.value})}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" /> Guardar Cambios
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW MODE */
                <div className="space-y-6">
                  {selectedItem.raw.definition && (
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-2">Definición / Descripción</h3>
                      <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {selectedItem.raw.definition}
                      </p>
                    </div>
                  )}

                  {selectedItem.type === 'NANDA' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-700 mb-2">Características Definitorias (m/p)</h3>
                        <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                          {selectedItem.raw.characteristics?.map((c: string, i: number) => (
                            <li key={i}>{c}</li>
                          ))}
                          {(!selectedItem.raw.characteristics || selectedItem.raw.characteristics.length === 0) && (
                            <li className="text-slate-400 italic list-none -ml-5">No registradas</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-700 mb-2">Factores Relacionados (r/c)</h3>
                        <ul className="list-disc pl-5 space-y-1 text-slate-600 text-sm">
                          {selectedItem.raw.factors?.map((f: string, i: number) => (
                            <li key={i}>{f}</li>
                          ))}
                          {(!selectedItem.raw.factors || selectedItem.raw.factors.length === 0) && (
                            <li className="text-slate-400 italic list-none -ml-5">No registrados</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}

                  {selectedItem.type === 'NIC' && (
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-2">Actividades</h3>
                      <ul className="list-decimal pl-5 space-y-2 text-slate-600 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                        {selectedItem.raw.activities?.map((a: string, i: number) => (
                          <li key={i} className="pl-1">{a}</li>
                        ))}
                        {(!selectedItem.raw.activities || selectedItem.raw.activities.length === 0) && (
                          <li className="text-slate-400 italic list-none -ml-5">No registradas</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {selectedItem.type === 'NOC' && (
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-2">NICs Asociados a este NOC</h3>
                      <div className="space-y-2">
                        {selectedItem.raw.nics?.map((nic: any, i: number) => (
                          <button 
                            key={i} 
                            onClick={() => navigateTo('NIC', nic.code)}
                            className="w-full text-left bg-slate-50 hover:bg-blue-50 p-3 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors text-sm"
                          >
                            <span className="font-mono text-blue-600 mr-2">[{nic.code}]</span>
                            <span className="font-medium text-slate-700">{nic.name}</span>
                          </button>
                        ))}
                        {(!selectedItem.raw.nics || selectedItem.raw.nics.length === 0) && (
                          <p className="text-slate-400 italic text-sm">No hay NICs asociados</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedItem.type === 'CLASS' && (
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-2">NANDAs en esta Clase</h3>
                      <div className="space-y-2">
                        {selectedItem.raw.nandas?.map((nanda: any, i: number) => (
                          <button 
                            key={i} 
                            onClick={() => navigateTo('NANDA', nanda.code)}
                            className="w-full text-left bg-slate-50 hover:bg-blue-50 p-3 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors text-sm"
                          >
                            <span className="font-mono text-blue-600 mr-2">[{nanda.code}]</span>
                            <span className="font-medium text-slate-700">{nanda.name}</span>
                          </button>
                        ))}
                        {(!selectedItem.raw.nandas || selectedItem.raw.nandas.length === 0) && (
                          <p className="text-slate-400 italic text-sm">No hay NANDAs asociados</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedItem.type === 'DOMAIN' && (
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-2">Clases en este Dominio</h3>
                      <div className="space-y-2">
                        {selectedItem.raw.classes?.map((cls: any, i: number) => (
                          <button 
                            key={i} 
                            onClick={() => navigateTo('CLASS', cls.id)}
                            className="w-full text-left bg-slate-50 hover:bg-blue-50 p-3 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors text-sm"
                          >
                            <span className="font-mono text-blue-600 mr-2">[{cls.id}]</span>
                            <span className="font-medium text-slate-700">{cls.name}</span>
                          </button>
                        ))}
                        {(!selectedItem.raw.classes || selectedItem.raw.classes.length === 0) && (
                          <p className="text-slate-400 italic text-sm">No hay Clases asociadas</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedItem.type === 'NANDA' && (
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-2">NOCs en este NANDA</h3>
                      <div className="space-y-2">
                        {selectedItem.raw.nocs?.map((noc: any, i: number) => (
                          <button 
                            key={i} 
                            onClick={() => navigateTo('NOC', noc.code)}
                            className="w-full text-left bg-slate-50 hover:bg-blue-50 p-3 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors text-sm"
                          >
                            <span className="font-mono text-blue-600 mr-2">[{noc.code}]</span>
                            <span className="font-medium text-slate-700">{noc.name}</span>
                          </button>
                        ))}
                        {(!selectedItem.raw.nocs || selectedItem.raw.nocs.length === 0) && (
                          <p className="text-slate-400 italic text-sm">No hay NOCs asociados</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center min-h-[400px]">
              <BookOpen className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">Selecciona un elemento</p>
              <p className="text-sm mt-2 max-w-md">
                Busca y haz clic en un Dominio, Clase, NANDA, NOC o NIC en la lista de la izquierda para ver todos sus detalles y relaciones.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
