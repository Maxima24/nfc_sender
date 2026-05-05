import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidV4 } from 'uuid';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PayozaService {
  private payozaBaseUrl = 'https://api/payaza/africa';
  private authHeader: string;
  constructor(
    private readonly db: PrismaService,
    private readonly loggerService: LoggerService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    const publicKey = this.configService.get<string>(`PAYAZA_PUBLIC_KEY`);
    const payazaBaseUrl = this.configService.get<string>(`PAYAZA_BASE_URL`);
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

    this.authHeader = `PAYAZA ${Buffer.from(publicKey).toString('base64')}`;
  }

  async initiateTopup(userId: string, amount: number) {
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
    const payozaRes = await firstValueFrom(
      this.httpService.post(
        `${this.payozaBaseUrl}/live/merchant-collection/merchant/virtual_account/generate_virtual_account`,payozaPayload,{
            headers:{
                Authorization: this.authHeader,
                "Content-Type":"application/json"
            }
        }
      ),
    );
  }
}
