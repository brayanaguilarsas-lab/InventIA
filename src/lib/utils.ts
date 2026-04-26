import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Escapa los caracteres especiales de PostgreSQL LIKE/ILIKE (% _ \) para que
 * el patrón de búsqueda sea tratado como literal. Sin esto, una búsqueda con
 * "García_López" interpreta "_" como wildcard de un carácter, y "50%" como
 * wildcard de cualquier cantidad.
 */
export function escapeIlike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
