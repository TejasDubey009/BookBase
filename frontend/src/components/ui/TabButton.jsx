export default function TabButton({ active, onClick, id, children }) {
  return (
    <button
      onClick={onClick}
      id={id}
      className={`flex items-center gap-1.5 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
        active
          ? 'border-ink text-ink'
          : 'border-transparent text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
