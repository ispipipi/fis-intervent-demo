type DirectoryEntry = {
  isFile: boolean;
  isDirectory: boolean;
  file: (success: (file: File) => void, error?: (error: DOMException) => void) => void;
  createReader: () => { readEntries: (success: (entries: DirectoryEntry[]) => void, error?: (error: DOMException) => void) => void };
};

function readEntryFile(entry: DirectoryEntry) {
  return new Promise<File>((resolve, reject) => entry.file(resolve, reject));
}

function readDirectoryEntries(entry: DirectoryEntry) {
  const reader = entry.createReader();
  return new Promise<DirectoryEntry[]>((resolve, reject) => {
    const entries: DirectoryEntry[] = [];
    const readBatch = () => reader.readEntries((batch) => {
      if (batch.length === 0) {
        resolve(entries);
        return;
      }
      entries.push(...batch);
      readBatch();
    }, reject);
    readBatch();
  });
}

async function walkEntry(entry: DirectoryEntry): Promise<File[]> {
  if (entry.isFile) return [await readEntryFile(entry)];
  if (!entry.isDirectory) return [];
  const children = await readDirectoryEntries(entry);
  const files = await Promise.all(children.map((child) => walkEntry(child)));
  return files.flat();
}

export async function filesFromDrop(dataTransfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(dataTransfer.items)
    .map((item) => {
      const getEntry = (item as unknown as { webkitGetAsEntry?: () => DirectoryEntry | null }).webkitGetAsEntry;
      return getEntry ? getEntry.call(item) : null;
    })
    .filter((entry): entry is DirectoryEntry => Boolean(entry));
  if (entries.length === 0) return Array.from(dataTransfer.files);
  const files = await Promise.all(entries.map((entry) => walkEntry(entry)));
  return files.flat();
}
