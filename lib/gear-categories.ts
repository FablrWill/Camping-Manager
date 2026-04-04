export type CategoryValue =
  | 'shelter' | 'sleep' | 'cook' | 'hydration' | 'clothing'
  | 'lighting' | 'tools' | 'safety' | 'furniture'
  | 'power' | 'electronics' | 'vehicle'
  | 'navigation' | 'hiking' | 'dog' | 'activities'

export interface Category {
  value: CategoryValue
  label: string
  emoji: string
}

export interface CategoryGroup {
  name: string
  categories: Category[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: 'Living',
    categories: [
      { value: 'shelter',   label: 'Shelter',   emoji: '⛺' },
      { value: 'sleep',     label: 'Sleep',     emoji: '🛏️' },
      { value: 'cook',      label: 'Cook',      emoji: '🍳' },
      { value: 'hydration', label: 'Hydration', emoji: '💧' },
      { value: 'clothing',  label: 'Clothing',  emoji: '🧥' },
    ],
  },
  {
    name: 'Utility',
    categories: [
      { value: 'lighting',  label: 'Lighting',  emoji: '💡' },
      { value: 'tools',     label: 'Tools',     emoji: '🔧' },
      { value: 'safety',    label: 'Safety',    emoji: '🛟' },
      { value: 'furniture', label: 'Furniture', emoji: '🪑' },
    ],
  },
  {
    name: 'Tech/Power',
    categories: [
      { value: 'power',       label: 'Power',       emoji: '🔋' },
      { value: 'electronics', label: 'Electronics', emoji: '📡' },
      { value: 'vehicle',     label: 'Vehicle',     emoji: '🚙' },
    ],
  },
  {
    name: 'Action',
    categories: [
      { value: 'navigation',  label: 'Navigation',  emoji: '🧭' },
      { value: 'hiking',      label: 'Hiking',      emoji: '🥾' },
      { value: 'activities',  label: 'Activities',   emoji: '🎯' },
      { value: 'dog',         label: 'Dog',          emoji: '🐕' },
    ],
  },
]

export const CATEGORIES: Category[] =
  CATEGORY_GROUPS.flatMap((g) => g.categories)

export const CATEGORY_EMOJI: Record<string, string> =
  Object.fromEntries(CATEGORIES.map((c) => [c.value, c.emoji]))

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? '📦'
}

export function getCategoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category
}
