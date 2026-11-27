-- Reject / anytime statuses: sort_order 0 can be chosen from any workflow step.
-- Move Cancelled to sort_order 0 and seed Rejected the same way.

UPDATE payable_statuses
   SET sort_order = 0,
       category = 'cancelled',
       color = COALESCE(NULLIF(color, ''), '#4b5563'),
       active = TRUE,
       updated_at = now()
 WHERE lower(name) = 'cancelled';

INSERT INTO payable_statuses (name, category, color, sort_order, active)
SELECT 'Rejected', 'cancelled', '#b91c1c', 0, TRUE
 WHERE NOT EXISTS (
   SELECT 1 FROM payable_statuses s WHERE lower(s.name) = 'rejected'
 );

UPDATE payable_statuses
   SET category = 'cancelled',
       color = '#b91c1c',
       sort_order = 0,
       active = TRUE,
       updated_at = now()
 WHERE lower(name) = 'rejected';
