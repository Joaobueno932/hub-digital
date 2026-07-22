export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded bg-primary/10" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-primary/10" />
        <div className="h-40 animate-pulse rounded-xl bg-primary/10" />
      </div>
    </div>
  );
}
