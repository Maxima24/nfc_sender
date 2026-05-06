import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { JwtService } from '@nestjs/jwt';
import { ExecuteTransferDto } from './dto/execute-transfer.dto';
import { ConfigService } from '@nestjs/config';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { Prisma, TransferStatus, TransferType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface IjwtSignTransaction {
  senderId: string;
  amount: number;
  transferId: string;
}
@Injectable()
export class TransferService {
  constructor(
    private readonly db: PrismaService,
    private readonly loggerService: LoggerService,
    private jwt: JwtService,
    private configService: ConfigService,
  ) {}

  private async jwtSignTransaction(payload: IjwtSignTransaction) {
    if (!payload.senderId || !payload.transferId) {
      this.loggerService.warn(
        `senderId, amount or transferId missing`,
        'Transfer Service',
      );
      throw new BadRequestException(
        `senderId , amount or transfer id is missing`,
      );
    }
    const token = this.jwt.sign(payload, {
      expiresIn: '1m',
    });

    return token;
  }

  private extractTransferPayload(body: ExecuteTransferDto) {
    try {
      const payload: IjwtSignTransaction = this.jwt.verify(body.token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return payload;
    } catch (error) {
      this.loggerService.error(`Could not verify token`, 'Transfer Service');
      throw new UnauthorizedException(`Invalid or expired transfer token`);
    }
  }

  async executeTransaction(userId: string, token: ExecuteTransferDto) {
    const payload = this.extractTransferPayload(token);
      if (userId === payload.senderId) {
  throw new BadRequestException('You cannot transfer to yourself')
}
    const [transfer, senderWallet, recieverWallet] = await Promise.all([
      this.db.transfer.findUnique({
        where: {
          id: payload.transferId,
        },
      }),
      this.db.wallet.findUnique({
        where: {
          userId: payload.senderId,
        },
      }),
      this.db.wallet.findUnique({
        where: {
          userId,
        },
      }),
    ]);

    if (!transfer) {
      this.loggerService.error(
        `Could not find transfer record for  transfer id ${payload.transferId},`,
        'Transfer service',
      );
      throw new NotFoundException(
        `Could not find transfer record for  transfer id ${payload.transferId}`,
      );
    }
    if (!recieverWallet) {
      this.loggerService.error(
        `Could not find wallet for user with id ${userId},`,
        'Transfer service',
      );
      throw new NotFoundException(
        `Could not find wallet for user with id ${userId}`,
      );
    }
    if (!senderWallet) {
      this.loggerService.error(
        `Could not find wallet for user with id ${payload.senderId},`,
        'Transfer service',
      );
      throw new NotFoundException(
        `Could not find wallet for user with id ${payload.senderId}`,
      );
    }
  
    if (transfer.status !== TransferStatus.PENDING) {
      this.loggerService.error(
        `Transfer ${payload.transferId} cannot be processed — status is ${transfer.status}`,
        'Transfer Service',
      );
      throw new BadRequestException(
        `Transfer ${payload.transferId} cannot be processed — status is ${transfer.status}`,
      );
    }
    if (payload.amount !== Number(transfer.amount)) {
      this.loggerService.error(
        `Amount has been tampered with for transfer ${payload.transferId}`,
        'Transfer Service',
      );
      throw new BadRequestException(
        `Amount has been tampered with for transfer ${payload.transferId}`,
      );
    }

    if (Number(senderWallet.balance) < payload.amount) {
      this.loggerService.error(
        `Cannot process transaction, sender ${userId} balance insufficient `,
        'TransferService',
      );
      throw new BadRequestException(
        `Cannot process transaction, sender ${payload.senderId} balance insufficient `,
      );
    }

    const transferObj = await this.db.$transaction(async (tx) => {
      await tx.wallet.update({
        where: {
          id: senderWallet.id,
        },
        data: {
          balance: { decrement: payload.amount },
        },
      });

      //update recievers wallet

      await tx.wallet.update({
        where: {
          id: recieverWallet.id,
        },
        data: {
          balance: { increment: payload.amount },
        },
      });

      const updatedTransfer = await tx.transfer.update({
        where: {
          id: transfer.id,
        },
        data: {
          status: TransferStatus.COMPLETED,
          completedAt: new Date(),
          recieverId:userId
        },
      });

      return {
        message: 'Transfer successful',
        data: {
          transfer: updatedTransfer,
        },
      };
    });

    return transferObj;
  }

  async iniitiateTransaction(userId: string, body: InitiateTransferDto) {
    const { amount, description,transferType } = body;

    
   

    const  senderWallet = await 
      this.db.wallet.findUnique({
        where: {
          userId,
        },
      })
   


    if (!senderWallet) {
      this.loggerService.error(
        `Could not find sender wallet for user ${userId}`,
        'Transfer Service',
      );
      throw new NotFoundException(
        `Could not find sender wallet for user ${userId}`,
      );
    }

    if (Number(senderWallet.balance) < amount) {
      this.loggerService.error(
        `Wallet balance is insufficient for transfer :- wallet ${senderWallet.id}`,
        'Transfer service',
      );
      throw new BadRequestException(
        `Wallet balance is insufficient for transfer :- wallet ${senderWallet.id}`,
      );
    }

    const transferId = uuidv4();
    const payload: IjwtSignTransaction = {
      amount,
      senderId: userId,
      transferId,
    };
    const token = await this.jwtSignTransaction(payload);
    const transfer = await this.db.transfer.create({
      data: {
        id: transferId,
        amount,
        senderId: userId,
        ...(description && { description }),
        status: TransferStatus.PENDING,
        transferType: transferType ?? TransferType.NFC,
        token,
      },
    });

    return {
      message: 'Transfer created successfully',
      data: {
        transferId: transfer.id,
        token,
      },
    };
  }
}
