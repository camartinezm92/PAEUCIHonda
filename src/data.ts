import { TaxonomyDomain } from './types';

export const SERVICES = ['UCI Crítico', 'UCI Intermedios', 'Hospitalización', 'Cirugía'];

export const EVALUATORS = [
  'Andrés Fernando Villegas Quintero',
  'Leidy Katherine Rubiano Rico',
  'Silvia María López Ávila',
  'Margie Lizeth Moreno Reyes',
  'María Alejandra Figueroa Delgado',
  'Carmenza Suarez Martinez',
  'Olivia Lozano Vásquez'
];

export const NEEDS = [
  'Respiración y circulación',
  'Eliminación',
  'Reposo y sueño',
  'Temperatura',
  'Alimentación',
  'Movimiento',
  'Vestirse',
  'Limpieza',
  'Seguridad del entorno',
  'Comunicación',
  'Religión',
  'Trabajo',
  'Entretenimiento',
  'Aprendizaje'
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
