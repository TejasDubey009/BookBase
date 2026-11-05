import CatalogView from '../features/catalog/CatalogView';
import MemberShelfView from '../features/shelf/MemberShelfView';

/** The screens students use. The kiosk and student sites differ in what `portal` allows on them. */
export default function MemberPortalViews({ app }) {
  return (
    <>
      {app.currentView === 'catalog' && <CatalogView {...app.catalogProps} />}
      {app.currentView === 'my-shelf' && app.currentUser && <MemberShelfView {...app.shelfProps} />}
    </>
  );
}
