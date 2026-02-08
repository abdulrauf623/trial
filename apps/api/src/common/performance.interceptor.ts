import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;

        // Log slow requests (over 1 second)
        if (duration > 1000) {
          console.warn(
            `[Performance] Slow request: ${method} ${url} took ${duration}ms`
          );
        }

        // Log all requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[Performance] ${method} ${url} - ${duration}ms`
          );
        }
      })
    );
  }
}
