import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: 'FutureFund API',
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        dashboard: '/returns/dashboard',
        snapshots: '/returns/snapshots',
        trends: '/returns/trends?window=daily',
        allocations: '/returns/allocations',
        plans: '/returns/plans',
        calculator: 'POST /returns/calculate',
      },
    };
  }
}
