ALTER TABLE opportunity_documents DROP CONSTRAINT opportunity_documents_doc_type_check;
ALTER TABLE opportunity_documents ADD CONSTRAINT opportunity_documents_doc_type_check CHECK (doc_type IN ('design', 'diagram', 'boq', 'bc', 'timeline'));
