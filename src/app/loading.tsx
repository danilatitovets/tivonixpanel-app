export default function Loading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-paper-white)] px-6 text-center text-[var(--color-carbon-black)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-sunrise-coral)] border-t-transparent" />
        <p className="text-[15px] text-[var(--color-zinc-gray)]">Загрузка…</p>
      </div>
    </main>
  );
}
