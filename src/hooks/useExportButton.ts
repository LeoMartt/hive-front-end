import { useState } from "react";

interface UseExportButtonResult {
  label: string;
  isDefault: boolean;
  handleClick: () => void;
}

export function useExportButton(
  defaultLabel: string,
  isEmpty: boolean,
  emptyLabel: string,
  runExport: () => void | Promise<void>,
): UseExportButtonResult {
  const [label, setLabel] = useState(defaultLabel);

  function showTemporary(message: string, durationMs: number) {
    setLabel(message);
    setTimeout(() => setLabel(defaultLabel), durationMs);
  }

  async function handleClick() {
    if (label === "Exportando...") return;
    if (isEmpty) {
      showTemporary(emptyLabel, 1600);
      return;
    }
    try {
      setLabel("Exportando...");
      await runExport();
      setLabel(defaultLabel);
    } catch {
      showTemporary("Erro ao exportar — tente novamente", 2000);
    }
  }

  return { label, isDefault: label === defaultLabel, handleClick };
}
