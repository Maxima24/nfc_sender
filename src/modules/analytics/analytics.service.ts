import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TransferType } from '@prisma/client';

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeek(d = new Date()) {
  const result = new Date(d);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function sumDecimal(value: Prisma.Decimal | null | undefined) {
  return value ? Number(value) : 0;
}

@Injectable()
export class AnalyticsService {
  constructor(private db: PrismaService) {}

  async getUserAnalytics(userId: string) {
    const wallet = await this.db.wallet.findUnique({
      where: { userId },
      select: { id: true, balance: true, currency: true },
    });
    if (!wallet) {
      throw new NotFoundException(`Could not find wallet for user ${userId}`);
    }

    const monthStart = startOfMonth();

    const [
      txTotal,
      txCreditAgg,
      txDebitAgg,
      txThisMonth,
      txThisMonthCreditAgg,
      txThisMonthDebitAgg,
      transferTotal,
      transferSent,
      transferReceived,
      transferByType,
      transferThisMonth,
      topUpTotal,
      topUpAmountAgg,
      topUpThisMonth,
      topUpThisMonthAmountAgg,
      recentTransactions,
    ] = await Promise.all([
      this.db.transactions.count({ where: { walletId: wallet.id } }),
      this.db.transactions.aggregate({
        where: { walletId: wallet.id, type: 'CREDIT' },
        _sum: { amount: true },
      }),
      this.db.transactions.aggregate({
        where: { walletId: wallet.id, type: 'DEBIT' },
        _sum: { amount: true },
      }),
      this.db.transactions.count({
        where: { walletId: wallet.id, createdAt: { gte: monthStart } },
      }),
      this.db.transactions.aggregate({
        where: {
          walletId: wallet.id,
          type: 'CREDIT',
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.db.transactions.aggregate({
        where: {
          walletId: wallet.id,
          type: 'DEBIT',
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.db.transfer.count({
        where: { OR: [{ senderId: userId }, { recieverId: userId }] },
      }),
      this.db.transfer.count({ where: { senderId: userId } }),
      this.db.transfer.count({ where: { recieverId: userId } }),
      this.db.transfer.groupBy({
        by: ['transferType'],
        where: { OR: [{ senderId: userId }, { recieverId: userId }] },
        _count: { _all: true },
      }),
      this.db.transfer.count({
        where: {
          OR: [{ senderId: userId }, { recieverId: userId }],
          createdAt: { gte: monthStart },
        },
      }),
      this.db.topups.count({ where: { walletId: wallet.id } }),
      this.db.topups.aggregate({
        where: { walletId: wallet.id, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.db.topups.count({
        where: { walletId: wallet.id, createdAt: { gte: monthStart } },
      }),
      this.db.topups.aggregate({
        where: {
          walletId: wallet.id,
          status: 'COMPLETED',
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.db.transactions.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          wallet: {
            select: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    const byType: Record<TransferType, number> = {
      NFC: 0,
      QR: 0,
      MANUAL: 0,
    };
    for (const row of transferByType) {
      byType[row.transferType] = row._count._all;
    }

    return {
      data: {
        wallet: {
          balance: Number(wallet.balance),
          currency: wallet.currency,
        },
        transactions: {
          total: txTotal,
          totalCredit: sumDecimal(txCreditAgg._sum.amount),
          totalDebit: sumDecimal(txDebitAgg._sum.amount),
          thisMonth: txThisMonth,
          thisMonthCredit: sumDecimal(txThisMonthCreditAgg._sum.amount),
          thisMonthDebit: sumDecimal(txThisMonthDebitAgg._sum.amount),
        },
        transfers: {
          total: transferTotal,
          sent: transferSent,
          received: transferReceived,
          byType,
          thisMonth: transferThisMonth,
        },
        topUps: {
          total: topUpTotal,
          totalAmount: sumDecimal(topUpAmountAgg._sum.amount),
          thisMonth: topUpThisMonth,
          thisMonthAmount: sumDecimal(topUpThisMonthAmountAgg._sum.amount),
        },
        recentTransactions,
      },
    };
  }

  async getAdminAnalytics() {
    const monthStart = startOfMonth();
    const weekStart = startOfWeek();

    const [
      usersTotal,
      usersNewThisMonth,
      usersNewThisWeek,
      usersActiveThisMonth,
      txTotal,
      txVolumeAgg,
      txThisMonth,
      txThisMonthVolumeAgg,
      transferTotal,
      transferVolumeAgg,
      transferByType,
      transferThisMonth,
      topUpTotal,
      topUpAmountAgg,
      topUpThisMonth,
      topUpThisMonthAmountAgg,
      recentUsers,
    ] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.db.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.db.user.count({
        where: {
          OR: [
            { sentTransfers: { some: { createdAt: { gte: monthStart } } } },
            { recievedTransfers: { some: { createdAt: { gte: monthStart } } } },
          ],
        },
      }),
      this.db.transactions.count(),
      this.db.transactions.aggregate({ _sum: { amount: true } }),
      this.db.transactions.count({ where: { createdAt: { gte: monthStart } } }),
      this.db.transactions.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.db.transfer.count(),
      this.db.transfer.aggregate({ _sum: { amount: true } }),
      this.db.transfer.groupBy({
        by: ['transferType'],
        _count: { _all: true },
      }),
      this.db.transfer.count({ where: { createdAt: { gte: monthStart } } }),
      this.db.topups.count(),
      this.db.topups.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.db.topups.count({ where: { createdAt: { gte: monthStart } } }),
      this.db.topups.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: userPublicSelect,
      }),
    ]);

    const byType: Record<TransferType, number> = {
      NFC: 0,
      QR: 0,
      MANUAL: 0,
    };
    for (const row of transferByType) {
      byType[row.transferType] = row._count._all;
    }

    return {
      data: {
        users: {
          total: usersTotal,
          newThisMonth: usersNewThisMonth,
          newThisWeek: usersNewThisWeek,
          activeThisMonth: usersActiveThisMonth,
        },
        transactions: {
          total: txTotal,
          totalVolume: sumDecimal(txVolumeAgg._sum.amount),
          thisMonth: txThisMonth,
          thisMonthVolume: sumDecimal(txThisMonthVolumeAgg._sum.amount),
        },
        transfers: {
          total: transferTotal,
          totalVolume: sumDecimal(transferVolumeAgg._sum.amount),
          byType,
          thisMonth: transferThisMonth,
        },
        topUps: {
          total: topUpTotal,
          totalAmount: sumDecimal(topUpAmountAgg._sum.amount),
          thisMonth: topUpThisMonth,
          thisMonthAmount: sumDecimal(topUpThisMonthAmountAgg._sum.amount),
        },
        recentUsers,
      },
    };
  }

  async getAdminUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit =
      params.limit && params.limit > 0 ? Math.min(Number(params.limit), 100) : 20;
    const search = params.search?.trim();

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          ...userPublicSelect,
          wallet: { select: { balance: true } },
          sentTransfers: {
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          recievedTransfers: {
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { sentTransfers: true, recievedTransfers: true },
          },
        },
      }),
    ]);

    const users = rows.map((u) => {
      const lastSent = u.sentTransfers[0]?.createdAt;
      const lastReceived = u.recievedTransfers[0]?.createdAt;
      const lastActive =
        lastSent && lastReceived
          ? lastSent > lastReceived
            ? lastSent
            : lastReceived
          : (lastSent ?? lastReceived ?? null);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        wallet: u.wallet ? { balance: Number(u.wallet.balance) } : null,
        transferCount:
          u._count.sentTransfers + u._count.recievedTransfers,
        lastActive,
      };
    });

    return {
      data: {
        users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getAdminUserActivity(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        ...userPublicSelect,
        wallet: { select: { id: true, balance: true, currency: true } },
      },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const [sentTransfers, receivedTransfers, topUps, transactions] =
      await Promise.all([
        this.db.transfer.findMany({
          where: { senderId: id },
          orderBy: { createdAt: 'desc' },
        }),
        this.db.transfer.findMany({
          where: { recieverId: id },
          orderBy: { createdAt: 'desc' },
        }),
        user.wallet
          ? this.db.topups.findMany({
              where: { walletId: user.wallet.id },
              orderBy: { createdAt: 'desc' },
            })
          : Promise.resolve([]),
        user.wallet
          ? this.db.transactions.findMany({
              where: { walletId: user.wallet.id },
              orderBy: { createdAt: 'desc' },
            })
          : Promise.resolve([]),
      ]);

    return {
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
        },
        wallet: user.wallet
          ? {
              balance: Number(user.wallet.balance),
              currency: user.wallet.currency,
            }
          : null,
        transfers: {
          sent: sentTransfers,
          received: receivedTransfers,
        },
        topUps,
        transactions,
      },
    };
  }
}
