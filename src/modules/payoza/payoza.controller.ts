import { Controller, Head, Post,Headers, Body, UseGuards } from '@nestjs/common';
import { PayozaService } from './payoza.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';
import { InitilizeTopUp } from './dto/initiate-topup.dto';
import { JwtGuard } from 'src/common/utils/jwt.utils';
import { IHandleWebhookDto } from './dto/handle-webhook.dto';
import { LoggerService } from 'src/logger/logger.service';

@ApiTags("Payaza")
@Controller('payoza')
export class PayozaController {
  constructor(private readonly payozaService: PayozaService,private logger:LoggerService) {}

  @ApiOperation({summary:'Simulate Payaza transaction'})
  @ApiBody({type:InitilizeTopUp})
  @UseGuards(JwtGuard)
  @Post("handlTopUp")
  async handleTopUp(@CurrentUser() user, @Body()body:InitilizeTopUp){
     return await this.payozaService.handleTopup(user.id,body.amount)
  }

   @ApiOperation({summary:'webhook payaza calls'})
  @Post("webhook")
   @ApiBody({type:IHandleWebhookDto})
  async initiateWebhook(@Body() body:any,@Headers('x-payaza-signature') 
  signature: string){
      console.log(body)
     return await this.payozaService.handleWebhook(signature,body)
  }
  @ApiOperation({summary:"Initialize payment gateway"})
  @Post('intialize-payment')
  @UseGuards(JwtGuard)
 @ApiBody({type:InitilizeTopUp})
  async intializePayaza(@Body() body:InitilizeTopUp,@CurrentUser() user ){
      return await this.payozaService.handlepayazaTopupInitialize(body,user.id)
  }
}
