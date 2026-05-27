import clsx from 'clsx';

export default function BudgetBar({ logged, budget, forecast }) {
  const pct = budget > 0 ? Math.min((logged / budget) * 100, 100) : 0;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-green-500';
  const textColor = pct >= 100 ? 'text-red-600' : pct >= 75 ? 'text-amber-600' : 'text-green-600';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{logged.toFixed(1)}h / {budget}h</span>
        <span className={clsx('font-semibold', textColor)}>{pct.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={clsx('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      {forecast && <p className="text-xs text-gray-400">Forecast: {forecast}</p>}
    </div>
  );
}
