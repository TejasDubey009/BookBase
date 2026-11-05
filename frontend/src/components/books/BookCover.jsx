import { useState } from 'react';

export default function BookCover({ book, className = "w-full h-full", isModal = false }) {
  const [hasError, setHasError] = useState(false);

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
      <div className={`${className} select-none overflow-hidden bg-shelf border border-line flex flex-col justify-between gap-2 p-2.5 text-left`}>
        <h4 className={`font-serif text-ink leading-snug line-clamp-4 ${isModal ? 'text-sm' : 'text-xs'}`}>
          {book.title}
        </h4>
        <p className="text-xs text-muted truncate">{book.author}</p>
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden bg-shelf border border-line`}>
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
