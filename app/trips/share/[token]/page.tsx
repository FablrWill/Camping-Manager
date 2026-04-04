import { prisma } from '@/lib/db';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

function formatDateRange(startDate: Date, endDate: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = startDate.toLocaleDateString('en-US', opts);
  const endOpts: Intl.DateTimeFormatOptions = {
    month: startDate.getMonth() === endDate.getMonth() ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const end = endDate.toLocaleDateString('en-US', endOpts);
  return `${start}–${end}`;
}

export default async function TripSharePage({ params }: SharePageProps) {
  const { token } = await params;

  const trip = await prisma.trip.findUnique({
    where: { shareToken: token },
    include: {
      location: {
        select: {
          name: true,
          latitude: true,
          longitude: true,
        },
      },
      mealPlan: {
        include: {
          meals: {
            select: { id: true, day: true, slot: true, name: true },
            orderBy: [{ day: 'asc' }, { slot: 'asc' }],
          },
        },
      },
      _count: {
        select: { packingItems: true },
      },
    },
  });

  if (!trip) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm p-8 text-center">
          <p className="text-2xl mb-3">🗺️</p>
          <h1 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">
            Trip not found
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            This link may have expired or been removed.
          </p>
        </div>
      </div>
    );
  }

  // Group meals by day for display
  const mealsByDay: Record<number, Array<{ id: string; slot: string; name: string }>> = {};
  if (trip.mealPlan) {
    for (const meal of trip.mealPlan.meals) {
      if (!mealsByDay[meal.day]) {
        mealsByDay[meal.day] = [];
      }
      mealsByDay[meal.day].push({ id: meal.id, slot: meal.slot, name: meal.name });
    }
  }

  const hasMeals = Object.keys(mealsByDay).length > 0;
  const dateRange = formatDateRange(trip.startDate, trip.endDate);

  // Build OSM link if location has coordinates
  const osmUrl =
    trip.location?.latitude && trip.location?.longitude
      ? `https://www.openstreetmap.org/?mlat=${trip.location.latitude}&mlon=${trip.location.longitude}#map=14/${trip.location.latitude}/${trip.location.longitude}`
      : null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm p-6 space-y-5">
          {/* Trip name */}
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white leading-tight">
            {trip.name}
          </h1>

          {/* Date range */}
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            {dateRange}
          </p>

          {/* Location */}
          {trip.location && (
            <div className="flex items-start gap-1.5 text-sm text-stone-700 dark:text-stone-300">
              <span className="mt-0.5">📍</span>
              {osmUrl ? (
                <a
                  href={osmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {trip.location.name}
                </a>
              ) : (
                <span>{trip.location.name}</span>
              )}
            </div>
          )}

          {/* Divider */}
          {(trip.journalEntry || trip._count.packingItems > 0 || hasMeals) && (
            <hr className="border-stone-200 dark:border-stone-700" />
          )}

          {/* Journal entry */}
          {trip.journalEntry && (
            <div>
              <h2 className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
                Journal
              </h2>
              <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
                {trip.journalEntry}
              </p>
            </div>
          )}

          {/* Gear count */}
          {trip._count.packingItems > 0 && (
            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              <span>🎒</span>
              <span>{trip._count.packingItems} item{trip._count.packingItems !== 1 ? 's' : ''} packed</span>
            </div>
          )}

          {/* Meal summary */}
          {hasMeals && (
            <div>
              <h2 className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
                Meals
              </h2>
              <div className="space-y-2">
                {Object.entries(mealsByDay)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, meals]) => (
                    <div key={day}>
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                        Day {day}
                      </p>
                      <ul className="space-y-0.5">
                        {meals.map((meal) => (
                          <li key={meal.id} className="text-sm text-stone-700 dark:text-stone-300">
                            <span className="text-stone-400 dark:text-stone-500 capitalize mr-1.5">
                              {meal.slot}:
                            </span>
                            {meal.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-400 dark:text-stone-600 mt-4">
          Shared from Outland OS
        </p>
      </div>
    </div>
  );
}
