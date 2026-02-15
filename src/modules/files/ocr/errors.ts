export class OcrServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>,
    public cause?: Error
  ) {
    super(message);
    this.name = 'OcrServiceError';
  }
}

export class OcrValidationError extends OcrServiceError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, 'VALIDATION_ERROR', context, cause);
    this.name = 'OcrValidationError';
  }
}

export class OcrProcessingError extends OcrServiceError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, 'PROCESSING_ERROR', context, cause);
    this.name = 'OcrProcessingError';
  }
}

export class OcrTimeoutError extends OcrServiceError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, 'TIMEOUT_ERROR', context, cause);
    this.name = 'OcrTimeoutError';
  }
}

export class OcrEngineError extends OcrServiceError {
  constructor(
    engine: string,
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(`${engine}: ${message}`, `${engine.toUpperCase()}_ERROR`, context, cause);
    this.name = 'OcrEngineError';
  }
}

export class OcrInitializationError extends OcrServiceError {
  constructor(provider: string, cause?: Error) {
    super(
      `Failed to initialize ${provider} OCR engine`,
      'INIT_FAILED',
      { provider },
      cause
    );
    this.name = 'OcrInitializationError';
  }
}
