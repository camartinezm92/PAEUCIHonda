import { PAERecord, SelectedNANDA, SelectedNOC, SelectedNIC, TaxonomyDomain } from '../types';

export const minifyRecord = (record: PAERecord, userId: string): any => {
  return {
    id: record.id,
    date: record.date,
    status: record.status,
    patient: record.patient,
    needs: record.needs,
    otherNeed: record.otherNeed || '',
    evaluator: record.evaluator,
    observations: record.observations || '',
    userId: userId,
    nandas: record.nandas.map(n => ({
      c: n.code,
      ch: n.selectedCharacteristics,
      f: n.selectedFactors,
      no: n.selectedNOCs.map(noc => ({
        c: noc.code,
        i: noc.initialRating,
        f: noc.finalRating || null,
        ni: noc.selectedNICs.map(nic => nic.code)
      }))
    }))
  };
};

export const expandRecord = (minified: any, taxonomy: TaxonomyDomain[]): PAERecord => {
  const getNandaDef = (code: string) => {
    for (const d of taxonomy) {
      for (const c of d.classes) {
        const n = c.nandas.find(n => n.code === code);
        if (n) return n;
      }
    }
    return null;
  };

  return {
    id: minified.id,
    date: minified.date,
    status: minified.status,
    patient: minified.patient,
    needs: minified.needs || [],
    otherNeed: minified.otherNeed || '',
    evaluator: minified.evaluator || '',
    observations: minified.observations || '',
    nandas: (minified.nandas || []).map((mn: any): SelectedNANDA => {
      const nandaDef = getNandaDef(mn.c);
      
      return {
        code: mn.c,
        name: nandaDef ? nandaDef.name : 'Desconocido',
        selectedCharacteristics: mn.ch || [],
        selectedFactors: mn.f || [],
        selectedNOCs: (mn.no || []).map((mnoc: any): SelectedNOC => {
          const nocDef = nandaDef?.nocs.find(n => n.code === mnoc.c);
          
          return {
            code: mnoc.c,
            name: nocDef ? nocDef.name : 'Desconocido',
            initialRating: mnoc.i,
            finalRating: mnoc.f,
            selectedNICs: (mnoc.ni || []).map((nicCode: string): SelectedNIC => {
              const nicDef = nocDef?.nics.find(n => n.code === nicCode);
              return {
                code: nicCode,
                name: nicDef ? nicDef.name : 'Desconocido',
                activities: nicDef ? nicDef.activities : []
              };
            })
          };
        })
      };
    })
  };
};
