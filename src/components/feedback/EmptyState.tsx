export function EmptyState({ title, body, tips }: { title: string; body: string; tips?: string[] }) {
  return (
    <div className="border border-dashed border-border-strong bg-surface-alt p-6 text-center">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{body}</p>
      {tips && tips.length > 0 && (
        <ul className="mx-auto mt-3 inline-block text-left text-sm text-ink-soft">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-ink-faint">•</span>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
