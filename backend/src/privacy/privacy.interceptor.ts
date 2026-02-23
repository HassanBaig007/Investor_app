import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrivacyService } from './privacy.service';

@Injectable()
export class PrivacyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PrivacyInterceptor.name);

  constructor(private readonly privacyService: PrivacyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user (public route), pass through
    if (!user) return next.handle();

    return next.handle().pipe(
      map((data) => {
        try {
          return this.deepMask(data, user);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'unknown error';
          this.logger.error(
            `deepMask failed, returning original data: ${errorMessage}`,
          );
          return data;
        }
      }),
    );
  }

  /**
   * Recursively traverse the response and mask any investor objects.
   * Handles: top-level arrays, nested arrays (e.g., project.investors),
   * and plain objects with investor-like shapes.
   */
  private shouldStopTraversal(data: any, depth: number): boolean {
    return depth > 10 || data === null || data === undefined;
  }

  private toPlainData(data: any): any {
    if (typeof data?.toObject === 'function') {
      return data.toObject();
    }
    if (
      typeof data?.toJSON === 'function' &&
      data.constructor?.name !== 'Object'
    ) {
      return data.toJSON();
    }
    return data;
  }

  private shouldRecurseObject(value: any): boolean {
    return (
      Boolean(value) &&
      typeof value === 'object' &&
      !(value instanceof Date) &&
      !Buffer.isBuffer(value)
    );
  }

  private maskObjectFields(data: any, user: any, depth: number): any {
    const masked = this.maskIfInvestor(data, user);
    const result = { ...masked };

    for (const key of Object.keys(result)) {
      if (key.startsWith('$') || key === '_doc' || key === '__v') continue;

      const value = result[key];
      if (Array.isArray(value)) {
        result[key] = value.map((item) => this.deepMask(item, user, depth + 1));
        continue;
      }
      if (this.shouldRecurseObject(value)) {
        result[key] = this.deepMask(value, user, depth + 1);
      }
    }

    return result;
  }

  private deepMask(data: any, user: any, depth = 0): any {
    if (this.shouldStopTraversal(data, depth)) return data;

    data = this.toPlainData(data);

    if (Array.isArray(data)) {
      return data.map((item) => this.deepMask(item, user, depth + 1));
    }

    if (typeof data === 'object' && !(data instanceof Date)) {
      return this.maskObjectFields(data, user, depth);
    }

    return data;
  }

  private maskIfInvestor(item: any, user: any) {
    if (item?.role === 'investor' && item?.privacySettings) {
      const projectId = item.projectId;
      const isViewerAdmin =
        user.role === 'project_admin' ||
        user.role === 'super_admin' ||
        user.role === 'admin';
      return this.privacyService.getVisibleInvestorData(
        item,
        projectId,
        user.userId,
        isViewerAdmin,
      );
    }
    return item;
  }
}
