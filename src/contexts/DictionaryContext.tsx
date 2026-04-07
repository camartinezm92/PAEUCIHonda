import React, { createContext, useContext, useState, useEffect } from 'react';
import { TaxonomyDomain } from '../types';
import { TAXONOMY as DEFAULT_TAXONOMY } from '../data';
import { db, doc, getDoc, setDoc } from '../firebase';

interface DictionaryContextType {
  taxonomy: TaxonomyDomain[];
  loading: boolean;
  error: string | null;
  updateTaxonomy: (newTaxonomy: TaxonomyDomain[]) => Promise<void>;
}

const DictionaryContext = createContext<DictionaryContextType>({
  taxonomy: DEFAULT_TAXONOMY,
  loading: true,
  error: null,
  updateTaxonomy: async () => {},
});

export const useDictionary = () => useContext(DictionaryContext);

export const DictionaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [taxonomy, setTaxonomy] = useState<TaxonomyDomain[]>(DEFAULT_TAXONOMY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const dictRef = doc(db, 'app_settings', 'dictionary_v2');
        const docSnap = await getDoc(dictRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data().taxonomy;
          if (data && Array.isArray(data)) {
            setTaxonomy(data);
          }
        } else {
          console.log('Dictionary not found in Firestore, uploading default...');
          try {
            await setDoc(dictRef, { taxonomy: DEFAULT_TAXONOMY });
          } catch (uploadError: any) {
            console.error('Error uploading default dictionary:', uploadError);
            setError(`Error uploading default: ${uploadError.message || uploadError.code || String(uploadError)}`);
          }
        }
      } catch (err: any) {
        console.error('Error loading dictionary:', err);
        setError(`Error loading dictionary: ${err.message || err.code || String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Timeout: No se pudo conectar con Firestore después de 10 segundos.');
      }
    }, 10000);

    loadDictionary().then(() => clearTimeout(timeoutId));
    
    return () => clearTimeout(timeoutId);
  }, []);

  const updateTaxonomy = async (newTaxonomy: TaxonomyDomain[]) => {
    try {
      const dictRef = doc(db, 'app_settings', 'dictionary_v2');
      await setDoc(dictRef, { taxonomy: newTaxonomy });
      setTaxonomy(newTaxonomy);
    } catch (error) {
      console.error('Error updating dictionary:', error);
      throw error;
    }
  };

  return (
    <DictionaryContext.Provider value={{ taxonomy, loading, error, updateTaxonomy }}>
      {children}
    </DictionaryContext.Provider>
  );
};
