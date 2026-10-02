import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { BYPASS_ENVELOPE } from '../decorators/bypass-envelope.decorator';

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: {
    request_id: string;
    timestamp: string;
  };
}

@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector?: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isBypassed = this.reflector?.getAllAndOverride<boolean>(
      BYPASS_ENVELOPE,
      [context.getHandler(), context.getClass()],
    );

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string }>();
    const res = http.getResponse<Response>();
    const requestId = req.requestId ?? 'unknown';

    if (
      isBypassed ||
      req.path?.startsWith('/v1/docs') ||
      req.path?.startsWith('/v1/swagger') ||
      req.path?.startsWith('/v1/openapi')
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const contentType = res.getHeader('content-type');
        if (
          typeof contentType === 'string' &&
          (contentType.includes('text/html') || contentType.includes('text/yaml'))
        ) {
          return data;
        }
        return {
          data,
          meta: {
            request_id: requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
