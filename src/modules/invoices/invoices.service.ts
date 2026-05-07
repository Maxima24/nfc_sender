import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import {
  Prisma,
  TransactionType,
  Transactions,
  Topups,
} from '@prisma/client';

export type InvoiceFormat = 'pdf' | 'csv';
export type InvoiceType = 'all' | 'transfers' | 'topups';

interface InvoiceParams {
  format?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
}

interface ResolvedParams {
  format: InvoiceFormat;
  start: Date;
  end: Date;
  type: InvoiceType;
}

interface InvoiceRow {
  date: Date;
  type: string;
  description: string;
  amount: number;
  signedAmount: string;
  status: string;
  reference: string;
}

function parseDate(label: string, value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid ${label} (expected ISO date)`);
  }
  return d;
}

function resolve(params: InvoiceParams): ResolvedParams {
  const format = (params.format ?? 'csv') as InvoiceFormat;
  if (format !== 'csv' && format !== 'pdf') {
    throw new BadRequestException('format must be csv or pdf');
  }

  const type = (params.type ?? 'all') as InvoiceType;
  if (!['all', 'transfers', 'topups'].includes(type)) {
    throw new BadRequestException('type must be all, transfers, or topups');
  }

  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setMonth(now.getMonth() - 1);

  const start = parseDate('startDate', params.startDate) ?? defaultStart;
  const end = parseDate('endDate', params.endDate) ?? now;
  if (start > end) {
    throw new BadRequestException('startDate must be before endDate');
  }
  end.setHours(23, 59, 59, 999);

  return { format, start, end, type };
}

function formatNaira(amount: number): string {
  const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';
  return `${sign}₦${Math.abs(amount).toLocaleString('en-NG')}`;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

@Injectable()
export class InvoicesService {
  constructor(private db: PrismaService) {}

  async export(userId: string, params: InvoiceParams, res: Response) {
    const { format, start, end, type } = resolve(params);

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        wallet: { select: { id: true } },
      },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (!user.wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }

    const rows = await this.collectRows(user.wallet.id, start, end, type);

    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="tappay-transactions-${stamp}.csv"`,
      );
      res.send(this.toCsv(rows));
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tappay-invoice-${stamp}.pdf"`,
    );
    this.streamPdf(res, {
      user: { name: user.name, email: user.email },
      start,
      end,
      rows,
    });
  }

  private async collectRows(
    walletId: string,
    start: Date,
    end: Date,
    type: InvoiceType,
  ): Promise<InvoiceRow[]> {
    const range: Prisma.DateTimeFilter = { gte: start, lte: end };
    const transactionsP =
      type === 'topups'
        ? Promise.resolve<Transactions[]>([])
        : this.db.transactions.findMany({
            where: { walletId, createdAt: range },
            orderBy: { createdAt: 'desc' },
          });

    const topUpsP =
      type === 'transfers'
        ? Promise.resolve<Topups[]>([])
        : this.db.topups.findMany({
            where: { walletId, createdAt: range },
            orderBy: { createdAt: 'desc' },
          });

    const [transactions, topUps] = await Promise.all([transactionsP, topUpsP]);

    const txRows: InvoiceRow[] = transactions.map((t) => {
      const amt = Number(t.amount);
      const signed = t.type === TransactionType.DEBIT ? -amt : amt;
      return {
        date: t.createdAt,
        type: t.type,
        description: t.description ?? '',
        amount: signed,
        signedAmount: formatNaira(signed),
        status: t.status ?? 'COMPLETED',
        reference: t.reference ?? `TXN_${t.id.slice(0, 8)}`,
      };
    });

    const topUpRows: InvoiceRow[] = topUps.map((t) => ({
      date: t.createdAt,
      type: 'TOPUP',
      description: t.bankName
        ? `Top-up via ${t.bankName}`
        : 'Wallet top-up',
      amount: Number(t.amount),
      signedAmount: formatNaira(Number(t.amount)),
      status: t.status,
      reference: t.payozaRef,
    }));

    return [...txRows, ...topUpRows].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }

  private toCsv(rows: InvoiceRow[]): string {
    const header = ['Date', 'Type', 'Description', 'Amount', 'Status', 'Reference'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.date.toISOString().slice(0, 10),
          r.type,
          csvEscape(r.description || ''),
          csvEscape(r.signedAmount),
          r.status,
          csvEscape(r.reference),
        ].join(','),
      );
    }
    return lines.join('\n');
  }

  private streamPdf(
    res: Response,
    args: {
      user: { name: string; email: string };
      start: Date;
      end: Date;
      rows: InvoiceRow[];
    },
  ) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc
      .fontSize(18)
      .text('TapPay — Transaction Statement', { align: 'left' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .text(`User: ${args.user.name}   |   Email: ${args.user.email}`)
      .text(
        `Period: ${args.start.toDateString()} — ${args.end.toDateString()}`,
      )
      .moveDown(1);

    const colX = [40, 110, 175, 330, 410, 480];
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Status', 'Reference'];

    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { continued: i < headers.length - 1, width: 90 }));
    doc.moveDown(0.5);
    doc.font('Helvetica');

    let totalCredit = 0;
    let totalDebit = 0;

    for (const row of args.rows) {
      if (row.amount > 0) totalCredit += row.amount;
      else totalDebit += -row.amount;

      const y = doc.y;
      doc.text(row.date.toISOString().slice(0, 10), colX[0], y, { width: 65 });
      doc.text(row.type, colX[1], y, { width: 60 });
      doc.text(row.description.slice(0, 30), colX[2], y, { width: 150 });
      doc.text(row.signedAmount, colX[3], y, { width: 75 });
      doc.text(row.status, colX[4], y, { width: 65 });
      doc.text(row.reference.slice(0, 20), colX[5], y, { width: 80 });
      doc.moveDown(0.25);

      if (doc.y > 760) doc.addPage();
    }

    doc.moveDown(1).font('Helvetica-Bold').fontSize(11);
    doc.text('Summary:', 40);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Total Credits: ${formatNaira(totalCredit)}`);
    doc.text(`Total Debits:  ${formatNaira(-totalDebit)}`);
    doc.text(`Net:           ${formatNaira(totalCredit - totalDebit)}`);

    doc.end();
  }
}
