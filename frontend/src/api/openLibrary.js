/**
 * OpenLibrary: the one external service the frontend calls directly,
 * to pre-fill book details from an ISBN.
 */

export const coverUrlForIsbn = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

/** Returns the OpenLibrary record for an ISBN, or undefined if it has none. */
export async function fetchBookByIsbn(isbn) {
  const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  const data = await res.json();
  return data[`ISBN:${isbn}`];
}
