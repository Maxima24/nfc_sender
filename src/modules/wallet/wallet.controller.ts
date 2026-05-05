import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WalletCreateDto } from './dto/wallet-create.dto';
import { JwtGuard } from 'src/common/utils/jwt.utils';
import { Role } from '@prisma/client';
import { WalletOperationDto } from './dto/wallet-operation.dto';
import { GetWalletTransactionsFilter } from './dto/wallet-trans-filter';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly db: PrismaService,
    private logger: LoggerService,
  ) {}

  @ApiOperation({
    summary: 'Create a new  wallet',
    description: 'Creates a new wallet for the seller on signup',
  })
  @ApiBody({ type: WalletCreateDto })
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 201, description: 'Wallet created Successfully.' })
  @ApiResponse({ status: 400, description: 'Wallet Could not be found' })
  @Post()
  async create(@CurrentUser() user, walletCreateDto: WalletCreateDto) {
    await this.walletService.createWallet(user.id, walletCreateDto);
  }

  @ApiOperation({
    summary: 'get Wallet balance',
    description: 'Gets a user wallet balance',
  })
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200,   description: 'Wallet fetched successfully' })
  @ApiResponse({ status: 400, description: 'Wallet Could not be found' })
  @Get('balance')
  async get(@CurrentUser() user) {
    return await this.walletService.getWalletBalance({ userId: user.id });
  }

  



   @ApiOperation({
    summary: 'get Wallet Transaction history',
    description: 'Gets a user wallet transaction history',
  })
  @UseGuards(JwtGuard)
  @ApiQuery({type:GetWalletTransactionsFilter})
  @ApiResponse({ status: 200, description: 'Wallet transactions fetched' })
  @ApiResponse({ status: 400, description: 'Wallet transactions could not be fetched successfully' })
  @Get('transactions')
  async getTransactions(@CurrentUser() user, @Query()filters:GetWalletTransactionsFilter) {
    const userId = user.id
   return  await this.walletService.getWalletTransactions( userId,filters );
  }

}
