import { Module } from '@nestjs/common';
import { PesajetService } from './pesajet.service';

@Module({
  providers: [PesajetService],
  exports: [PesajetService],
})
export class PaymentsModule {}
