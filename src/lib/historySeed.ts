import { parseHistoryWorkbook } from "./historyImport";
import { HistoryImportBatch } from "../types/domain";

export type BundledHistory = {
  batch: HistoryImportBatch;
  sourceFile: File;
};

export async function loadBundledHistory(): Promise<BundledHistory> {
  const response = await fetch(new URL("data/preclaim-history.xlsx", document.baseURI));
  if (!response.ok) throw new Error("No fue posible cargar el historial incluido en el demo.");
  const sourceFile = new File([await response.blob()], "PreClaim (1).xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  return { batch: await parseHistoryWorkbook(sourceFile), sourceFile };
}
