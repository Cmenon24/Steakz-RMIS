
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Identify this error by its class name.
    this.name = "AppError";

    // Maintain the correct prototype chain.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
