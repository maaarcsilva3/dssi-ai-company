import type { PayableStatus } from '../api';

const WORKFLOW_ORDERS = [10, 20, 30, 40, 50];

export function WorkflowStepper({
  statuses,
  currentStatusId,
  isDraft,
}: {
  statuses: PayableStatus[] | undefined;
  currentStatusId: number;
  isDraft?: boolean;
}) {
  if (isDraft || !statuses?.length) return null;
  const steps = WORKFLOW_ORDERS.map((order) =>
    statuses.find((s) => s.active && s.sort_order === order),
  ).filter((s): s is PayableStatus => Boolean(s));
  if (!steps.length) return null;
  const current = statuses.find((s) => s.id === currentStatusId);
  const currentOrder = current?.sort_order ?? 0;

  return (
    <nav className="workflow-stepper span-all" aria-label="Payable workflow">
      <ol
        role="list"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.35rem',
          listStyle: 'none',
          padding: 0,
          margin: '0 0 0.75rem',
        }}
      >
        {steps.map((step) => {
          const state =
            step.sort_order === currentOrder
              ? 'current'
              : step.sort_order < currentOrder
                ? 'complete'
                : 'upcoming';
          const bg =
            state === 'current'
              ? `${step.color}26`
              : state === 'complete'
                ? `${step.color}12`
                : 'transparent';
          return (
            <li
              key={step.id}
              aria-current={state === 'current' ? 'step' : undefined}
              title={step.name}
              style={{
                fontSize: '12px',
                padding: '0.25rem 0.5rem',
                borderRadius: '999px',
                border: `1px solid ${state === 'upcoming' ? '#d1d5db' : step.color}`,
                background: bg,
                color: state === 'upcoming' ? '#6b7280' : step.color,
                maxWidth: '11rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {step.name}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}