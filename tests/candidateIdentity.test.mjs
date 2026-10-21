import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProfileUrl } from '../src/lib/candidateIdentity.ts';

test('same GitHub identity survives case, www, tracking and trailing slash differences', () => {
  assert.equal(normalizeProfileUrl(' http://www.GitHub.com/SomeUser/?utm_source=test#profile '), 'https://github.com/someuser');
});
test('LinkedIn identity ignores query parameters but distinct people stay distinct', () => {
  assert.equal(normalizeProfileUrl('https://www.linkedin.com/in/Person/?trk=test'), 'https://linkedin.com/in/person');
  assert.notEqual(normalizeProfileUrl('https://linkedin.com/in/person-a'), normalizeProfileUrl('https://linkedin.com/in/person-b'));
});
test('non-profile URLs keep case-sensitive paths', () => {
  assert.equal(normalizeProfileUrl('https://example.com/SomeUser/'), 'https://example.com/SomeUser');
});
test('empty source is allowed; credentials, executable schemes and invalid URLs are rejected', () => {
  assert.equal(normalizeProfileUrl('  '), '');
  for (const value of ['javascript:alert(1)', 'https://user:secret@example.com/person', 'not a url']) {
    assert.throws(() => normalizeProfileUrl(value));
  }
});
