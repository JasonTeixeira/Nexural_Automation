export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin mb-4" />
      <span className="text-sm text-gray-500 animate-pulse-glow">{text}</span>
    </div>
  );
}
