import clsx from 'clsx';

export default function SummaryCard({ label, value, sub, icon: Icon, accent, onClick }) {
  return (
    <div
      className={clsx('card card-body flex items-start gap-4', onClick && 'cursor-pointer hover:shadow-md transition-shadow')}
      onClick={onClick}
    >
      {Icon && (
        <div className={clsx('p-2.5 rounded-lg', accent || 'bg-primary-light')}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
