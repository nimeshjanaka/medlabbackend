import type { Request } from "express";

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
