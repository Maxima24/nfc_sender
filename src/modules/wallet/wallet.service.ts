import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { WalletCreateDto } from './dto/wallet-create.dto';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';
import { WalletOperationDto } from './dto/wallet-operation.dto';
import { GetWalletBalanceDto } from './dto/wallet-balance.dto';
import { GetWalletTransactionsFilter } from './dto/wallet-trans-filter';
import { text } from 'stream/consumers';

@Injectable()
export class WalletService {
  constructor(
    private db: PrismaService,
    private loggerService: LoggerService,
  ) {}

  async createWallet(userId, walletDto: WalletCreateDto) {
    const wallet = await this.db.wallet.create({
      data: {
        ...walletDto,
        userId: userId,
        balance: 0,
      },
      omit: {
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!wallet) {
      this.loggerService.error(
        'Could not create wallet',
        'Wallet Service',
        '',
        {
          userId: walletDto.userId,
        },
      );
      throw new BadRequestException(
        `Could not create wallet for user ${walletDto.userId}`,
      );
    }
    return {
      message: 'Wallet created successfully',
      data: {
        wallet,
      },
    };
  }

  async walletIncrement(userId: string, walletIncrement: WalletOperationDto) {
    const { amount } = walletIncrement;
    const wallet = await this.db.$transaction(async (tx) => {
      const wallet = await this.db.wallet.findUnique({
        where: {
          userId,
        },
      });
      if (!wallet) {
        this.loggerService.error(
          `Wallet for the user id ${userId} could not be found`,
          'Wallet Service',
          '',
          {
            userId,
          },
        );
        throw new NotFoundException(
          `Wallet for the user id ${userId} could not be found`,
        );
      }
      return await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: { increment: amount },
        },
        omit: {
          createdAt: true,
        },
      });
    });

    return wallet;
  }

  async walletDecrement(userId: string, walletDecrement: WalletOperationDto) {
    const { amount } = walletDecrement;
    const wallet = await this.db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          userId,
        },
      });
      if (!wallet) {
        this.loggerService.error(
          `Could not find wallet for user ${userId}`,
          'Wallet Service',
          '',
          {
            userId: userId,
          },
        );
        throw new NotFoundException(`Could not find wallet for user ${userId}`);
      }

      return await tx.wallet.update({
        where: {
          id: wallet.id,
          balance: {
            gte: amount,
          },
        },
        data: {
          balance: { decrement: amount },
        },
      });
    });
  }

  async getWalletBalance(user: GetWalletBalanceDto) {
    const { userId } = user;
    const wallet = await this.db.wallet.findUnique({
      where: {
        userId,
      },
    });
    if (!wallet) {
      this.loggerService.error(
        `Could not find wallet for ${userId}`,
        'Wallet service',
      );
      throw new NotFoundException(`Could not find wallet for user ${userId}`);
    }
    return {
      message: 'User fetched successfully',
      data: {
        wallet,
      },
    };
  }

  async getWalletTransactions(
    userId: string,
    filters: GetWalletTransactionsFilter = {},
  ) {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      transactionType,
    } = filters;


    const [total,transactions] = await Promise.all([
        await this.db.transactions.count({
            where:{
              userId,
                ...(startDate && {createdAt: {gte:startDate}}),
                ...(endDate && {createdAt:{lte:endDate}}),
                ...(transactionType && {transactionType}),
                ...(startDate && endDate && {createdAt:{gte:startDate,lte:endDate}} )
            }
        }),
        await this.db.transactions.findMany({
            where:{
              userId,
                       ...(startDate && {createdAt: {gte:startDate}}),
                ...(endDate && {createdAt:{lte:endDate}}),
                ...(transactionType && {transactionType}),
                ...(startDate && endDate && {createdAt:{gte:startDate,lte:endDate}} )
            },
            take:limit,
            skip: (page-1)*limit
        })
    ])

    return {
        message:" Transactions fetched successfully",
        data:{
            total,
            limit,
            page,
            transactions
        }
    }
  }
}
