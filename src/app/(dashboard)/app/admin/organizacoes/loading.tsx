export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Carregando organizações"
      className="mt-6 animate-pulse space-y-3"
    >
      <div className="h-6 w-48 rounded bg-muted/20" />
      <div className="h-40 rounded-xl bg-muted/10" />
    </div>
  );
}
