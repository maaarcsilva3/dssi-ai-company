import type { Payable } from '../api';
import { formatDate, formatMoney } from '../format';
import { roundMoney } from '../tax';

export function isFuelType(name: string | null | undefined): boolean {
  return (name ?? '').trim().toLowerCase() === 'fuel';
}

export function fuelTotalAmount(liters: string | number | null | undefined, price: string | number | null | undefined): number | null {
  const l = Number(liters);
  const p = Number(price);
  if (!Number.isFinite(l) || !Number.isFinite(p) || l <= 0 || p <= 0) return null;
  return roundMoney(l * p);
}

/** Expanded delivery breakdown for a fuel payable. */
export function FuelDetailsRow({
  payable,
  colSpan,
}: {
  payable: Pick<
    Payable,
    'fuel_liters' | 'fuel_price_per_liter' | 'fuel_order_date' | 'fuel_delivery_date' | 'fuel_delivery_receipt'
  >;
  colSpan: number;
}) {
  const total = fuelTotalAmount(payable.fuel_liters, payable.fuel_price_per_liter);
  return (
    <tr className="invoice-accordion-row">
      <td colSpan={colSpan}>
        <table className="invoice-lines-table">
          <thead>
            <tr>
              <th className="num">Liters</th>
              <th className="num">Price per liter</th>
              <th className="num">Total amount</th>
              <th>Order date</th>
              <th>Delivery date</th>
              <th>Delivery receipt number</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num">{payable.fuel_liters ?? <span className="muted">-</span>}</td>
              <td className="num">
                {payable.fuel_price_per_liter ? formatMoney(payable.fuel_price_per_liter) : <span className="muted">-</span>}
              </td>
              <td className="num">{total != null ? formatMoney(total) : <span className="muted">-</span>}</td>
              <td>{payable.fuel_order_date ? formatDate(payable.fuel_order_date) : <span className="muted">-</span>}</td>
              <td>{payable.fuel_delivery_date ? formatDate(payable.fuel_delivery_date) : <span className="muted">-</span>}</td>
              <td>{payable.fuel_delivery_receipt?.trim() || <span className="muted">-</span>}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}
