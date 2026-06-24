// בוצע = green, לא בוצע = red — matching the completion colors in WorkSchedulePage.
export const statusClass = (isDone: boolean | null) =>
  isDone
    ? 'bg-green-100 border-green-300 text-green-800'
    : 'bg-red-100 border-red-300 text-red-800';

export const statusText = (s: {
  is_done: boolean | null;
  status_label: string | null;
}) => s.status_label || (s.is_done ? 'בוצע' : 'לא בוצע');
