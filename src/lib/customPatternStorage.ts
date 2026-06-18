import type { StrumCategoryId, TimeSignature } from '../data/strumTypes';

export type CustomPatternInput = {
  title: string;
  categoryId: StrumCategoryId;
  timeSignature: TimeSignature;
  bpm: number;
  tags: string[];
  file: File;
};

export type CustomPatternRecord = Omit<CustomPatternInput, 'file'> & {
  id: string;
  imageBlob: Blob;
  createdAt: string;
};

const databaseName = 'lesson-designer-strum-viewer';
const storeName = 'custom-patterns';
const maxUploadBytes = 5 * 1024 * 1024;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'id' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomPattern(input: CustomPatternInput): Promise<CustomPatternRecord> {
  if (input.file.size > maxUploadBytes) {
    throw new Error('업로드 이미지는 5MB 이하여야 합니다.');
  }

  const database = await openDatabase();
  const record: CustomPatternRecord = {
    id: `custom-${crypto.randomUUID()}`,
    title: input.title,
    categoryId: input.categoryId,
    timeSignature: input.timeSignature,
    bpm: input.bpm,
    tags: input.tags,
    imageBlob: input.file,
    createdAt: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();
  return record;
}

export async function listCustomPatterns(): Promise<CustomPatternRecord[]> {
  const database = await openDatabase();

  const records = await new Promise<CustomPatternRecord[]>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as CustomPatternRecord[]);
    request.onerror = () => reject(request.error);
  });

  database.close();
  return records;
}
