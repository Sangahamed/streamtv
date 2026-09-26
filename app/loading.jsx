export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <span className="h-10 w-10 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      <p className="font-mono text-xs text-dim tracking-wide">CHARGEMENT…</p>
    </div>
  );
}
