export const ADMIN_USER_MIN_PASSWORD_LENGTH = 10;

export function validateAdminUserPassword(password: string): string | null {
  if (password.length < ADMIN_USER_MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${ADMIN_USER_MIN_PASSWORD_LENGTH} characters`;
  }

  return null;
}
