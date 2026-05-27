import clsx from 'clsx';

const STATUS = {
  draft:    { dot: 'bg-gray-400',   text: 'text-gray-700',  bg: 'bg-gray-100',   label: 'Draft' },
  pending:  { dot: 'bg-amber-500',  text: 'text-amber-700', bg: 'bg-amber-50',   label: 'Pending' },
  approved: { dot: 'bg-green-500',  text: 'text-green-700', bg: 'bg-green-50',   label: 'Approved' },
  rejected: { dot: 'bg-red-500',    text: 'text-red-700',   bg: 'bg-red-50',     label: 'Rejected' },
  active:   { dot: 'bg-green-500',  text: 'text-green-700', bg: 'bg-green-50',   label: 'Active' },
  archived: { dot: 'bg-gray-400',   text: 'text-gray-600',  bg: 'bg-gray-100',   label: 'Archived' },
  new:           { dot: 'bg-blue-500',   text: 'text-blue-700',  bg: 'bg-blue-50',    label: 'New' },
  under_review:  { dot: 'bg-amber-500',  text: 'text-amber-700', bg: 'bg-amber-50',   label: 'Under Review' },
  planned:       { dot: 'bg-purple-500', text: 'text-purple-700',bg: 'bg-purple-50',  label: 'Planned' },
  done:          { dot: 'bg-green-500',  text: 'text-green-700', bg: 'bg-green-50',   label: 'Done' },
  dismissed:     { dot: 'bg-gray-400',   text: 'text-gray-600',  bg: 'bg-gray-100',   label: 'Dismissed' },
};

export default function StatusBadge({ status, className }) {
  const s = STATUS[status] || STATUS.draft;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', s.bg, s.text, className)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}
