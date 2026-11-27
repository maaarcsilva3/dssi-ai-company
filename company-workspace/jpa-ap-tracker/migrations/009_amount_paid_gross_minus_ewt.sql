-- Amount paid is gross minus EWT. VAT stays the EWT base and is not deducted again.
-- Withdrawals that still match the old payable amount are moved to the new amount first.

UPDATE source_account_transactions t
   SET withdraw_amount = p.gross_amount - p.ewt_amount
  FROM payables p
 WHERE t.payable_id = p.id
   AND t.withdraw_amount > 0
   AND t.withdraw_amount = p.amount
   AND p.gross_amount - p.ewt_amount > 0
   AND t.withdraw_amount IS DISTINCT FROM (p.gross_amount - p.ewt_amount);

UPDATE payable_invoices
   SET net_amount = gross_amount - ewt_amount
 WHERE gross_amount - ewt_amount > 0
   AND net_amount IS DISTINCT FROM (gross_amount - ewt_amount);

UPDATE payables
   SET amount = gross_amount - ewt_amount
 WHERE gross_amount - ewt_amount > 0
   AND amount IS DISTINCT FROM (gross_amount - ewt_amount);
