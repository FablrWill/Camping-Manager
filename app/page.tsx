import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold text-stone-800 mb-2">Camp Commander</h2>
        <p className="text-stone-500">Your gear. Your rig. Your spots.</p>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/gear"
          className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 hover:border-amber-400 transition-colors text-center"
        >
          <div className="text-3xl mb-2">🎒</div>
          <h3 className="font-semibold text-stone-700">Gear</h3>
          <p className="text-sm text-stone-400 mt-1">Inventory &amp; wish list</p>
        </Link>

        <Link
          href="/vehicle"
          className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 hover:border-amber-400 transition-colors text-center"
        >
          <div className="text-3xl mb-2">🚙</div>
          <h3 className="font-semibold text-stone-700">Vehicle</h3>
          <p className="text-sm text-stone-400 mt-1">Specs &amp; mods</p>
        </Link>

        <Link
          href="/spots"
          className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 hover:border-amber-400 transition-colors text-center"
        >
          <div className="text-3xl mb-2">📍</div>
          <h3 className="font-semibold text-stone-700">Spots</h3>
          <p className="text-sm text-stone-400 mt-1">Saved locations</p>
        </Link>

        <Link
          href="/trips"
          className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 hover:border-amber-400 transition-colors text-center"
        >
          <div className="text-3xl mb-2">🏕️</div>
          <h3 className="font-semibold text-stone-700">Trips</h3>
          <p className="text-sm text-stone-400 mt-1">Plan &amp; journal</p>
        </Link>
      </div>
    </div>
  );
}
