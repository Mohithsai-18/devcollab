/**
 * Embedding Service — Local HuggingFace embeddings via @xenova/transformers
 * Model: all-MiniLM-L6-v2 (384 dimensions, runs locally, no API key needed)
 */

const { Embeddings } = require('@langchain/core/embeddings');

let pipeline = null;
let embeddingPipeline = null;

// Lazy-load the transformers pipeline (first call takes ~5s, cached after)
const getEmbeddingPipeline = async () => {
  if (embeddingPipeline) return embeddingPipeline;

  // Dynamic import for ESM module
  const { pipeline: transformersPipeline } = await import('@xenova/transformers');
  embeddingPipeline = await transformersPipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    { quantized: true }
  );
  console.log('✅ Embedding model loaded: all-MiniLM-L6-v2');
  return embeddingPipeline;
};

/**
 * Generate embeddings for a single text
 * @param {string} text
 * @returns {Promise<number[]>} 384-dim embedding vector
 */
const embedText = async (text) => {
  const pipe = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
};

/**
 * Generate embeddings for multiple texts (batched)
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
const embedTexts = async (texts) => {
  const results = [];
  // Process in batches of 10 to avoid memory issues
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(t => embedText(t)));
    results.push(...batchResults);
  }
  return results;
};

/**
 * LangChain-compatible Embeddings class
 * Wraps our local model so it works with LangChain's Chroma integration
 */
class LocalEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  async embedDocuments(documents) {
    return embedTexts(documents);
  }

  async embedQuery(query) {
    return embedText(query);
  }
}

module.exports = { embedText, embedTexts, LocalEmbeddings, getEmbeddingPipeline };
