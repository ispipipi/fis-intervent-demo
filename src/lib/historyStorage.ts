import { HistoricalCase, HistoryImportBatch, HistorySheetSummary } from "../types/domain";

const DB_NAME = "fis-intervent-demo-history";
const DB_VERSION = 1;
const RECORDS_STORE = "records";
const BATCHES_STORE = "batches";

type StoredBatch = {
  batchId: string;
  fileName: string;
  importedAt: string;
  sheets: HistorySheetSummary[];
  duplicateReferenceKeys: string[];
  sourceFile?: Blob;
};

export type StoredHistory = {
  records: HistoricalCase[];
  latest?: Omit<HistoryImportBatch, "records"> & { records: number };
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no está disponible en este navegador."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORDS_STORE)) database.createObjectStore(RECORDS_STORE, { keyPath: "id" });
      if (!database.objectStoreNames.contains(BATCHES_STORE)) database.createObjectStore(BATCHES_STORE, { keyPath: "batchId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("No fue posible abrir la memoria histórica."));
  });
}

export async function saveHistoryBatch(batch: HistoryImportBatch, sourceFile: Blob) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([RECORDS_STORE, BATCHES_STORE], "readwrite");
    const recordsStore = transaction.objectStore(RECORDS_STORE);
    batch.records.forEach((record) => recordsStore.put(record));
    const storedBatch: StoredBatch = {
      batchId: batch.batchId,
      fileName: batch.fileName,
      importedAt: batch.importedAt,
      sheets: batch.sheets,
      duplicateReferenceKeys: batch.duplicateReferenceKeys,
      sourceFile
    };
    transaction.objectStore(BATCHES_STORE).put(storedBatch);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("No fue posible guardar la memoria histórica."));
    transaction.onabort = () => reject(transaction.error || new Error("La memoria histórica fue cancelada."));
  });
  database.close();
}

export async function loadHistoryStore(): Promise<StoredHistory> {
  const database = await openDatabase();
  const result = await new Promise<StoredHistory>((resolve, reject) => {
    const transaction = database.transaction([RECORDS_STORE, BATCHES_STORE], "readonly");
    const recordsRequest = transaction.objectStore(RECORDS_STORE).getAll();
    const batchesRequest = transaction.objectStore(BATCHES_STORE).getAll();
    transaction.oncomplete = () => {
      const batches = (batchesRequest.result as StoredBatch[]).sort((left, right) => left.importedAt.localeCompare(right.importedAt));
      const latest = batches.length > 0 ? batches[batches.length - 1] : undefined;
      const records = recordsRequest.result as HistoricalCase[];
      resolve({
        records,
        latest: latest
          ? {
              batchId: latest.batchId,
              fileName: latest.fileName,
              importedAt: latest.importedAt,
              records: records.filter((record) => record.sourceBatchId === latest.batchId).length,
              sheets: latest.sheets,
              duplicateReferenceKeys: latest.duplicateReferenceKeys
            }
          : undefined
      });
    };
    transaction.onerror = () => reject(transaction.error || new Error("No fue posible leer la memoria histórica."));
  });
  database.close();
  return result;
}
