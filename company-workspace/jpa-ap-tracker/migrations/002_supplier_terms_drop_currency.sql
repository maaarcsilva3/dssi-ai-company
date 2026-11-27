-- Payment terms now belong to the supplier; payables keep a snapshot of the term used.
ALTER TABLE clients ADD COLUMN payment_term_id INTEGER REFERENCES payment_terms(id);

-- Backfill each supplier with the term from its most recent payable.
UPDATE clients c
   SET payment_term_id = (
     SELECT p.payment_term_id
       FROM payables p
      WHERE p.client_id = c.id AND p.payment_term_id IS NOT NULL
      ORDER BY p.created_at DESC
      LIMIT 1
   );

-- All amounts are Philippine peso.
ALTER TABLE payables DROP COLUMN currency;
