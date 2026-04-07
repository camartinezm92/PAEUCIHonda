import { TaxonomyDomain, TaxonomyClass, TaxonomyNanda, TaxonomyNoc, TaxonomyNic } from '../types';

export const deleteFromTaxonomy = (
  taxonomy: TaxonomyDomain[],
  type: 'DOMAIN' | 'CLASS' | 'NANDA' | 'NOC' | 'NIC',
  domainId: string,
  classId?: string,
  nandaCode?: string,
  nocCode?: string,
  nicCode?: string
): TaxonomyDomain[] => {
  const newTaxonomy = JSON.parse(JSON.stringify(taxonomy)) as TaxonomyDomain[];

  if (type === 'DOMAIN') {
    return newTaxonomy.filter(d => d.id !== domainId);
  }

  const dIndex = newTaxonomy.findIndex(d => d.id === domainId);
  if (dIndex === -1) return newTaxonomy;

  if (type === 'CLASS') {
    newTaxonomy[dIndex].classes = newTaxonomy[dIndex].classes.filter(c => c.id !== classId);
    return newTaxonomy;
  }

  const cIndex = newTaxonomy[dIndex].classes.findIndex(c => c.id === classId);
  if (cIndex === -1) return newTaxonomy;

  if (type === 'NANDA') {
    newTaxonomy[dIndex].classes[cIndex].nandas = newTaxonomy[dIndex].classes[cIndex].nandas.filter(n => n.code !== nandaCode);
    return newTaxonomy;
  }

  const nIndex = newTaxonomy[dIndex].classes[cIndex].nandas.findIndex(n => n.code === nandaCode);
  if (nIndex === -1) return newTaxonomy;

  if (type === 'NOC') {
    newTaxonomy[dIndex].classes[cIndex].nandas[nIndex].nocs = newTaxonomy[dIndex].classes[cIndex].nandas[nIndex].nocs.filter(no => no.code !== nocCode);
    return newTaxonomy;
  }

  const noIndex = newTaxonomy[dIndex].classes[cIndex].nandas[nIndex].nocs.findIndex(no => no.code === nocCode);
  if (noIndex === -1) return newTaxonomy;

  if (type === 'NIC') {
    newTaxonomy[dIndex].classes[cIndex].nandas[nIndex].nocs[noIndex].nics = newTaxonomy[dIndex].classes[cIndex].nandas[nIndex].nocs[noIndex].nics.filter(ni => ni.code !== nicCode);
  }

  return newTaxonomy;
};

export const updateInTaxonomy = (
  taxonomy: TaxonomyDomain[],
  type: 'DOMAIN' | 'CLASS' | 'NANDA' | 'NOC' | 'NIC',
  oldPath: { domainId: string; classId?: string; nandaCode?: string; nocCode?: string; nicCode?: string },
  newPath: { domainId: string; classId?: string; nandaCode?: string; nocCode?: string; nicCode?: string },
  updatedData: any
): TaxonomyDomain[] => {
  // 1. Remove from old location
  let newTaxonomy = deleteFromTaxonomy(
    taxonomy, 
    type, 
    oldPath.domainId, 
    oldPath.classId, 
    oldPath.nandaCode, 
    oldPath.nocCode, 
    oldPath.nicCode
  );

  // 2. Insert into new location
  if (type === 'DOMAIN') {
    newTaxonomy.push(updatedData);
    return newTaxonomy;
  }

  const dIndex = newTaxonomy.findIndex(d => d.id === newPath.domainId);
  if (dIndex === -1) throw new Error('Dominio destino no encontrado');

  if (type === 'CLASS') {
    newTaxonomy[dIndex].classes.push(updatedData);
    return newTaxonomy;
  }

  const cIndex = newTaxonomy[dIndex].classes.findIndex(c => c.id === newPath.classId);
  if (cIndex === -1) throw new Error('Clase destino no encontrada');

  if (type === 'NANDA') {
    newTaxonomy[dIndex].classes[cIndex].nandas.push(updatedData);
    return newTaxonomy;
  }

  const nIndex = newTaxonomy[dIndex].classes[cIndex].nandas.findIndex(n => n.code === newPath.nandaCode);
  if (nIndex === -1) throw new Error('NANDA destino no encontrado');

  if (type === 'NOC') {
    newTaxonomy[dIndex].classes[cIndex].nandas[nIndex].nocs.push(updatedData);
    return newTaxonomy;
  }

  const noIndex = newTaxonomy[dIndex].classes[cIndex].nandas[nIndex].nocs.findIndex(no => no.code === newPath.nocCode);
  if (noIndex === -1) throw new Error('NOC destino no encontrado');

  if (type === 'NIC') {
    newTaxonomy[dIndex].classes[cIndex].nandas[nIndex].nocs[noIndex].nics.push(updatedData);
  }

  return newTaxonomy;
};
