// Reduz um nome completo para "primeiro + último" nome.
// Ex.: "João Vitor da Silva Ramos" -> "João Ramos"
//      "Guilherme Defavori Fabretti" -> "Guilherme Fabretti"
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
