import LoadingState from '../../components/ui/LoadingState';
import BookCard from './BookCard';
import CatalogEmptyState from './CatalogEmptyState';
import CatalogHeader from './CatalogHeader';
import CatalogPortalNotice from './CatalogPortalNotice';
import CatalogSearchBar from './CatalogSearchBar';
import CategoryChips from './CategoryChips';

export default function CatalogView({
  books,
  loading,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  availabilityFilter,
  setAvailabilityFilter,
  currentUser,
  portal = 'kiosk', // 'kiosk' | 'student' | 'admin'
  onSelectBook,
  onBorrow,
  onJoinWaitlist,
  onReturn,
  onRequestBook,
  loadingActionId,
  onOpenAddBook,
  onOpenBookRequest
}) {
  return (
    <div className="space-y-6">
      <CatalogHeader
        books={books}
        currentUser={currentUser}
        portal={portal}
        onOpenAddBook={onOpenAddBook}
        onOpenBookRequest={onOpenBookRequest}
      >
        <CatalogPortalNotice portal={portal} />
      </CatalogHeader>

      <CatalogSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        availabilityFilter={availabilityFilter}
        setAvailabilityFilter={setAvailabilityFilter}
      />

      <CategoryChips selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />

      {loading ? (
        <LoadingState message="Loading library catalog..." />
      ) : books.length === 0 ? (
        <CatalogEmptyState
          setSearchQuery={setSearchQuery}
          setSelectedCategory={setSelectedCategory}
          setAvailabilityFilter={setAvailabilityFilter}
          onOpenBookRequest={onOpenBookRequest}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pl-px pt-px">
          {books.map((book) => (
            <BookCard
              key={book.book_id}
              book={book}
              portal={portal}
              onSelect={onSelectBook}
              onBorrow={onBorrow}
              onJoinWaitlist={onJoinWaitlist}
              onReturn={onReturn}
              onRequestBook={onRequestBook}
              loadingActionId={loadingActionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
