export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function assert(condition: boolean, statusCode: number, message: string): void {
  if (!condition) {
    throw new AppError(statusCode, message);
  }
}

