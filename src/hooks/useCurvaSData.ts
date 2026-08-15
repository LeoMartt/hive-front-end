export interface CurvaSData {
  labels: string[];
  planned: number[];
  realized: (number | null)[];
}

// Série fixa — não há dado histórico real por trás do snapshot atual do projeto,
// mesma decisão do protótipo HTML original.
const CURVA_S_DATA: CurvaSData = {
  labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8", "Sem 9", "Sem 10"],
  planned: [5, 12, 22, 35, 50, 65, 78, 88, 95, 100],
  realized: [4, 10, 18, 30, 45, 58, 72, null, null, null],
};

export function useCurvaSData(): CurvaSData {
  return CURVA_S_DATA;
}
