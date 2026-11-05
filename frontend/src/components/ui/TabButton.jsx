export default function TabButton({ active, onClick, icon: Icon, id, children }) {
  return (
    <button
      onClick={onClick}
      id={id}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
        active
          ? 'bg-indigo-900 text-white shadow-xs'
          : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}
