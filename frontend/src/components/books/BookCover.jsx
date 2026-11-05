import { useState } from 'react';
import { BookOpen, Database, Cpu, Brain, TrendingUp, Binary } from 'lucide-react';
import { TINT_COVER_THEMES } from './coverThemes';

const CATEGORY_ICONS = {
  'Core Computer Science': Binary,
  'Systems & Security': Cpu,
  'Business & Management': TrendingUp,
  'Data Science & AI': Brain,
  'Banking Tech & FinTech': Database,
};

export default function BookCover({ book, className = "w-full h-full", isModal = false }) {
  const [hasError, setHasError] = useState(false);
  const theme = TINT_COVER_THEMES[book.card_tint] || TINT_COVER_THEMES.indigo;
  const CategoryIcon = CATEGORY_ICONS[book.category] || BookOpen;

  const handleImageLoad = (e) => {
    // OpenLibrary returns 1x1 transparent GIF (naturalWidth <= 1 or naturalHeight <= 1) for missing covers
    if (e.target.naturalWidth <= 1 || e.target.naturalHeight <= 1) {
      setHasError(true);
    }
  };

  const handleImageError = () => {
    setHasError(true);
  };

  if (hasError || !book.cover_url) {
    return (
      <div
        className={`${className} relative select-none overflow-hidden bg-gradient-to-br ${theme.bg} text-white flex flex-col justify-between p-3.5 shadow-md`}
      >
        {/* Subtle Spine Highlight */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/50 via-black/10 to-transparent pointer-events-none z-10 border-r border-white/10"></div>

        {/* Embossed Gold Border Frame */}
        <div className={`absolute inset-2 border ${theme.gold} rounded pointer-events-none opacity-60`}></div>

        {/* Top Header Tag */}
        <div className="relative z-10 pt-1 px-1 flex items-center justify-between">
          <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-slate-300 opacity-90 truncate max-w-[85%]">
            {book.category}
          </span>
          <CategoryIcon className={`w-3.5 h-3.5 ${theme.icon} opacity-80 flex-shrink-0`} />
        </div>

        {/* Center Title & Topic Icon */}
        <div className="relative z-10 my-auto px-1 text-center space-y-1.5">
          <div className="w-7 h-7 mx-auto rounded-full bg-white/10 border border-white/15 flex items-center justify-center shadow-inner">
            <BookOpen className="w-3.5 h-3.5 text-white/90" />
          </div>
          <h4 className={`font-serif font-bold text-white tracking-tight leading-snug line-clamp-3 ${isModal ? 'text-sm' : 'text-xs'}`}>
            {book.title}
          </h4>
          <div className="w-8 h-px bg-white/20 mx-auto"></div>
        </div>

        {/* Bottom Author & Footnote */}
        <div className="relative z-10 pb-1 px-1 text-center">
          <p className="text-[10px] font-medium text-slate-300 truncate tracking-wide">
            {book.author}
          </p>
          <span className="text-[8px] font-mono text-slate-400 opacity-75">
            EDITION • {book.published_year}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-slate-100`}>
      <img
        src={book.cover_url}
        alt={book.title}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
