import { getAltitudeWarning } from '@/lib/altitude';

interface AltitudeCardProps {
  altitudeFt: number;
}

export default function AltitudeCard({ altitudeFt }: AltitudeCardProps) {
  const warning = getAltitudeWarning(altitudeFt);
  if (!warning) return null;

  const isHigh = warning.level === 'high';

  return (
    <div className={`rounded-xl p-4 ${
      isHigh
        ? 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800'
        : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">⛰️</span>
        <h3 className={`text-sm font-semibold ${
          isHigh ? 'text-orange-700 dark:text-orange-300' : 'text-amber-700 dark:text-amber-300'
        }`}>
          {isHigh ? 'High altitude destination' : 'Elevated campsite'}
        </h3>
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
          isHigh
            ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
            : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
        }`}>
          {Math.round(altitudeFt).toLocaleString()} ft
        </span>
      </div>
      <ul className={`text-xs space-y-1 list-disc list-inside ${
        isHigh ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400'
      }`}>
        {warning.tips.map((tip, i) => (
          <li key={i}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}
