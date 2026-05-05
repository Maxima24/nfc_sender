import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { SquadTopUpDto } from './dto/squad-topup.dto';
import { TopUpStatus, User } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { NotFound } from '@aws-sdk/client-s3';

interface IVdaPayload {
  customer_identifier: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile_num: string;
  bvn: string;
  dob: string;
  address: string;
  gender: string;
  beneficiary_account: string;
}
@Injectable()
export class SquadcoService {
  private squadSecret;
  private squadBeneficiary;
  constructor(
    private readonly db: PrismaService,
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    if (!this.configService.get<string>('SQUAD_BENEFICIARY_ACCOUNT')) {
      this.loggerService.error(
        'Squad beneficiary account is missing',
        'Squad service',
      );
      throw new BadRequestException('Squad Beneficiary account is missing');
    }
    if (!this.configService.get<string>('SQUADCO_SECRET_KEY')) {
      this.loggerService.error('Squad Secret is missing', 'Squad service');
      throw new BadRequestException('Squad Secert is missing');
    }
    this.squadSecret = this.configService.get<string>('SQUADCO_SECRET_KEY');
    this.squadBeneficiary = this.configService.get<string>(
      'SQUAD_BENEFICIARY_ACCOUNT',
    );
  }

  async createVirtualAccount(user: Omit<User, 'password'>) {
    const nameObject = user.name.split(' ');
    const payload: IVdaPayload = {
      customer_identifier: `squado_${user.id}`,
      email: user.email,
      mobile_num: user.phone ?? Number('23470896758'),
      firstName: nameObject[0],
      lastName: nameObject[1],
      bvn: '22343211654',
      dob: '01/23/1990',
      address: '22 Lagos Street, Nigeria',
      gender: '1',
      beneficiary_account: this.squadBeneficiary,
    };

    const { data } = await firstValueFrom(
      this.httpService.post(
        `https://sandbox-api-d.squadco.com/virtual-account`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.squadSecret}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    if (!data) {
      this.loggerService.error(
        `Could not create virtual account for user ${user.id}`,
        'Squadco Service',
      );
      throw new BadRequestException(
        `Could not create virtual account for user ${user.id}`,
      );
    }

    await this.db.wallet.update({
      where: {
        userId: user.id,
      },
      data: {
        virtualAccountNumber: data.virtualAccountNumber,
        virtualBankAccount: data.virtualBankAccount,
      },
    });
  }
  async handleWebhook(payload: any, signature: string) {
    const stringToHash = `${payload.transaction_reference}|${payload.virtual_account_number}|${payload.currency}|${payload.principal_amount}|${payload.settled_amount}|${payload.customer_identifier}`;

    const hash = crypto
      .createHmac('sha512', this.squadSecret)
      .update(stringToHash)
      .digest('hex');

    if (hash !== signature) {
      throw new UnauthorizedException('invalid Webhook signature');
    }

    const existingTopUp = await this.db.topups.findUnique({
      where: {
        squadRef: payload.transaction_reference,
      },
    });
    if (existingTopUp && existingTopUp.status === TopUpStatus.COMPLETED) {
      return {
        response_code: 200,
        transaction_reference: payload.transaction_reference,
        response_description: 'Success',
      };
    }
    const wallet = await this.db.wallet.findUnique({
      where: {
        customerIdentifier: payload.customer_identifier,
      },
    });

    if (!wallet) {
      throw new NotFoundException(
        `Could not find wallet for customer ${payload.customer_identifier}`,
      );
    }

    await this.db.$transaction(async (tx) => {
      const topUp = await tx.topups.create({
        data: {
          status: TopUpStatus.COMPLETED,
          amount: payload.principal_amount,
          squadRef: payload.transaction_reference,
          walletId: wallet.id,
        },
      });

      await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: { increment: payload.principal_amount },
        },
      });

      return topUp;
    });

    return {
      response_code: 200,
      transaction_reference: payload.transaction_reference,
      response_description: 'Success',
    };
  }
  async simulatePayment(virtualAccountNumber:string, amount:number) {
    
  }
}
