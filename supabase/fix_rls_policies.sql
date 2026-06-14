-- Policies for opportunity_line_items
CREATE POLICY "Users can view line items of visible opportunities"
  ON opportunity_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_line_items.opportunity_id 
    )
  );

CREATE POLICY "Users can insert line items"
  ON opportunity_line_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_id 
    )
  );

CREATE POLICY "Users can update line items of owned opportunities"
  ON opportunity_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_line_items.opportunity_id 
    )
  );

CREATE POLICY "Users can delete line items of owned opportunities"
  ON opportunity_line_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_line_items.opportunity_id 
    )
  );


-- Policies for opportunity_documents (AI Documents)
CREATE POLICY "Users can view AI documents"
  ON opportunity_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_documents.opportunity_id 
    )
  );

CREATE POLICY "Users can insert AI documents"
  ON opportunity_documents FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_id 
    )
  );

CREATE POLICY "Users can update AI documents"
  ON opportunity_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_documents.opportunity_id 
    )
  );

CREATE POLICY "Users can delete AI documents"
  ON opportunity_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_documents.opportunity_id 
    )
  );
