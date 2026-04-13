import { TaxonomyDomain } from './types';

export const SERVICES = ['Cirugía', 'Hospitalización', 'UCI Crítico', 'UCI Intermedios'];

export const EVALUATORS = [
  'Andrés Fernando Villegas Quintero',
  'Leidy Katherine Rubiano Rico',
  'Margie Lizeth Moreno Reyes',
  'María Alejandra Figueroa Delgado',
  'Olivia Lozano Vásquez',
  'Silvia María López Ávila'
];

export const NEEDS = [
  'Alimentación',
  'Aprendizaje',
  'Comunicación',
  'Eliminación',
  'Entretenimiento',
  'Limpieza',
  'Movimiento',
  'Religión',
  'Reposo y sueño',
  'Respiración y circulación',
  'Seguridad del entorno',
  'Temperatura',
  'Trabajo',
  'Vestirse'
];

export const TAXONOMY: TaxonomyDomain[] = [];

export const getAllNandas = () => {
  const nandas: any[] = [];
  TAXONOMY.forEach(d => {
    d.classes.forEach(c => {
      c.nandas.forEach(n => {
        nandas.push({ ...n, domainId: d.id, domainName: d.name, classId: c.id, className: c.name });
      });
    });
  });
  return nandas;
};

export const getNandaDef = (code: string) => {
  for (const d of TAXONOMY) {
    for (const c of d.classes) {
      const n = c.nandas.find(n => n.code === code);
      if (n) return n;
    }
  }
  return null;
};
