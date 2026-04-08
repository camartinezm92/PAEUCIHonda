export type ServiceType = 'UCI Crítico' | 'UCI Intermedios' | 'Hospitalización' | 'Cirugía';

export type PAEStatus = 'INICIADA' | 'CERRADA';

export interface PatientInfo {
  service: ServiceType | '';
  name: string;
  id: string;
  age: number | '';
  sex: 'M' | 'F' | 'Otro' | '';
  medicalDiagnosis: string;
}

export interface TaxonomyNic {
  code: string;
  name: string;
  definition?: string;
  activities: string[];
}

export interface TaxonomyNoc {
  code: string;
  name: string;
  definition?: string;
  nics: TaxonomyNic[];
}

export interface TaxonomyNanda {
  code: string;
  name: string;
  definition: string;
  characteristics: string[];
  factors: string[];
  nocs: TaxonomyNoc[];
}

export interface TaxonomyClass {
  id: string;
  name: string;
  definition?: string;
  nandas: TaxonomyNanda[];
}

export interface TaxonomyDomain {
  id: string;
  name: string;
  definition?: string;
  classes: TaxonomyClass[];
}

export interface SelectedNIC {
  code: string;
  name: string;
  activities: string[];
}

export interface SelectedNOC {
  code: string;
  name: string;
  initialRating: number;
  finalRating?: number;
  selectedNICs: SelectedNIC[];
}

export interface SelectedNANDA {
  code: string;
  name: string;
  selectedCharacteristics: string[];
  selectedFactors: string[];
  selectedNOCs: SelectedNOC[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'nurse' | 'viewer';
  createdAt: string;
}

export interface PAERecord {
  id: string;
  date: string;
  status: PAEStatus;
  patient: PatientInfo;
  needs: string[];
  otherNeed?: string;
  nandas: SelectedNANDA[];
  evaluator: string;
  observations: string;
  userId?: string;
}
