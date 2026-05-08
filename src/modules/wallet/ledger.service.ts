import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TopUpStatus,
  TransactionType,
  TransferType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

const MAX_WALLET_BALANCE = 10_000_000;

export interface LedgerEntryMeta {
  description?: string;
  transferType?: TransferType;
  reference?: string;
  paymentReference?: string;
  status?: TopUpStatus;
}

export interface LedgerCreditOptions extends LedgerEntryMeta {}
export interface LedgerDebitOptions extends LedgerEntryMeta {}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly db: PrismaService) {}

  async credit(
    tx: Tx,
    walletId: string,
    amount: number,
    meta: LedgerCreditOptions = {},
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    let wallet;
    try {
      wallet = await tx.wallet.update({
        where: {
          id: walletId,
          balance: { lte: MAX_WALLET_BALANCE - amount },
        },
        data: { balance: { increment: amount } },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        const exists = await tx.wallet.findUnique({
          where: { id: walletId },
          select: { id: true },
        });
        if (!exists) {
          throw new NotFoundException(`Wallet ${walletId} not found`);
        }
        throw new BadRequestException('Limit exceeded for the balance');
      }
      throw err;
    }

    const transaction = await tx.transactions.create({
      data: {
        walletId,
        amount,
        type: TransactionType.CREDIT,
        status: meta.status ?? TopUpStatus.COMPLETED,
        ...(meta.description && { description: meta.description }),
        ...(meta.transferType && { transferType: meta.transferType }),
        ...(meta.reference && { reference: meta.reference }),
        ...(meta.paymentReference && {
          paymentReference: meta.paymentReference,
        }),
      },
    });

    return { wallet, transaction };
  }

  async debit(
    tx: Tx,
    walletId: string,
    amount: number,
    meta: LedgerDebitOptions = {},
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Debit amount must be positive');
    }

    let wallet;
    try {
      wallet = await tx.wallet.update({
        where: {
          id: walletId,
          balance: { gte: amount },
        },
        data: { balance: { decrement: amount } },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        const exists = await tx.wallet.findUnique({
          where: { id: walletId },
          select: { id: true },
        });
        if (!exists) {
          throw new NotFoundException(`Wallet ${walletId} not found`);
        }
        throw new BadRequestException('Insufficient balance');
      }
      throw err;
    }

    const transaction = await tx.transactions.create({
      data: {
        walletId,
        amount,
        type: TransactionType.DEBIT,
        status: meta.status ?? TopUpStatus.COMPLETED,
        ...(meta.description && { description: meta.description }),
        ...(meta.transferType && { transferType: meta.transferType }),
        ...(meta.reference && { reference: meta.reference }),
        ...(meta.paymentReference && {
          paymentReference: meta.paymentReference,
        }),
      },
    });

    return { wallet, transaction };
  }

  async completePendingCredit(
    tx: Tx,
    args: {
      reference: string;
      amount: number;
      paymentReference?: string;
    },
  ) {
    const pending = await tx.transactions.findUnique({
      where: { reference: args.reference },
    });
    if (!pending) {
      throw new NotFoundException(
        `No pending transaction for reference ${args.reference}`,
      );
    }
    if (pending.status === TopUpStatus.COMPLETED) {
      this.logger.warn(
        `Transaction ${pending.id} already completed — skipping balance update`,
      );
      return { wallet: null, transaction: pending, alreadyCompleted: true };
    }
    if (pending.type !== TransactionType.CREDIT) {
      throw new BadRequestException(
        `Transaction ${pending.id} is not a CREDIT — refusing to complete via credit helper`,
      );
    }

    let wallet;
    try {
      wallet = await tx.wallet.update({
        where: {
          id: pending.walletId,
          balance: { lte: MAX_WALLET_BALANCE - args.amount },
        },
        data: { balance: { increment: args.amount } },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        const exists = await tx.wallet.findUnique({
          where: { id: pending.walletId },
          select: { id: true },
        });
        if (!exists) {
          throw new NotFoundException(`Wallet ${pending.walletId} not found`);
        }
        throw new BadRequestException('Limit exceeded for the balance');
      }
      throw err;
    }

    const transaction = await tx.transactions.update({
      where: { id: pending.id },
      data: {
        status: TopUpStatus.COMPLETED,
        ...(args.paymentReference && {
          paymentReference: args.paymentReference,
        }),
      },
    });

    return { wallet, transaction, alreadyCompleted: false };
  }

  async recompute(walletId: string) {
    const wallet = await this.db.wallet.findUnique({
      where: { id: walletId },
      select: { id: true, balance: true },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${walletId} not found`);
    }

    const [creditAgg, debitAgg] = await Promise.all([
      this.db.transactions.aggregate({
        where: {
          walletId,
          type: TransactionType.CREDIT,
          status: TopUpStatus.COMPLETED,
        },
        _sum: { amount: true },
      }),
      this.db.transactions.aggregate({
        where: {
          walletId,
          type: TransactionType.DEBIT,
          status: TopUpStatus.COMPLETED,
        },
        _sum: { amount: true },
      }),
    ]);

    const credits = Number(creditAgg._sum.amount ?? 0);
    const debits = Number(debitAgg._sum.amount ?? 0);
    const ledgerBalance = credits - debits;
    const cachedBalance = Number(wallet.balance);

    return {
      walletId,
      credits,
      debits,
      ledgerBalance,
      cachedBalance,
      drift: cachedBalance - ledgerBalance,
    };
  }
}
