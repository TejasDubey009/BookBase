import { BOOK_CATEGORIES } from '../../constants/catalog';

const CATEGORIES = ['All', ...BOOK_CATEGORIES];

export default function CategoryChips({ selectedCategory, setSelectedCategory }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
        Subject Area:
      </span>
      {CATEGORIES.map((cat) => {
        const active = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              active
                ? 'bg-indigo-900 text-white font-semibold shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
