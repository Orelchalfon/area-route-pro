// Helpers for opening WhatsApp chats with a pre-filled message.

// Normalize a stored phone (often '05X...' with junk values mixed in) to wa.me
// international format (972...). Returns null when there is no usable number.
export function normalizeIsraeliPhone(raw: string | undefined | null): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 9) return null;
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  return '972' + digits;
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
