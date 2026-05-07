import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TransferType } from '@prisma/client';

export type ChartPeriod = '7d' | '30d' | '90d' | '1y';

type Granularity = 'day' | 'week' | 'month';

interface ResolvedPeriod {
  period: ChartPeriod;
  start: Date;
  end: Date;
  granularity: Granularity;
}

const DEFAULT_PERIOD: ChartPeriod = '30d';

function resolvePeriod(input?: string): ResolvedPeriod {
  const period = (input ?? DEFAULT_PERIOD) as ChartPeriod;
  const end = new Date();
  const start = new Date(end);
  let granularity: Granularity;

  switch (period) {
    case '7d':
      start.setDate(end.getDate() - 6);
      granularity = 'day';
      break;
    case '30d':
      start.setDate(end.getDate() - 29);
      granularity = 'day';
      break;
    case '90d':
      start.setDate(end.getDate() - 89);
      granularity = 'week';
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      granularity = 'month';
      break;
    default:
      throw new BadRequestException(
        `Invalid period "${input}". Use 7d, 30d, 90d, or 1y.`,
      );
  }

  start.setHours(0, 0, 0, 0);
  return { period, start, end, granularity };
}

function isoBucket(d: Date, granularity: Granularity): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  if (granularity === 'month') return `${yyyy}-${mm}-01`;
  return `${yyyy}-${mm}-${dd}`;
}

@Injectable()
export class ChartsService {
  constructor(private db: PrismaService) {}

  private async getWalletId(userId: string): Promise<string> {
    const wallet = await this.db.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }
    return wallet.id;
  }

  async getSpending(userId: string, periodInput?: string) {
    const { period, start, end, granularity } = resolvePeriod(periodInput);
    const walletId = await this.getWalletId(userId);

    const rows = await this.db.$queryRaw<
      { bucket: Date; type: 'CREDIT' | 'DEBIT'; amount: Prisma.Decimal }[]
    >(Prisma.sql`
      SELECT
        date_trunc(${granularity}, "createdAt") AS bucket,
        "type",
        SUM("amount") AS amount
      FROM "Transactions"
      WHERE "walletId" = ${walletId}
        AND "createdAt" >= ${start}
        AND "createdAt" <= ${end}
      GROUP BY bucket, "type"
      ORDER BY bucket ASC
    `);

    const inflowMap = new Map<string, number>();
    const outflowMap = new Map<string, number>();
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const row of rows) {
      const date = isoBucket(row.bucket, granularity);
      const amount = Number(row.amount);
      if (row.type === 'CREDIT') {
        inflowMap.set(date, (inflowMap.get(date) ?? 0) + amount);
        totalInflow += amount;
      } else {
        outflowMap.set(date, (outflowMap.get(date) ?? 0) + amount);
        totalOutflow += amount;
      }
    }

    const dates = Array.from(
      new Set([...inflowMap.keys(), ...outflowMap.keys()]),
    ).sort();

    const inflow = dates.map((date) => ({
      date,
      amount: inflowMap.get(date) ?? 0,
    }));
    const outflow = dates.map((date) => ({
      date,
      amount: outflowMap.get(date) ?? 0,
    }));
    const netFlow = dates.map((date) => ({
      date,
      amount: (inflowMap.get(date) ?? 0) - (outflowMap.get(date) ?? 0),
    }));

    return {
      data: {
        period,
        inflow,
        outflow,
        netFlow,
        summary: {
          totalInflow,
          totalOutflow,
          netFlow: totalInflow - totalOutflow,
        },
      },
    };
  }

  async getTransfers(userId: string, periodInput?: string) {
    const { period, start, end, granularity } = resolvePeriod(periodInput);

    const userFilter: Prisma.TransferWhereInput = {
      OR: [{ senderId: userId }, { recieverId: userId }],
      createdAt: { gte: start, lte: end },
    };

    const [byTypeRows, byStatusRows, trendRows] = await Promise.all([
      this.db.transfer.groupBy({
        by: ['transferType'],
        where: userFilter,
        _count: { _all: true },
      }),
      this.db.transfer.groupBy({
        by: ['status'],
        where: userFilter,
        _count: { _all: true },
      }),
      this.db.$queryRaw<
        { bucket: Date; count: bigint; volume: Prisma.Decimal }[]
      >(Prisma.sql`
        SELECT
          date_trunc(${granularity}, "createdAt") AS bucket,
          COUNT(*)::bigint AS count,
          SUM("amount") AS volume
        FROM "Transfer"
        WHERE ("senderId" = ${userId} OR "recieverId" = ${userId})
          AND "createdAt" >= ${start}
          AND "createdAt" <= ${end}
        GROUP BY bucket
        ORDER BY bucket ASC
      `),
    ]);

    const byType: Record<TransferType, number> = { NFC: 0, QR: 0, MANUAL: 0 };
    for (const row of byTypeRows) byType[row.transferType] = row._count._all;

    const byStatus: Record<string, number> = {};
    for (const row of byStatusRows) byStatus[row.status] = row._count._all;

    const trend = trendRows.map((r) => ({
      date: isoBucket(r.bucket, granularity),
      count: Number(r.count),
      volume: Number(r.volume ?? 0),
    }));

    return {
      data: {
        period,
        byType,
        byStatus,
        trend,
      },
    };
  }

  async getTopUps(userId: string, periodInput?: string) {
    const { period, start, end, granularity } = resolvePeriod(periodInput);
    const walletId = await this.getWalletId(userId);

    const [trendRows, summaryAgg] = await Promise.all([
      this.db.$queryRaw<{ bucket: Date; amount: Prisma.Decimal }[]>(
        Prisma.sql`
        SELECT
          date_trunc(${granularity}, "createdAt") AS bucket,
          SUM("amount") AS amount
        FROM "Topups"
        WHERE "walletId" = ${walletId}
          AND "status" = 'COMPLETED'
          AND "createdAt" >= ${start}
          AND "createdAt" <= ${end}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      ),
      this.db.topups.aggregate({
        where: {
          walletId,
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const trend = trendRows.map((r) => ({
      date: isoBucket(r.bucket, granularity),
      amount: Number(r.amount ?? 0),
    }));

    return {
      data: {
        period,
        trend,
        summary: {
          totalAmount: Number(summaryAgg._sum.amount ?? 0),
          count: summaryAgg._count._all,
        },
      },
    };
  }

  async getAdminOverview(periodInput?: string) {
    const { period, start, end, granularity } = resolvePeriod(periodInput);

    const [userGrowthRows, txVolumeRows, byTypeRows, topUpRows, baselineUsers] =
      await Promise.all([
        this.db.$queryRaw<{ bucket: Date; new_users: bigint }[]>(Prisma.sql`
          SELECT
            date_trunc(${granularity}, "createdAt") AS bucket,
            COUNT(*)::bigint AS new_users
          FROM "User"
          WHERE "createdAt" >= ${start}
            AND "createdAt" <= ${end}
          GROUP BY bucket
          ORDER BY bucket ASC
        `),
        this.db.$queryRaw<
          { bucket: Date; volume: Prisma.Decimal; count: bigint }[]
        >(Prisma.sql`
          SELECT
            date_trunc(${granularity}, "createdAt") AS bucket,
            SUM("amount") AS volume,
            COUNT(*)::bigint AS count
          FROM "Transactions"
          WHERE "createdAt" >= ${start}
            AND "createdAt" <= ${end}
          GROUP BY bucket
          ORDER BY bucket ASC
        `),
        this.db.transfer.groupBy({
          by: ['transferType'],
          where: { createdAt: { gte: start, lte: end } },
          _count: { _all: true },
        }),
        this.db.$queryRaw<{ bucket: Date; amount: Prisma.Decimal }[]>(
          Prisma.sql`
          SELECT
            date_trunc(${granularity}, "createdAt") AS bucket,
            SUM("amount") AS amount
          FROM "Topups"
          WHERE "status" = 'COMPLETED'
            AND "createdAt" >= ${start}
            AND "createdAt" <= ${end}
          GROUP BY bucket
          ORDER BY bucket ASC
        `,
        ),
        this.db.user.count({ where: { createdAt: { lt: start } } }),
      ]);

    let runningTotal = baselineUsers;
    const userGrowth = userGrowthRows.map((r) => {
      const newUsers = Number(r.new_users);
      runningTotal += newUsers;
      return {
        date: isoBucket(r.bucket, granularity),
        newUsers,
        totalUsers: runningTotal,
      };
    });

    const transactionVolume = txVolumeRows.map((r) => ({
      date: isoBucket(r.bucket, granularity),
      volume: Number(r.volume ?? 0),
      count: Number(r.count),
    }));

    const transfersByType: Record<TransferType, number> = {
      NFC: 0,
      QR: 0,
      MANUAL: 0,
    };
    for (const row of byTypeRows) {
      transfersByType[row.transferType] = row._count._all;
    }

    const topUpVolume = topUpRows.map((r) => ({
      date: isoBucket(r.bucket, granularity),
      amount: Number(r.amount ?? 0),
    }));

    return {
      data: {
        userGrowth,
        transactionVolume,
        transfersByType,
        topUpVolume,
      },
    };
  }
}
