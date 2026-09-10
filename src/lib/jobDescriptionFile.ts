const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 100_000;

const MIME_PDF = 'application/pdf';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_TEXT = 'text/plain';

export interface JobDescriptionFileMetadata {
  name: string;
  size: number;
  type: string;
}

export interface ExtractedJobDescription {
  text: string;
  warning: string | null;
}

function fileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

export function validateJobDescriptionFile(file: JobDescriptionFileMetadata): string | null {
  const extension = fileExtension(file.name);
  const supportedByExtension = ['.pdf', '.docx', '.txt'].includes(extension);
  const supportedByMime = [MIME_PDF, MIME_DOCX, MIME_TEXT].includes(file.type);

  if (!supportedByExtension && !supportedByMime) {
    if (extension === '.doc' || file.type === 'application/msword') {
      return 'Legacy .doc files are not supported. Save the document as .docx or PDF and try again.';
    }
    return 'Unsupported file type. Upload a PDF, Word (.docx), or text (.txt) file.';
  }

  if (file.size <= 0) {
    return 'This file is empty.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File too large. The maximum size is 10 MB.';
  }

  return null;
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\u00a0]+/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function validateExtractedText(value: string): string {
  const normalized = normalizeExtractedText(value);
  if (normalized.length < 20) {
    throw new Error(
      'No readable job-description text was found. If this is a scanned PDF, copy and paste the text instead.'
    );
  }
  return normalized.slice(0, MAX_EXTRACTED_CHARACTERS);
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = (content.items as Array<{ str?: string }>)
      .map(item => item.str ?? '')
      .join(' ')
      .trim();
    if (pageText) pages.push(pageText);
  }

  return pages.join('\n\n');
}

async function extractDocxText(file: File): Promise<ExtractedJobDescription> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const warning = result.messages.length > 0
    ? 'Some Word formatting was ignored; please review the extracted text.'
    : null;

  return { text: result.value, warning };
}

export async function extractJobDescriptionFile(file: File): Promise<ExtractedJobDescription> {
  const validationError = validateJobDescriptionFile(file);
  if (validationError) throw new Error(validationError);

  const extension = fileExtension(file.name);
  let result: ExtractedJobDescription;

  if (extension === '.pdf' || file.type === MIME_PDF) {
    result = { text: await extractPdfText(file), warning: null };
  } else if (extension === '.docx' || file.type === MIME_DOCX) {
    result = await extractDocxText(file);
  } else {
    result = { text: await file.text(), warning: null };
  }

  return {
    text: validateExtractedText(result.text),
    warning: result.warning,
  };
}

export const JOB_DESCRIPTION_FILE_ACCEPT = [
  '.pdf',
  '.docx',
  '.txt',
  MIME_PDF,
  MIME_DOCX,
  MIME_TEXT,
].join(',');
