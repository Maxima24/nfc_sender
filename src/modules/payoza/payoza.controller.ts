import { Controller } from '@nestjs/common';
import { PayozaService } from './payoza.service';

@Controller('payoza')
export class PayozaController {
  constructor(private readonly payozaService: PayozaService) {}
}
