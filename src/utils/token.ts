import crypto from 'crypto';

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex'); // 96 chars
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

