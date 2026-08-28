export function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div role="alert" className="border border-danger/40 bg-danger-soft p-5">
      <h2 className="text-sm font-semibold text-danger">{title}</h2>
      <p className="mt-1 text-sm text-ink">{body}</p>
    </div>
  );
}
