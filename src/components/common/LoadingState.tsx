export default function LoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`loading-state${compact ? " loading-state--compact" : ""}`} role="status" aria-live="polite">
      <div className="loader" aria-hidden="true" />
      <span>Buscando dados</span>
    </div>
  );
}
