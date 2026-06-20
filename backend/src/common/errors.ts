export class AppError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}
export const badRequest = (m: string) => new AppError(400, m, 'BAD_REQUEST');
export const unauthorized = (m = 'Unauthorized') => new AppError(401, m, 'UNAUTHORIZED');
export const forbidden = (m = 'Forbidden') => new AppError(403, m, 'FORBIDDEN');
export const notFound = (m = 'Not found') => new AppError(404, m, 'NOT_FOUND');
