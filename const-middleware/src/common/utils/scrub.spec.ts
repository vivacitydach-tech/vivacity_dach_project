import { scrubForLog, sanitizeClientMessage } from './scrub';

describe('scrubForLog (§13)', () => {
  it('redacts password and token keys', () => {
    expect(
      scrubForLog({
        username: 'zahid',
        password: 'secret',
        password_hash: 'argon2...',
        token: 'jwt-here',
        authorization: 'Bearer abc',
        cookie: 'sid=1',
      }),
    ).toEqual({
      username: 'zahid',
      password: '[REDACTED]',
      password_hash: '[REDACTED]',
      token: '[REDACTED]',
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
    });
  });

  it('redacts postgres:// and .internal connection strings', () => {
    expect(
      scrubForLog({
        db: 'postgres://host.internal:5432/middleware',
        mq: 'amqp://guest:guest@broker.internal:5672',
        safe: 'https://api.example.com',
      }),
    ).toEqual({
      db: '[REDACTED]',
      mq: '[REDACTED]',
      safe: 'https://api.example.com',
    });
  });

  it('redacts bare *.internal hostnames in string values', () => {
    expect(scrubForLog({ host: 'cost-core.internal' })).toEqual({
      host: '[REDACTED]',
    });
  });

  it('sanitizeClientMessage strips upstream product names', () => {
    expect(
      sanitizeClientMessage('Upstream OpenProject returned 500'),
    ).toBe('Upstream [REDACTED] returned 500');
    expect(
      sanitizeClientMessage('OpenConstructionERP schema mismatch'),
    ).toBe('[REDACTED] schema mismatch');
    expect(sanitizeClientMessage('NestJS boom', { forceGeneric: true })).toBe(
      'Internal server error',
    );
  });

  it('sanitizeClientMessage collapses SQL / stack leaks', () => {
    expect(
      sanitizeClientMessage('Error\n    at FooService.create (foo.ts:10:5)'),
    ).toBe('Internal server error');
    expect(
      sanitizeClientMessage('CREATE TABLE users (id uuid)'),
    ).toBe('Internal server error');
  });
});
