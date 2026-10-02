import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { resetMetrics, getMetricSnapshot } from '../telemetry/metrics';

function mockHost(requestId = 'req-test-1') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({
        requestId,
        url: '/v1/projects',
      }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter envelope (§13)', () => {
  beforeEach(() => resetMetrics());

  it('puts request_id inside error object', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = mockHost('rid-abc');

    filter.catch(new HttpException('Resource not found', HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Resource not found',
          request_id: 'rid-abc',
        }),
        meta: expect.objectContaining({
          request_id: 'rid-abc',
        }),
      }),
    );
  });

  it('500 responses are generic and never leak product names', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = mockHost('rid-500');

    filter.catch(
      new Error('OpenProject SQL CREATE TABLE boom\n    at NestJS.handler'),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0] as {
      error: { code: string; message: string; request_id: string };
    };
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Internal server error');
    expect(body.error.request_id).toBe('rid-500');
    expect(JSON.stringify(body)).not.toMatch(
      /OpenProject|OpenConstructionERP|NestJS|CREATE TABLE|stack/i,
    );
    expect(getMetricSnapshot().api_5xx).toBe(1);
  });
});
