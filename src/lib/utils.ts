import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidCoord(lat: any, lng: any): boolean {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return !isNaN(nLat) && !isNaN(nLng) && nLat !== 0 && nLng !== 0;
}

export function formatMobileNumber(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

export function formatIdNumber(value: string): string {
  const chars = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 12);
  if (chars.length <= 4) return chars;
  if (chars.length <= 8) return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}
