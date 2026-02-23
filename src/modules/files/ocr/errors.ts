export class OcrServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>,
    public cause?: Error,
  ) {
    super(message);
    this.name = "OcrServiceError";
  }
}

export class OcrValidationError extends OcrServiceError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, "VALIDATION_ERROR", context, cause);
    this.name = "OcrValidationError";
  }
}

export class OcrProcessingError extends OcrServiceError {
  constructor(
    message: string,
    codeOrContext?: string | Record<string, any>,
    contextOrCause?: Record<string, any> | Error,
    cause?: Error,
  ) {
    let code = "PROCESSING_ERROR";
    let context: Record<string, any> | undefined;
    let finalCause: Error | undefined;
    
    if (typeof codeOrContext === "string") {
      code = codeOrContext;
      if (contextOrCause && contextOrCause instanceof Error) {
        finalCause = contextOrCause;
      } else {
        context = contextOrCause as Record<string, any> | undefined;
      }
    } else if (codeOrContext) {
      context = codeOrContext;
      finalCause = contextOrCause as Error | undefined;
    }
    
    super(message, code, context, finalCause ?? cause);
    this.name = "OcrProcessingError";
  }
}

export class OcrTimeoutError extends OcrServiceError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, "TIMEOUT_ERROR", context, cause);
    this.name = "OcrTimeoutError";
  }
}

export class OcrEngineError extends OcrServiceError {
  constructor(
    engine: string,
    message: string,
    context?: Record<string, any>,
    cause?: Error,
  ) {
    super(
      `${engine}: ${message}`,
      `${engine.toUpperCase()}_ERROR`,
      context,
      cause,
    );
    this.name = "OcrEngineError";
  }
}

export class OcrInitializationError extends OcrServiceError {
  constructor(provider: string, cause?: Error) {
    super(
      `Failed to initialize ${provider} OCR engine`,
      "INIT_FAILED",
      { provider },
      cause,
    );
    this.name = "OcrInitializationError";
  }
}
