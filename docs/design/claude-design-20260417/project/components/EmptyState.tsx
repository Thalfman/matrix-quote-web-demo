export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="card p-10 text-center">
      <div className="font-medium">{title}</div>
      {body && <div className="muted text-sm mt-2 max-w-md mx-auto">{body}</div>}
    </div>
  );
}
