import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, ChevronDown, Plus, AlertCircle } from 'lucide-react';
import { MEDICAL_DIAGNOSES, normalizeDiagnosisText } from '../data/medicalDiagnoses';

interface MedicalDiagnosisSelectorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const MAX_VISIBLE_RESULTS = 80;
const SEPARATOR = '; ';

export default function MedicalDiagnosisSelector({
  value,
  onChange,
  maxLength = 1000
}: MedicalDiagnosisSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedDiagnoses = useMemo(() => {
    if (!value) return [];
    return value
      .split(/\s*;\s*/)
      .map(item => item.trim())
      .filter(Boolean);
  }, [value]);

  const selectedSet = useMemo(() => new Set(selectedDiagnoses), [selectedDiagnoses]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredResult = useMemo(() => {
    const normalizedQuery = normalizeDiagnosisText(searchQuery);
    if (!normalizedQuery) {
      return {
        items: MEDICAL_DIAGNOSES.slice(0, MAX_VISIBLE_RESULTS),
        totalMatches: MEDICAL_DIAGNOSES.length
      };
    }

    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    const codeStartsWith: typeof MEDICAL_DIAGNOSES = [];
    const otherMatches: typeof MEDICAL_DIAGNOSES = [];

    for (const item of MEDICAL_DIAGNOSES) {
      const matchesAllTerms = terms.every(term => item.normalizedSearch.includes(term));
      if (!matchesAllTerms) continue;

      if (item.code && normalizeDiagnosisText(item.code).startsWith(terms[0])) {
        codeStartsWith.push(item);
      } else {
        otherMatches.push(item);
      }
    }

    const combined = [...codeStartsWith, ...otherMatches];
    return {
      items: combined.slice(0, MAX_VISIBLE_RESULTS),
      totalMatches: combined.length
    };
  }, [searchQuery]);

  const commitSelection = (nextList: string[]) => {
    const joined = nextList.join(SEPARATOR);
    if (joined.length > maxLength) {
      setLimitWarning(`Has alcanzado el límite máximo de ${maxLength} caracteres permitido para diagnósticos.`);
      return;
    }
    setLimitWarning(null);
    onChange(joined);
  };

  const toggleDiagnosis = (label: string) => {
    if (selectedSet.has(label)) {
      commitSelection(selectedDiagnoses.filter(item => item !== label));
    } else {
      commitSelection([...selectedDiagnoses, label]);
    }
  };

  const removeDiagnosis = (label: string) => {
    commitSelection(selectedDiagnoses.filter(item => item !== label));
  };

  const handleAddCustom = () => {
    const custom = searchQuery.trim().replace(/;/g, ',');
    if (!custom) return;
    if (!selectedSet.has(custom)) {
      commitSelection([...selectedDiagnoses, custom]);
    }
    setSearchQuery('');
  };

  const trimmedQuery = searchQuery.trim();
  const hasExactMatch = useMemo(() => {
    if (!trimmedQuery) return true;
    const norm = normalizeDiagnosisText(trimmedQuery);
    return (
      selectedDiagnoses.some(d => normalizeDiagnosisText(d) === norm) ||
      filteredResult.items.some(d => normalizeDiagnosisText(d.label) === norm || normalizeDiagnosisText(d.name) === norm)
    );
  }, [trimmedQuery, selectedDiagnoses, filteredResult.items]);

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Selected diagnoses badges */}
      {selectedDiagnoses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md">
          {selectedDiagnoses.map(diag => (
            <span
              key={diag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
            >
              <span>{diag}</span>
              <button
                type="button"
                onClick={() => removeDiagnosis(diag)}
                className="text-blue-500 hover:text-blue-800 focus:outline-none"
                title="Quitar diagnóstico"
                aria-label={`Quitar ${diag}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Active search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredResult.items.length === 1) {
                toggleDiagnosis(filteredResult.items[0].label);
                setSearchQuery('');
              }
            }
          }}
          placeholder="Buscar por código CIE-10 o nombre del diagnóstico (puede seleccionar varios)..."
          className="w-full pl-9 pr-16 py-2 text-sm border border-slate-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className="p-1 text-slate-400 hover:text-slate-600"
            title={isOpen ? 'Cerrar lista' : 'Abrir lista'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Helper & count bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {selectedDiagnoses.length === 0
            ? 'Ningún diagnóstico seleccionado. Escribe para buscar en la lista.'
            : `${selectedDiagnoses.length} diagnóstico${selectedDiagnoses.length === 1 ? '' : 's'} seleccionado${selectedDiagnoses.length === 1 ? '' : 's'}`}
        </span>
        <span>Catálogo disponible: {MEDICAL_DIAGNOSES.length} diagnósticos</span>
      </div>

      {limitWarning && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{limitWarning}</span>
        </div>
      )}

      {/* Dropdown options */}
      {isOpen && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              {filteredResult.totalMatches === 0
                ? 'Sin coincidencias en el catálogo'
                : filteredResult.totalMatches > MAX_VISIBLE_RESULTS
                ? `Mostrando primeros ${MAX_VISIBLE_RESULTS} de ${filteredResult.totalMatches} resultados (afina tu búsqueda)`
                : `${filteredResult.totalMatches} resultado${filteredResult.totalMatches === 1 ? '' : 's'}`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Listo
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {filteredResult.items.map(option => {
              const isSelected = selectedSet.has(option.label);
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => toggleDiagnosis(option.label)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-start justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {option.code ? (
                      <>
                        <span className="inline-block px-1.5 py-0.5 text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded flex-shrink-0">
                          {option.code}
                        </span>
                        <span className="break-words">{option.name}</span>
                      </>
                    ) : (
                      <span className="break-words">{option.label}</span>
                    )}
                  </div>
                  <span
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                </button>
              );
            })}

            {trimmedQuery && !hasExactMatch && (
              <button
                type="button"
                onClick={handleAddCustom}
                className="w-full text-left px-3 py-2.5 text-sm bg-amber-50/70 hover:bg-amber-100/70 text-amber-900 flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>Agregar diagnóstico personalizado: "{trimmedQuery}"</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
