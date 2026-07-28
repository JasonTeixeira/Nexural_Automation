export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 h-10 w-10 rounded-full border-2 border-[var(--signal-active-border)] border-t-[var(--signal-active)] animate-spin" />
      <span className="text-sm text-gray-500 animate-pulse-glow">{text}</span>
    </div>
  );
}
