import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  scrubForLog,
  sanitizeClientMessage,
} from '../utils/scrub';
import { recordApi5xx } from '../telemetry/metrics';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId ?? 'unknown';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string | string[]) ?? exception.message;
        code = (body.error as string) ?? exception.name;
      }
      if (status === HttpStatus.NOT_FOUND) {
        code = 'NOT_FOUND';
      } else if (status === HttpStatus.UNAUTHORIZED) {
        code = 'UNAUTHORIZED';
      } else if (status === HttpStatus.FORBIDDEN) {
        code = 'FORBIDDEN';
      } else if (status === HttpStatus.BAD_REQUEST) {
        code = 'BAD_REQUEST';
      } else if (status === HttpStatus.CONFLICT) {
        code = 'CONFLICT';
      } else if (status >= 500) {
        code = 'INTERNAL_ERROR';
      }
    }

    const isServerError = status >= 500;
    if (isServerError) {
      recordApi5xx();
      message = sanitizeClientMessage(message, { forceGeneric: true });
      code = 'INTERNAL_ERROR';
    } else {
      message = sanitizeClientMessage(message);
    }

    this.logger.error(
      scrubForLog({
        request_id: requestId,
        path: request.url,
        status,
        message,
        error:
          exception instanceof Error ? exception.message : String(exception),
        // Stack stays in logs only (scrubbed), never in the response body
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    );

    response.status(status).json({
      error: {
        code,
        message,
        request_id: requestId,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
