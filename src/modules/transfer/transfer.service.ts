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
import {
  NotificationType,
  Prisma,
  TransferStatus,
  TransferType,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { ICreateNotificationDto } from '../notification/dto/create-notification.dto';
import { ICreatePhoneTransfer } from './dto/create-phone-transfer.dto';
import { NotificationsService } from '../notification/notification.service';
import { LedgerService } from '../wallet/ledger.service';

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
    private readonly notificationsService: NotificationsService,
    private readonly ledger: LedgerService,
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
      throw new BadRequestException('You cannot transfer to yourself');
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
        include: { user: { select: { id: true, name: true } } },
      }),
      this.db.wallet.findUnique({
        where: {
          userId,
        },
        include: { user: { select: { id: true, name: true } } },
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
      await this.ledger.debit(tx, senderWallet.id, payload.amount, {
        description: transfer.description ?? undefined,
        transferType: transfer.transferType,
      });

      await this.ledger.credit(tx, recieverWallet.id, payload.amount, {
        description: transfer.description ?? undefined,
        transferType: transfer.transferType,
      });

      const updatedTransfer = await tx.transfer.update({
        where: {
          id: transfer.id,
        },
        data: {
          status: TransferStatus.COMPLETED,
          completedAt: new Date(),
          recieverId: userId,
        },
      });

      return {
        message: 'Transfer successful',
        data: {
          transfer: updatedTransfer,
        },
      };
    });

    await Promise.all([
      this.notificationsService.createAndPush({
        userId: senderWallet.user.id,
        title: 'Payment Sent ✓',
        body: `₦${payload.amount} sent successfully`,
        type: NotificationType.DEBIT,
        metaData: {
          amount: payload.amount,
          receiverId: recieverWallet.user.id,
          transferType: transfer.transferType,
        },
      }),
      this.notificationsService.createAndPush({
        userId: recieverWallet.user.id,
        title: 'Payment Received 💚',
        body: `You received ₦${payload.amount}`,
        type: NotificationType.CREDIT,
        metaData: {
          amount: payload.amount,
          senderId: senderWallet.user.id,
          transferType: transfer.transferType,
        },
      }),
    ]);

    return transferObj;
  }

  async iniitiateTransaction(userId: string, body: InitiateTransferDto) {
    const { amount, description, transferType } = body;

    console.log('userId from JWT:', userId);

    const senderWallet = await this.db.wallet.findUnique({
      where: {
        userId,
      },
      include: {
        user: {
          omit: {
            password: true,
          },
        },
      },
    });

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
        `Wallet balance is insufficient for transfer :- wallet ${senderWallet.id} for user ${senderWallet.user.name}`,
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

  async transByPhone(userId: string, body: ICreatePhoneTransfer) {
    const { amount, phoneNumber, transferType, description } = body;

   const normalized = phoneNumber.startsWith('0')
  ? '+234' + phoneNumber.slice(1)  // 👈 add the +
  : phoneNumber.startsWith('234')
  ? '+' + phoneNumber              // 👈 add the +
  : phoneNumber
    const { sender, receiver } = await this.db.$transaction(async (tx) => {

      const receiver = await tx.user.findUnique({
        where: {
          phone: normalized,
        },
      });
      if (!receiver) {
        throw new NotFoundException(
          `Could not find user for the phone number ${phoneNumber}`,
        );
      }
      if (receiver.id === userId) {
        throw new BadRequestException(`You cannot transfer to yourself`);
      }

      const senderWallet = await tx.wallet.findUnique({
        where: {
          userId,
        },
        include: { user: { select: { id: true, name: true } } },
      });
      if (!senderWallet) {
        throw new NotFoundException(
          `Could not find wallet for the user ${userId}`,
        );
      }

      if (Number(senderWallet.balance) < amount) {
        throw new BadRequestException(`User ${userId} : Insufficient balance`);
      }

      const receiverWallet = await tx.wallet.findUnique({
        where: { userId: receiver.id },
        select: { id: true },
      });
      if (!receiverWallet) {
        throw new NotFoundException(
          `Could not find wallet for receiver ${receiver.id}`,
        );
      }

      await this.ledger.debit(tx, senderWallet.id, amount, {
        description,
        transferType: TransferType.MANUAL,
      });
      await this.ledger.credit(tx, receiverWallet.id, amount, {
        description,
        transferType: TransferType.MANUAL,
      });

      const transferData = {
        amount,
        ...(description && { description }),
        senderId: userId,
        recieverId: receiver.id,
        transferType: TransferType.MANUAL,
      };
      console.log('transfer create data:', transferData);

      await tx.transfer.create({
        data: transferData,
      });

      return { sender: senderWallet.user, receiver };
    });

    await Promise.all([
      this.notificationsService.createAndPush({
        userId: sender.id,
        title: 'Payment Sent ✓',
        body: `₦${amount} sent successfully`,
        type: NotificationType.DEBIT,
        metaData: {
          amount,
          receiverId: receiver.id,
          transferType: TransferType.MANUAL,
        },
      }),
      this.notificationsService.createAndPush({
        userId: receiver.id,
        title: 'Payment Received 💚',
        body: `You received ₦${amount}`,
        type: NotificationType.CREDIT,
        metaData: {
          amount,
          senderId: sender.id,
          transferType: TransferType.MANUAL,
        },
      }),
    ]);

    return {
      message: 'Transfer  successful',
    };
  }
  async searchRecipientByPhone(query: string, userId: string) {
    const normalized = query.startsWith('0')
      ? '234' + query.slice(1)
      : query.replace(/\+/g, '').replace(/\s/g, '');

    console.log('query:', query);
    console.log('normalized:', normalized);

    const user = await this.db.user.findFirst({
      where: {
        phone: {
          contains: normalized,
        },
        NOT: {
          id: userId,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });
    console.log('found user:', user);
    if (!user) {
      throw new NotFoundException(`No Tappay USer found for query ${query}`);
    }
    return {
      message: 'User found',
      data: {
        user,
      },
    };
  }
}
