import TabButton from '../../components/ui/TabButton';
import { BOOK_CATEGORIES } from '../../constants/catalog';

const CATEGORIES = ['All', ...BOOK_CATEGORIES];

export default function CategoryChips({ selectedCategory, setSelectedCategory }) {
  return (
    <div className="flex items-center gap-6 border-b border-line overflow-x-auto no-scrollbar">
      {CATEGORIES.map((cat) => (
        <TabButton key={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)}>
          {cat}
        </TabButton>
      ))}
    </div>
  );
}
