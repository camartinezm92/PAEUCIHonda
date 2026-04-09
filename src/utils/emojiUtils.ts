import { PAERecord } from '../types';

const calculateEmoji = (initialAvg: number, finalAvg: number): string => {
  const diff = finalAvg - initialAvg;
  
  // 1. Empeoramiento (Cualquier descenso)
  if (diff < 0) return '😭';
  
  // 2. Sin cambios (Estable)
  if (diff === 0) {
    return finalAvg >= 4 ? '🤗' : '😣';
  }
  
  // 3. Mejoría
  // Gran mejoría (>= 1.5 puntos) o nivel de excelencia (promedio >= 4)
  if (diff >= 1.5 || finalAvg >= 4) return '🤗';
  
  // Mejoría leve
  return '😌';
};

export const getRecordEmoji = (record: PAERecord): string => {
  if (record.status === 'INICIADA') return '🥲';

  const nocs = record.nandas.flatMap(n => n.selectedNOCs);
  if (nocs.length === 0) return '😌';

  let totalInitial = 0;
  let totalFinal = 0;
  let count = 0;

  nocs.forEach(noc => {
    if (noc.finalRating) {
      totalInitial += noc.initialRating;
      totalFinal += noc.finalRating;
      count++;
    }
  });

  if (count === 0) return '😌';

  return calculateEmoji(totalInitial / count, totalFinal / count);
};

export const getPatientGlobalEmoji = (records: PAERecord[]): string => {
  const closedRecords = records.filter(r => r.status === 'CERRADA');
  
  if (closedRecords.length === 0) {
    return records.some(r => r.status === 'INICIADA') ? '🥲' : '😌';
  }

  let totalInitial = 0;
  let totalFinal = 0;
  let totalNocs = 0;

  closedRecords.forEach(record => {
    const recordNocs = record.nandas.flatMap(n => n.selectedNOCs);
    recordNocs.forEach(noc => {
      if (noc.finalRating) {
        totalInitial += noc.initialRating;
        totalFinal += noc.finalRating;
        totalNocs++;
      }
    });
  });

  if (totalNocs === 0) return '😌';

  return calculateEmoji(totalInitial / totalNocs, totalFinal / totalNocs);
};
