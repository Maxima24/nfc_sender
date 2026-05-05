import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidV4 } from 'uuid';
import { firstValueFrom } from 'rxjs';
import { TopUpStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { FirebaseService } from '../notification/firebase.service';

@Injectable()
export class PayozaService {
  private payozaBaseUrl = 'https://api/payaza/africa';
  private authHeader: string;
  private secretKey: string;
  constructor(
    private readonly db: PrismaService,
    private readonly loggerService: LoggerService,
    private httpService: HttpService,
    private configService: ConfigService,
    private firebaseService: FirebaseService,
  ) {
    const publicKey = this.configService.get<string>(`PAYAZA_PUBLIC_KEY`);
    const payazaBaseUrl = this.configService.get<string>(`PAYAZA_BASE_URL`);
    const payazaSecretKey = this.configService.get<string>('PAYAZA_SECRET_KEY');
    if (!payazaBaseUrl) {
      this.loggerService.error(
        `Base url not  for payaza service not found`,
        'Payaza Service',
      );
      throw new NotFoundException(`Could not find Base for payaza Service`);
    }
    this.payozaBaseUrl = payazaBaseUrl;
    if (!publicKey) {
      this.loggerService.error(
        `Public key for payaza service not found`,
        'Payaza Service',
      );
      throw new NotFoundException(
        `Could not find public key for payaza Service`,
      );
    }

    this.authHeader = `Payaza ${Buffer.from(publicKey).toString('base64')}`;
    console.log(this.authHeader, 'This is the auth header');
    if (!payazaSecretKey) {
      this.loggerService.error(
        `Secret key for payaza service not found`,
        'Payaza Service',
      );
      throw new NotFoundException(
        `Could not find Secret key for payaza Service`,
      );
    }
    this.secretKey = payazaSecretKey;
  }

  private async initiateTopup(userId: string, amount: number) {
    const wallet = await this.db.wallet.findUnique({
      where: {
        userId,
      },
      include: {
        user: true,
      },
    });
    if (!wallet) {
      this.loggerService.error(
        `Could not find wallet for user ${userId}`,
        'Payoza Service',
      );
      throw new NotFoundException(`Could not find wallet for user ${userId}`);
    }
    const payozaRef = uuidV4();
    const nameObject = wallet.user.name.split(' ');
    const payozaPayload = {
      account_name: wallet.user.name,
      account_type: 'Dynamic',
      bank_code: '1067',
      account_reference: payozaRef,
      customer_first_name: nameObject[0],
      customer_last_name: nameObject[1],
      customer_email: wallet.user.email,
      customer_phone_number: wallet.user.phone,
      transaction_amount: amount,
      expires_in_minutes: 30,
    };
    try {
      const payozaRes = await firstValueFrom(
        this.httpService.post(
          `${this.payozaBaseUrl}/test/merchant-collection/merchant/virtual_account/generate_virtual_account`,
          payozaPayload,
          {
            headers: {
              Authorization: this.authHeader,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      await this.db.topups.create({
        data: {
          walletId: wallet.id,
          payozaRef,
          amount,
          bankName: payozaRes.data.data.bank_name,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: TopUpStatus.PENDING,
        },
      });
      console.log(payozaRes, 'Payores res');
      return {
        message: 'Top up initiated successfully',
        data: {
          accountNumber: payozaRes.data.data.account_number,
          bankName: payozaRes.data.data.bank_name,
          amount,
          expiresIn: '30 minutes',
          reference: payozaRef,
        },
      };
    } catch (err) {
      console.error('Payaza endpoint error', err);
      this.loggerService.error(
        `Could not initiateTopUp`,
        'Payoza Service',
        (err as any)?.message,
      );
      throw new BadRequestException(`Could not initiate payoza topup`);
    }
  }

  private async simulateTopUp(userId: string, amount: number) {
    const wallet = await this.db.wallet.findUnique({
      where: {
        userId,
      },
      include: {
        user: true,
      },
    });
    if (!wallet) {
      this.loggerService.error(
        `Could not find wallet for user ${userId}`,
        'Payoza Service',
      );
      throw new NotFoundException(`Could not find wallet for user ${userId}`);
    }

    const { data } = await this.initiateTopup(userId, amount);
    const payozaPayload = {
      account_name: wallet.user.name,
      account_number: data.accountNumber,
      initiation_transaction_reference: data.reference,
      transaction_amount: Number(data.amount),
      currency: 'NGN',
      source_account_number: '0123456789',
      source_account_name: 'Test User',
      source_bank_name: 'Test Bank',
    };

    try {
      const payazaRes = await firstValueFrom(
        this.httpService.post(
          `https://api.payaza.africa/test/merchant-collection/payaza/virtual_account/fund_test_virtual_account`,
          payozaPayload,
          {
            headers: {
              Authorization: this.authHeader,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      await this.db.$transaction(async (tx) => {
        await tx.topups.update({
          where: {
            payozaRef: data.reference,
          },
          data: {
            status: 'COMPLETED',
          },
        });
        await tx.wallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            balance: { increment: amount },
          },
        });
      });

      return {
        message: payazaRes.data.message,
        success: payazaRes.data.success,
      };
    } catch (err) {
      console.error('Payaza endpoint error', err);
      this.loggerService.error(
        `Could not initiateTopUp`,
        'Payoza Service',
        (err as any)?.message,
      );
      throw new BadRequestException(`Could not simulate payoza topup`);
    }
  }

  async handleWebhook(payload: any, signature: string) {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('base64');

    if (hash !== signature) {
      throw new UnauthorizedException(`Invalid webhook signature`);
    }

    if (payload.transaction_status !== 'Funds Received') {
      return { recieved: true };
    }

    const existingTopup = await this.db.topups.findUnique({
      where: {
        payozaRef: payload.merchant_reference,
      },
    });
    if (!existingTopup) {
      this.loggerService.error(
        `Top up record  not found for ref ${payload.transaction_reference}`,
        'Payaza Service',
      );
      throw new NotFoundException(
        `Top up record  not found for ref ${payload.transaction_reference}`,
      );
    }
    await this.db.$transaction(async (tx) => {
      await tx.topups.update({
        where: {
          id: existingTopup.id,
        },
        data: {
          completedAt: new Date(),
          status: TopUpStatus.COMPLETED,
        },
      });
      await tx.wallet.update({
        where: {
          id: existingTopup.walletId,
        },
        data: {
          balance: { increment: payload.amount_received },
        },
      });
    });
    return { recieved: true };
  }

  async handleTopup(userId: string, amount: number) {
    const wallet = await this.db.wallet.findUnique({
      where: {
        userId,
      },
      include: {
        user: true,
      },
    });

    const payazaRef = uuidV4();
    if (!wallet) {
      this.loggerService.error(
        `Could not find wallet for user ${userId}`,
        'Payoza Service',
      );

      throw new NotFoundException(`Could not find wallet for user ${userId}`);
    }

    const updatedWallet = await this.db.$transaction(async (tx) => {
      await tx.topups.create({
        data: {
          walletId: wallet.id,
          payozaRef: payazaRef,
          amount,
          bankName: 'Test',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: TopUpStatus.PENDING,
        },
      });

      await tx.topups.update({
        where: {
          payozaRef: payazaRef,
        },
        data: {
          status: 'COMPLETED',
        },
      });

      return await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: { increment: amount },
        },
       
      });
    });

    const devices = await this.db.device.findMany({
      where: {
        userId,
      },
    });
    if (devices && devices.length > 0) {
     const tokens = devices.map((device) => device.deviceId ?? '').filter(token => token !== '');

      if (tokens.length === 1) {
        await this.firebaseService.sendToDevice(
          tokens[0],
          'Wallet Topup',
          `You have successfully been credited ₦${amount}`,
        );
      } else {
        
        await this.firebaseService.sendToMultipleDevices(
          tokens,
          'Wallet Topup',
          `You have successfully been credited ₦${amount}`,
        );
      }
    }

    return {
      message: 'Topup successful',
      data: {
        wallet: updatedWallet,
      },
    };
  }
}
