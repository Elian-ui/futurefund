import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API health metadata', () => {
      expect(appController.getHealth()).toMatchObject({
        name: 'FutureFund API',
        status: 'ok',
        endpoints: {
          dashboard: '/returns/dashboard',
        },
      });
    });
  });
});
