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
import { LedgerService } from './ledger.service';

@Injectable()
export class WalletService {
  constructor(
    private db: PrismaService,
    private loggerService: LoggerService,
    private ledger: LedgerService,
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
    return this.db.$transaction(async (tx) => {
      const existing = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!existing) {
        this.loggerService.error(
          `Wallet for the user id ${userId} could not be found`,
          'Wallet Service',
          '',
          { userId },
        );
        throw new NotFoundException(
          `Wallet for the user id ${userId} could not be found`,
        );
      }
      const { wallet } = await this.ledger.credit(tx, existing.id, amount);
      return wallet;
    });
  }

  async walletDecrement(userId: string, walletDecrement: WalletOperationDto) {
    const { amount } = walletDecrement;
    return this.db.$transaction(async (tx) => {
      const existing = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!existing) {
        this.loggerService.error(
          `Could not find wallet for user ${userId}`,
          'Wallet Service',
          '',
          { userId },
        );
        throw new NotFoundException(`Could not find wallet for user ${userId}`);
      }
      const { wallet } = await this.ledger.debit(tx, existing.id, amount);
      return wallet;
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

    const wallet = await this.db.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) {
      throw new NotFoundException(`Could not find wallet for user ${userId}`);
    }

    const where = {
      walletId: wallet.id,
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      }),
      ...(transactionType && { type: transactionType }),
    };

    const [total, transactions] = await Promise.all([
      this.db.transactions.count({ where }),
      this.db.transactions.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
      }),
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
