import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/bookbase';

/** Catalog search and filter state, plus the results for the current combination. */
export function useCatalog({ currentUser, lastEventTimestamp }) {
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const fetchBooks = useCallback(() => {
    setBooksLoading(true);
    api.getBooks({
      search: searchQuery,
      category: selectedCategory,
      availability: availabilityFilter,
    })
      .then((data) => {
        setBooks(data);
        setBooksLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching books:', err);
        setBooksLoading(false);
      });
    // currentUser: each book's loan and waitlist context depends on who the session token belongs to
  }, [searchQuery, selectedCategory, availabilityFilter, currentUser, lastEventTimestamp]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return {
    books,
    booksLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    availabilityFilter,
    setAvailabilityFilter,
  };
}
