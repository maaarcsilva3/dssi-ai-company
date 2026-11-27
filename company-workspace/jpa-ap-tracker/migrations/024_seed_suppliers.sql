-- Seed suppliers (clients) from the provided supplier list.
INSERT INTO clients (name)
SELECT v.name
  FROM (VALUES
    ('E-COPY CORPORATION'),
    ('MURAHAMA TRUCKPARTS CENTER'),
    ('CARTRACK TECHNOLOGIES PHI. INC.'),
    ('SIR PATRICK SECURITY SERVICES'),
    ('LUBESTRADERS CORPORATION')
  ) AS v(name)
 WHERE NOT EXISTS (
   SELECT 1 FROM clients c WHERE lower(c.name) = lower(v.name)
 );
