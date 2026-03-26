/**
 * Vector Store Service — ChromaDB wrapper for per-project document storage
 * Stores embeddings persistently in server/chroma_data/
 */

const { ChromaClient } = require('chromadb');
const { LocalEmbeddings } = require('./embeddingService');

let client = null;
const embeddingModel = new LocalEmbeddings();

/**
 * Get or create the ChromaDB client (persistent, local)
 */
const getClient = () => {
  if (!client) {
    client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });
    console.log('✅ ChromaDB client initialized');
  }
  return client;
};

/**
 * Get the collection name for a project
 */
const getCollectionName = (projectId) => `project_${projectId}_docs`;

/**
 * Get or create a collection for a project
 */
const getCollection = async (projectId) => {
  const chroma = getClient();
  const name = getCollectionName(projectId);
  return chroma.getOrCreateCollection({
    name,
    metadata: { 'hnsw:space': 'cosine' },
  });
};

/**
 * Add documents to a project's vector store
 * @param {number} projectId
 * @param {Array<{id: string, content: string, metadata: object}>} docs
 */
const addDocuments = async (projectId, docs) => {
  if (!docs.length) return;

  const collection = await getCollection(projectId);

  // Process in batches of 20
  const batchSize = 20;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);

    const ids = batch.map(d => d.id);
    const documents = batch.map(d => d.content);
    const metadatas = batch.map(d => d.metadata || {});

    // Generate embeddings
    const embeddings = await embeddingModel.embedDocuments(documents);

    await collection.add({
      ids,
      documents,
      metadatas,
      embeddings,
    });
  }
};

/**
 * Semantic search within a project's vector store
 * @param {number} projectId
 * @param {string} query
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array<{content: string, metadata: object, distance: number}>>}
 */
const search = async (projectId, query, topK = 8) => {
  const collection = await getCollection(projectId);

  // Generate query embedding
  const queryEmbedding = await embeddingModel.embedQuery(query);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    include: ['documents', 'metadatas', 'distances'],
  });

  if (!results.documents?.[0]) return [];

  return results.documents[0].map((doc, idx) => ({
    content: doc,
    metadata: results.metadatas?.[0]?.[idx] || {},
    distance: results.distances?.[0]?.[idx] || 0,
  }));
};

/**
 * Delete a project's entire collection (for re-indexing)
 */
const deleteCollection = async (projectId) => {
  const chroma = getClient();
  const name = getCollectionName(projectId);
  try {
    await chroma.deleteCollection({ name });
    console.log(`🗑️ Deleted collection: ${name}`);
  } catch (err) {
    // Collection might not exist — that's fine
    console.log(`Collection ${name} not found for deletion, skipping.`);
  }
};

/**
 * Get the count of documents in a project's collection
 */
const getDocCount = async (projectId) => {
  try {
    const collection = await getCollection(projectId);
    return await collection.count();
  } catch {
    return 0;
  }
};

module.exports = { addDocuments, search, deleteCollection, getDocCount, getCollection, getClient };
