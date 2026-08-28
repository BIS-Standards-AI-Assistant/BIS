export function InfoCard({
  title,
  available,
  notes,
  unavailableMessage,
}: {
  title: string;
  available: boolean;
  notes: string | null;
  unavailableMessage: string;
}) {
  return (
    <div className="border border-border bg-surface-raised p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
      {available && notes ? (
        <p className="mt-2 text-sm leading-relaxed text-ink">{notes}</p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-ink-faint">{unavailableMessage}</p>
      )}
    </div>
  );
}
