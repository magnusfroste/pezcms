import { cn } from '@/lib/utils';
import type { PageStatus } from '@/types/cms';
import { STATUS_LABELS, STATUS_ICONS } from '@/types/cms';

interface StatusBadgeProps {
  status: PageStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'status-badge',
        {
          'status-draft': status === 'draft',
          'status-reviewing': status === 'reviewing',
          'status-published': status === 'published',
          'status-archived': status === 'archived',
        },
        className
      )}
    >
      <span>{STATUS_ICONS[status]}</span>
      <span>{STATUS_LABELS[status]}</span>
    </span>
  );
}
