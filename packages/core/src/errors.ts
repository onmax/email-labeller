export class EmailLabellerError extends Error {
  constructor(message: string, public code: string, public cause?: Error) {
    super(message)
    this.name = 'EmailLabellerError'
  }
}

export class AuthError extends EmailLabellerError {
  constructor(message: string, cause?: Error) {
    super(message, 'AUTH_ERROR', cause)
    this.name = 'AuthError'
  }
}

export class ProviderError extends EmailLabellerError {
  constructor(message: string, public provider: string, cause?: Error) {
    super(message, 'PROVIDER_ERROR', cause)
    this.name = 'ProviderError'
  }
}

export class ClassificationError extends EmailLabellerError {
  constructor(message: string, public emailId: string, cause?: Error) {
    super(message, 'CLASSIFICATION_ERROR', cause)
    this.name = 'ClassificationError'
  }
}

export class RateLimitError extends EmailLabellerError {
  constructor(message: string, public retryAfter: number, cause?: Error) {
    super(message, 'RATE_LIMIT_ERROR', cause)
    this.name = 'RateLimitError'
  }
}

export class ConfigError extends EmailLabellerError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', cause)
    this.name = 'ConfigError'
  }
}
