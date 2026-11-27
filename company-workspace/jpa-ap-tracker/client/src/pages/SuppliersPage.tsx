import { EntityManager, SUPPLIERS_ENTITY } from './MasterdataPage';

export default function SuppliersPage() {
  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p className="muted">Payable parties used on AP documents. Payment terms default onto new invoices.</p>
        </div>
      </div>
      <EntityManager entity={SUPPLIERS_ENTITY} />
    </section>
  );
}
