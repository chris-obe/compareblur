export function Stub({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="border border-line px-8 py-10 text-center">
        <div className="label mb-2">Coming soon</div>
        <div className="text-lg font-bold tracking-tight">{name}</div>
      </div>
    </div>
  );
}
