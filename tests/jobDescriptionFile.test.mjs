import assert from 'node:assert/strict';
import test from 'node:test';

import { validateJobDescriptionFile } from '../src/lib/jobDescriptionFile.ts';

test('accepts supported job-description document formats', () => {
  assert.equal(validateJobDescriptionFile({ name: 'role.pdf', size: 1_000, type: 'application/pdf' }), null);
  assert.equal(validateJobDescriptionFile({ name: 'role.docx', size: 1_000, type: '' }), null);
  assert.equal(validateJobDescriptionFile({ name: 'role.txt', size: 1_000, type: 'text/plain' }), null);
});

test('rejects legacy Word files with a useful conversion instruction', () => {
  assert.match(
    validateJobDescriptionFile({ name: 'role.doc', size: 1_000, type: 'application/msword' }) ?? '',
    /Save the document as \.docx or PDF/
  );
});

test('rejects empty and oversized documents', () => {
  assert.match(
    validateJobDescriptionFile({ name: 'empty.pdf', size: 0, type: 'application/pdf' }) ?? '',
    /empty/
  );
  assert.match(
    validateJobDescriptionFile({ name: 'large.pdf', size: 10 * 1024 * 1024 + 1, type: 'application/pdf' }) ?? '',
    /maximum size is 10 MB/
  );
});

test('does not trust an unrelated file extension or MIME type', () => {
  assert.match(
    validateJobDescriptionFile({ name: 'photo.jpg', size: 1_000, type: 'image/jpeg' }) ?? '',
    /Unsupported file type/
  );
});
