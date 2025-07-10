import { log } from './logger';

export class RouteRegistry {
  private static routes = new Set<string>();

  static register(method: string, path: string): void {
    const key = `${method.toUpperCase()} ${path}`;
    if (this.routes.has(key)) {
      throw new Error(`Duplicate route: ${key}`);
    }
    this.routes.add(key);
  }

  static getRoutes(): string[] {
    return Array.from(this.routes).sort();
  }

  static clear(): void {
    this.routes.clear();
  }

  static printRoutes(): void {
    const routes = this.getRoutes();
    log.info('Registered Routes', { routes, count: routes.length });
  }
}