import { Controller, Head, Post,Headers, Body, UseGuards } from '@nestjs/common';
import { PayozaService } from './payoza.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';
import { InitilizeTopUp } from './dto/initiate-topup.dto';
import { JwtGuard } from 'src/common/utils/jwt.utils';

@ApiTags("Payaza")
@Controller('payoza')
export class PayozaController {
  constructor(private readonly payozaService: PayozaService) {}

  @ApiOperation({summary:'Simulate Payaza transaction'})
  @ApiBody({type:InitilizeTopUp})
  @UseGuards(JwtGuard)
  @Post("handlTopUp")
  async handleTopUp(@CurrentUser() user, @Body()body:InitilizeTopUp){
     return await this.payozaService.handleTopup(user.id,body.amount)
  }

   @ApiOperation({summary:'webhook payaza calls'})
  @Post("webhook")
  async initiateWebhook(@Body() body:any,@Headers('x-payaza-signature') signature: string,){
     return await this.payozaService.handleWebhook(body,signature)
  }
}
