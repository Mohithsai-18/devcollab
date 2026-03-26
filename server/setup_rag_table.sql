-- RAG Index Status table for tracking project indexing state
CREATE TABLE IF NOT EXISTS rag_index_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  status ENUM('idle','indexing','ready','error') DEFAULT 'idle',
  docs_indexed INT DEFAULT 0,
  last_indexed_at TIMESTAMP NULL,
  error_message TEXT NULL,
  UNIQUE KEY (project_id)
);
