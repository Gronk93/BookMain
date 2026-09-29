export class PdfIngestionError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "PdfIngestionError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PdfEmptyError extends PdfIngestionError {
  constructor(message = "The uploaded file is empty (0 bytes).") {
    super("PDF_EMPTY", message, 400);
  }
}

export class PdfTooLargeError extends PdfIngestionError {
  constructor(maxSizeMb: number, actualBytes?: number) {
    super(
      "PDF_TOO_LARGE",
      `The file exceeds the maximum allowed size of ${maxSizeMb} MB.`,
      413,
      { maxSizeMb, actualBytes },
    );
  }
}

export class PdfInvalidTypeError extends PdfIngestionError {
  constructor(message = "Only PDF files are supported.") {
    super("PDF_INVALID_TYPE", message, 400);
  }
}

export class PdfInvalidSignatureError extends PdfIngestionError {
  constructor(message = "File does not contain a valid PDF binary signature (%PDF-).") {
    super("PDF_INVALID_SIGNATURE", message, 400);
  }
}

export class PdfCorruptedError extends PdfIngestionError {
  constructor(message = "The PDF file is corrupted and cannot be parsed.") {
    super("PDF_CORRUPTED", message, 422);
  }
}

export class PdfPasswordProtectedError extends PdfIngestionError {
  constructor(message = "This PDF is password protected and cannot be processed yet.") {
    super("PDF_PASSWORD_PROTECTED", message, 422);
  }
}

export class PdfDuplicateError extends PdfIngestionError {
  constructor(existingBookId?: string) {
    super(
      "PDF_DUPLICATE",
      "This book already exists in your library.",
      409,
      existingBookId ? { existingBookId } : undefined,
    );
  }
}

export class PdfStorageFailedError extends PdfIngestionError {
  constructor(message = "Failed to store PDF file.") {
    super("PDF_STORAGE_FAILED", message, 500);
  }
}

export class PdfInspectionFailedError extends PdfIngestionError {
  constructor(message = "Failed to inspect PDF document metadata.") {
    super("PDF_INSPECTION_FAILED", message, 500);
  }
}

export class PdfImportFailedError extends PdfIngestionError {
  constructor(message = "An error occurred during PDF ingestion.") {
    super("PDF_IMPORT_FAILED", message, 500);
  }
}
