import { Controller, Post, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WalletCreateDto } from './dto/wallet-create.dto';
import { JwtGuard } from 'src/common/utils/jwt.utils';
import { Role } from '@prisma/client';
import { RoleGuard } from 'src/common/guards/role.guard';
import { WalletOperationDto } from './dto/wallet-operation.dto';

@ApiTags("Wallet")
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService,
    private readonly db:PrismaService,private logger:LoggerService
  ) {}


  @ApiOperation({ summary: 'Create a new  wallet', description: 'Creates a new wallet for the seller on signup' })
  @ApiBody({ type: WalletCreateDto })
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 201, description: 'Wallet created Successfully.' })
  @ApiResponse({ status: 400, description: 'Wallet Could not be found' })
  @Post()
  async create(@CurrentUser() user,walletCreateDto:WalletCreateDto){
      await this.walletService.createWallet(user.id,walletCreateDto)
  }

}
