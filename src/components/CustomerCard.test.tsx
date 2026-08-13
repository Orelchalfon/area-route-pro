import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CustomerCard } from './CustomerCard';
import { Customer } from '@/types';

// The whole card is clickable *and* carries its own buttons and tel:/mailto: links. Every one of
// those sits inside the card's click target, so without stopPropagation a single click on the
// pencil would open the edit dialog and the details dialog at once. These tests pin that split.

const customer: Customer = {
  id: 'db-cust-1',
  name: 'ישראל ישראלי',
  phone: '050-1234567',
  address: 'הרצל 1',
  city: 'טולכרם',
  email: 'test@example.com',
  product: 'מסנן',
  filterReplacementMonth: 3,
};

function renderCard(overrides: Partial<Parameters<typeof CustomerCard>[0]> = {}) {
  const onEdit = vi.fn();
  const onShowDetails = vi.fn();
  const onShowHistory = vi.fn();
  render(
    <CustomerCard
      customer={customer}
      onEdit={onEdit}
      onShowDetails={onShowDetails}
      onShowHistory={onShowHistory}
      {...overrides}
    />,
  );
  return { onEdit, onShowDetails, onShowHistory };
}

describe('CustomerCard', () => {
  it('opens the details dialog when the card body is clicked', () => {
    const { onShowDetails, onEdit } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: `פרטי הלקוח ${customer.name}` }));

    expect(onShowDetails).toHaveBeenCalledWith(customer);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('opens only the edit dialog when the pencil is clicked', () => {
    const { onEdit, onShowDetails } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'עריכה' }));

    expect(onEdit).toHaveBeenCalledWith(customer);
    expect(onShowDetails).not.toHaveBeenCalled();
  });

  it('opens only the history dialog when the history button is clicked', () => {
    const { onShowHistory, onShowDetails } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: /היסטוריה/ }));

    expect(onShowHistory).toHaveBeenCalledWith(customer);
    expect(onShowDetails).not.toHaveBeenCalled();
  });

  it('leaves the phone link to dial without also opening the details dialog', () => {
    const { onShowDetails } = renderCard();

    // jsdom warns loudly when it tries to follow the tel: href; the click still reaches the
    // anchor's own handler, which is the part under test.
    const swallowNavigation = (e: Event) => e.preventDefault();
    document.addEventListener('click', swallowNavigation);
    fireEvent.click(screen.getByText(customer.phone));
    document.removeEventListener('click', swallowNavigation);

    expect(onShowDetails).not.toHaveBeenCalled();
  });

  // Enter bubbles from the pencil to the card's own keydown handler, which is why that handler
  // only acts when the card itself is the focused element.
  it('does not open the details dialog when Enter is pressed on the pencil', () => {
    const { onShowDetails } = renderCard();

    fireEvent.keyDown(screen.getByRole('button', { name: 'עריכה' }), { key: 'Enter' });

    expect(onShowDetails).not.toHaveBeenCalled();
  });

  it('is not a click target at all when no details handler is given', () => {
    renderCard({ onShowDetails: undefined });

    expect(screen.queryByRole('button', { name: `פרטי הלקוח ${customer.name}` })).toBeNull();
  });
});
