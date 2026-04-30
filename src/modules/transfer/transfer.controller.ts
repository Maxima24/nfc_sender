import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';
import { ExecuteTransferDto } from './dto/execute-transfer.dto';
import { JwtGuard } from 'src/common/utils/jwt.utils';

@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post('/initiate')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Initiate a transfer' })
  @ApiBody({ type: InitiateTransferDto })
  @ApiResponse({
    status: 201,
    description: 'Transfer initiated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Could not initiate transfer',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Transfer already exists',
  })
  public async initiateTransfer(
    @CurrentUser() user,
    @Body() body: InitiateTransferDto,
  ) {
    return await this.transferService.iniitiateTransaction(user.id,body)
  }
  @Post('/execute')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Execute transfer : this is done on the reciever end ',
  })
  @ApiBody({ type: ExecuteTransferDto })
  @ApiResponse({
    status: 201,
    description: 'Transfer executed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Could not execute transfer',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Transfer has already been executed',
  })
  public async executeTransfer(
    @CurrentUser() user,
    @Body() body: ExecuteTransferDto,
  ) {
    return this.transferService.executeTransaction(user.id,body)
  }
}
