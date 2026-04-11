import { TaxonomyDomain, TaxonomyClass, TaxonomyNanda, TaxonomyNoc, TaxonomyNic } from '../types';

const extractNumber = (s: string): number => {
  const match = s.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
};

export const sortTaxonomy = (tax: TaxonomyDomain[]): TaxonomyDomain[] => {
  return [...tax].sort((a, b) => extractNumber(a.id) - extractNumber(b.id))
    .map(d => ({
      ...d,
      classes: [...d.classes].sort((a, b) => extractNumber(a.id) - extractNumber(b.id))
        .map(c => ({
          ...c,
          nandas: [...c.nandas].sort((a, b) => extractNumber(a.code) - extractNumber(b.code))
            .map(n => ({
              ...n,
              characteristics: [...(n.characteristics || [])].sort((a, b) => a.localeCompare(b)),
              factors: [...(n.factors || [])].sort((a, b) => a.localeCompare(b)),
              nocs: [...n.nocs].sort((a, b) => extractNumber(a.code) - extractNumber(b.code))
                .map(no => ({
                  ...no,
                  nics: [...no.nics].sort((a, b) => extractNumber(a.code) - extractNumber(b.code))
                    .map(ni => ({
                      ...ni,
                      activities: [...(ni.activities || [])].sort((a, b) => a.localeCompare(b))
                    }))
                }))
            }))
        }))
    }));
};
