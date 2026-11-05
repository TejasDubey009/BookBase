import { BookPlus, Monitor, Smartphone } from 'lucide-react';

/** Explains what the current portal allows. The admin portal shows no notice. */
export default function CatalogPortalNotice({ portal, onOpenBookRequest }) {
  if (portal === 'kiosk') {
    return (
      <div className="bg-indigo-900 text-indigo-100 p-4 rounded-2xl flex items-center justify-between border border-indigo-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-800 flex items-center justify-center text-white shrink-0">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              Portal 1 • Central Library Kiosk (On-Premise Terminal)
            </div>
            <div className="text-xs text-indigo-100 font-medium">
              Physical borrowing and return station. Click "Borrow Book at Kiosk" below to instantly check out an available copy.
            </div>
          </div>
        </div>
        <button
          onClick={onOpenBookRequest}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-white text-xs font-semibold border border-indigo-600 transition-colors"
        >
          <BookPlus className="w-3.5 h-3.5" />
          <span>Request Unavailable Title</span>
        </button>
      </div>
    );
  }

  if (portal === 'student') {
    return (
      <div className="bg-emerald-900 text-emerald-100 p-4 rounded-2xl flex items-center justify-between border border-emerald-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center text-white shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              Portal 3 • Student Personal Portal (Remote Discovery Mode)
            </div>
            <div className="text-xs text-emerald-100 font-medium">
              Remote catalogue inquiry. Checkout and returns are restricted to the Central Library Kiosk. You may submit book procurement requests below.
            </div>
          </div>
        </div>
        <button
          onClick={onOpenBookRequest}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold border border-emerald-600 transition-colors"
        >
          <BookPlus className="w-3.5 h-3.5" />
          <span>Request Book</span>
        </button>
      </div>
    );
  }

  return null;
}
