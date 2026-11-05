/**
 * BookBase's data, straight from Supabase. Sign-in goes through Supabase Auth, and everything else
 * calls a database function (see supabase/functions.sql), which checks who is asking and applies
 * the library's rules. Each method returns the same shape the screens have always used.
 */
import { SUPABASE_SETUP_MESSAGE, supabase } from './supabase';

// Registers this browser as a kiosk. Unlike a sign-in, it stays when a student signs out.
const STORAGE_KIOSK_KEY = 'bb_kiosk_key';

export const saveKioskKey = (key) => localStorage.setItem(STORAGE_KIOSK_KEY, key);
const storedKioskKey = () => localStorage.getItem(STORAGE_KIOSK_KEY) || undefined;

function client() {
  if (!supabase) throw new Error(SUPABASE_SETUP_MESSAGE);
  return supabase;
}

/** Calls a database function. Arguments left undefined use the function's defaults. */
async function call(fn, args = {}) {
  const { data, error } = await client().rpc(fn, args);
  if (error) {
    const err = new Error(error.message || 'Request failed');
    err.code = error.code;
    err.hint = error.hint;
    throw err;
  }
  return data;
}

/** Signs out of this site only. Other sites and devices stay signed in. */
const signOutHere = () => client().auth.signOut({ scope: 'local' });

export const onAuthChange = (handler) => client().auth.onAuthStateChange(handler);

export const api = {
  // Auth. A sign-in is refused on the wrong portal: a student can't use the admin site, and the reverse.
  login: async (email, password, role) => {
    const { error } = await client().auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message);
    }
    const profile = await call('my_profile');
    if (!profile) {
      await signOutHere();
      throw new Error('This login has no library account.');
    }
    if (role && profile.role !== role) {
      await signOutHere();
      throw new Error(`This account is registered as a ${profile.role}, not ${role}`);
    }
    return { user: profile };
  },

  // Asks the database first, because Supabase Auth would only report a refused sign-up as a generic error
  register: async ({ full_name, enrollment_no, email, password, staff_code }) => {
    const problem = await call('registration_problem', {
      p_full_name: full_name,
      p_enrollment_no: enrollment_no,
      p_email: email,
      p_staff_code: staff_code,
    });
    if (problem) throw new Error(problem);

    const { data, error } = await client().auth.signUp({
      email,
      password,
      options: { data: { full_name, enrollment_no, ...(staff_code !== undefined && { staff_code }) } },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      throw new Error('Account created. Check your email to confirm it, then sign in.');
    }
    return { user: await call('my_profile') };
  },

  logout: signOutHere,

  getDemoUsers: () => call('demo_accounts'),

  getCurrentUser: async () => {
    const { data } = await client().auth.getSession();
    return data.session ? call('my_profile') : null;
  },

  // Books & Inventory
  getBooks: (params = {}) =>
    call('list_books', {
      p_search: params.search || undefined,
      p_category: params.category && params.category !== 'All' ? params.category : undefined,
      p_availability: params.availability && params.availability !== 'all' ? params.availability : undefined,
    }),

  getBookDetail: (bookId) => call('get_book', { p_book_id: bookId }),

  createBook: (book) =>
    call('create_book', {
      p_isbn: book.isbn,
      p_title: book.title,
      p_author: book.author,
      p_category: book.category,
      p_published_year: book.published_year,
      p_cover_url: book.cover_url,
      p_description: book.description,
      p_card_tint: book.card_tint,
      p_initial_copies_count: book.initial_copies_count,
      p_shelf_location: book.shelf_location,
    }),

  // Circulation & Waitlist Engine. A student's borrow or return needs this browser's kiosk key.
  checkoutBook: (bookId, barcode, kioskKey) =>
    call('checkout_book', {
      p_book_id: bookId,
      p_barcode: barcode || undefined,
      p_kiosk_key: kioskKey ?? storedKioskKey(),
    }),

  joinWaitlist: (bookId) => call('join_waitlist', { p_book_id: bookId }),

  cancelWaitlist: (reservationId) => call('cancel_reservation', { p_reservation_id: reservationId }),

  raiseReturnRequest: ({ loan_id, barcode, condition, notes }, kioskKey) =>
    call('raise_return_request', {
      p_loan_id: loan_id,
      p_barcode: barcode,
      p_condition: condition,
      p_notes: notes || undefined,
      p_kiosk_key: kioskKey ?? storedKioskKey(),
    }),

  confirmReturnRequest: (returnRequestId, condition) =>
    call('confirm_return_request', { p_return_request_id: returnRequestId, p_condition: condition }),

  rejectReturnRequest: (returnRequestId) =>
    call('reject_return_request', { p_return_request_id: returnRequestId }),

  getLendingPolicy: () => call('lending_policy'),

  // Dashboards & Admin
  getUserDashboard: (userId) => call('user_dashboard', { p_user_id: userId }),

  getAdminOverview: () => call('admin_overview'),

  getGroupedBooks: (search = '') => call('grouped_books', { p_search: search || undefined }),

  settleFine: (userId, amountSettled = null) =>
    call('settle_fine', { p_user_id: userId, p_amount: amountSettled ?? undefined }),

  // Accounts live in Supabase Auth, so a reset keeps them and nobody is signed out
  resetDemoDb: () => call('reset_library'),

  // Student book requests
  getBookRequests: () => call('list_book_requests'),

  createBookRequest: ({ title, author, category, notes, book_id }) =>
    call('create_book_request', {
      p_title: title,
      p_author: author || undefined,
      p_category: category || undefined,
      p_notes: notes || undefined,
      p_book_id: book_id || undefined,
    }),

  updateBookRequestStatus: (requestId, status) =>
    call('update_book_request_status', { p_request_id: requestId, p_status: status }),
};
