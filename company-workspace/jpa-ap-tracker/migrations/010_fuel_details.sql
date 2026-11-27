-- Fuel deliveries: liters and price compute the gross; VAT and EWT still apply to that gross.

INSERT INTO payment_types (name)
SELECT 'Fuel'
 WHERE NOT EXISTS (SELECT 1 FROM payment_types WHERE lower(name) = 'fuel');

ALTER TABLE payables
  ADD COLUMN fuel_liters NUMERIC(14, 3),
  ADD COLUMN fuel_price_per_liter NUMERIC(14, 4),
  ADD COLUMN fuel_order_date DATE,
  ADD COLUMN fuel_delivery_date DATE,
  ADD COLUMN fuel_delivery_receipt TEXT;

ALTER TABLE payables
  ADD CONSTRAINT payables_fuel_liters_ck CHECK (fuel_liters IS NULL OR fuel_liters > 0),
  ADD CONSTRAINT payables_fuel_price_ck CHECK (fuel_price_per_liter IS NULL OR fuel_price_per_liter > 0);
