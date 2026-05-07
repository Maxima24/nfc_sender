import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { LedgerService } from '../src/modules/wallet/ledger.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const db = app.get(PrismaService);
  const ledger = app.get(LedgerService);

  const wallets = await db.wallet.findMany({
    select: {
      id: true,
      userId: true,
      user: { select: { name: true, email: true } },
    },
  });

  console.log(`Auditing ${wallets.length} wallet(s)...\n`);

  const drifted: Array<{
    walletId: string;
    user: string;
    cached: number;
    ledger: number;
    drift: number;
    credits: number;
    debits: number;
  }> = [];

  for (const w of wallets) {
    const r = await ledger.recompute(w.id);
    if (r.drift !== 0) {
      drifted.push({
        walletId: w.id,
        user: `${w.user.name} <${w.user.email}>`,
        cached: r.cachedBalance,
        ledger: r.ledgerBalance,
        drift: r.drift,
        credits: r.credits,
        debits: r.debits,
      });
    }
  }

  if (drifted.length === 0) {
    console.log('No drift detected. All wallets reconcile cleanly.');
  } else {
    console.log(`${drifted.length} wallet(s) with drift:\n`);
    console.table(drifted);
    console.log(
      `\nInterpretation: positive drift = cached balance is HIGHER than the ledger sum.`,
    );
    console.log(
      `Likely cause: balance was incremented in old code paths without a corresponding Transactions row.`,
    );
    console.log(
      `Suggested fix: insert synthetic CREDIT/DEBIT rows to match each drift, OR overwrite the cached`,
    );
    console.log(
      `balance to match the ledger sum (only if you trust the ledger as authoritative).`,
    );
  }

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
