/**
 * IndexedDB utility for storing PDF documents, progress, and chat messages
 * All data stays on-device for Edge AI privacy
 */

const DB_NAME = 'insight-loop-db';
const DB_VERSION = 2;

// Object store names
const STORES = {
  DOCUMENTS: 'documents',
  MESSAGES: 'messages',
  PROGRESS: 'progress'
};

/**
 * Initialize IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion;

      console.log(`IndexedDB upgrading from version ${oldVersion} to ${newVersion}`);

      // Documents store: stores PDF files and metadata
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        const documentsStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id', autoIncrement: true });
        documentsStore.createIndex('fileName', 'fileName', { unique: false });
        documentsStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }

      // Messages store: stores chat messages linked to documents
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id', autoIncrement: true });
        messagesStore.createIndex('documentId', 'documentId', { unique: false });
        messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Progress store: stores student progress for each document
      if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
        const progressStore = db.createObjectStore(STORES.PROGRESS, { keyPath: 'documentId' });
      }
    };

    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked - please close other tabs with this app open');
    };
  });
};

/**
 * Convert File to ArrayBuffer for storage
 * @param {File} file - The file to convert
 * @returns {Promise<ArrayBuffer>}
 */
const fileToArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Convert ArrayBuffer back to File
 * @param {ArrayBuffer} arrayBuffer - The array buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - MIME type (e.g., 'application/pdf')
 * @returns {File}
 */
const arrayBufferToFile = (arrayBuffer, fileName, mimeType) => {
  return new File([arrayBuffer], fileName, { type: mimeType });
};

/**
 * Save a PDF document to IndexedDB
 * @param {File} pdfFile - The PDF file to save
 * @returns {Promise<number>} - The document ID
 */
export const saveDocument = async (pdfFile) => {
  const db = await initDB();
  const arrayBuffer = await fileToArrayBuffer(pdfFile);

  const document = {
    fileName: pdfFile.name,
    fileSize: pdfFile.size,
    fileData: arrayBuffer,
    uploadedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DOCUMENTS], 'readwrite');
    const store = transaction.objectStore(STORES.DOCUMENTS);
    const request = store.add(document);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all documents, sorted by last accessed time
 * @returns {Promise<Array>}
 */
export const getAllDocuments = async () => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DOCUMENTS], 'readonly');
    const store = transaction.objectStore(STORES.DOCUMENTS);
    const index = store.index('uploadedAt');
    const request = index.getAll();

    request.onsuccess = () => {
      const documents = request.result
        .map(doc => ({
          id: doc.id,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt,
          lastAccessedAt: doc.lastAccessedAt
        }))
        .sort((a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt));
      resolve(documents);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get a document by ID and convert back to File
 * @param {number} documentId - The document ID
 * @returns {Promise<File>}
 */
export const getDocument = async (documentId) => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DOCUMENTS], 'readwrite');
    const store = transaction.objectStore(STORES.DOCUMENTS);
    const request = store.get(documentId);

    request.onsuccess = () => {
      if (!request.result) {
        reject(new Error('Document not found'));
        return;
      }

      const doc = request.result;
      
      // Update last accessed time
      doc.lastAccessedAt = new Date().toISOString();
      const updateRequest = store.put(doc);
      updateRequest.onsuccess = () => {
        const file = arrayBufferToFile(doc.fileData, doc.fileName, 'application/pdf');
        resolve(file);
      };
      updateRequest.onerror = () => reject(updateRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete a document and its associated data
 * @param {number} documentId - The document ID
 * @returns {Promise<void>}
 */
export const deleteDocument = async (documentId) => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DOCUMENTS, STORES.MESSAGES, STORES.PROGRESS], 'readwrite');

    // Delete document
    const documentsStore = transaction.objectStore(STORES.DOCUMENTS);
    documentsStore.delete(documentId);

    // Delete all messages for this document
    const messagesStore = transaction.objectStore(STORES.MESSAGES);
    const messagesIndex = messagesStore.index('documentId');
    const messagesRequest = messagesIndex.openCursor(IDBKeyRange.only(documentId));
    messagesRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Delete progress for this document
    const progressStore = transaction.objectStore(STORES.PROGRESS);
    progressStore.delete(documentId);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

/**
 * Save a chat message
 * @param {number} documentId - The document ID
 * @param {string} text - Message text
 * @param {string} type - Message type ('user' or 'tutor')
 * @returns {Promise<number>} - The message ID
 */
export const saveMessage = async (documentId, text, type) => {
  const db = await initDB();

  const message = {
    documentId,
    text,
    type,
    timestamp: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORES.MESSAGES);
    const request = store.add(message);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all messages for a document
 * @param {number} documentId - The document ID
 * @returns {Promise<Array>}
 */
export const getMessages = async (documentId) => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MESSAGES], 'readonly');
    const store = transaction.objectStore(STORES.MESSAGES);
    const index = store.index('documentId');
    const request = index.getAll(documentId);

    request.onsuccess = () => {
      const messages = request.result
        .map(msg => ({
          id: msg.id,
          text: msg.text,
          type: msg.type,
          timestamp: msg.timestamp
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      resolve(messages);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save student progress for a document
 * @param {number} documentId - The document ID
 * @param {Object} progress - Progress data
 * @param {number} progress.currentPage - Current page number
 * @param {Array<number>} progress.visitedPages - Array of visited page numbers
 * @returns {Promise<void>}
 */
export const saveProgress = async (documentId, progress) => {
  const db = await initDB();

  const progressData = {
    documentId,
    currentPage: progress.currentPage,
    visitedPages: Array.from(progress.visitedPages), // Convert Set to Array
    updatedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PROGRESS], 'readwrite');
    const store = transaction.objectStore(STORES.PROGRESS);
    const request = store.put(progressData);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get progress for a document
 * @param {number} documentId - The document ID
 * @returns {Promise<Object|null>}
 */
export const getProgress = async (documentId) => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PROGRESS], 'readonly');
    const store = transaction.objectStore(STORES.PROGRESS);
    const request = store.get(documentId);

    request.onsuccess = () => {
      if (!request.result) {
        resolve(null);
        return;
      }

      const progress = request.result;
      resolve({
        currentPage: progress.currentPage,
        visitedPages: new Set(progress.visitedPages) // Convert Array back to Set
      });
    };
    request.onerror = () => reject(request.error);
  });
};

