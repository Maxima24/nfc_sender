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
import { Prisma, TransactionType, TransferStatus, TransferType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { ICreateNotificationDto } from '../notification/dto/create-notification.dto';
import { ICreatePhoneTransfer } from './dto/create-phone-transfer.dto';

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

    console.log('userId from JWT:', userId)
   

    const  senderWallet = await 
      this.db.wallet.findUnique({
        where: {
          userId,
        },
        include:{
          user:{
            omit:{
              password:true
            }
          }
        }
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

  async transByPhone(userId:string,body:ICreatePhoneTransfer){
      const {amount,phoneNumber,transferType,description} = body
      await this.db.$transaction(async(tx)=>{
          const receiver = await tx.user.findUnique({
            where:{
              phone:phoneNumber
            }
          })
          if(!receiver){
            throw new NotFoundException(`Could not find user for the phone number ${phoneNumber}`)
          }
          if(receiver.id === userId){
            throw new BadRequestException(`You cannot transfer to yourself`)
          }

          const senderWallet = await tx.wallet.findUnique({
            where:{
              userId
            }
          })
          if(!senderWallet){
            throw new NotFoundException(`Could not find wallet for the user ${userId}`)
          }
        
          if(Number(senderWallet.balance) < amount){
              throw new BadRequestException(`User ${userId} : Insufficient balance`)
          }

           await tx.wallet.update({
            where:{
              userId
            },
            data:{
              balance:{decrement:amount}
            }
          })

        const receiverWallet =  await tx.wallet.update({
            where:{
              userId:receiver.id
            },
            data:{
              balance:{increment:amount}
            }
          })

          await tx.transfer.create({
            data:{
              amount,
              ...(description && {description}),
              senderId:userId,
              recieverId:receiver.id,
              transferType:TransferType.MANUAL
            }
          })

          await tx.transactions.create({
            data:{
              amount,
              type:TransactionType.DEBIT,
              transferType:TransferType.MANUAL,
              ...(description && {description}),
              walletId: senderWallet.id,
            }
          })
            await tx.transactions.create({
            data:{
              amount,
              type:TransactionType.CREDIT,
              transferType:TransferType.MANUAL,
              ...(description && {description}),
              walletId: receiverWallet.id,
            }
          })
      
      })
      return {
        message:"Transfer  successful",
      }
  }
  async searchRecipientByPhone(query:string,userId:string){
     const normalized = query.replace(/\+/g, '').replace(/\s/g, '')
    const user = await this.db.user.findFirst({
      where:{
        phone:{
          contains:normalized
        },
        NOT:{
          id:userId
        },
        
      },
      select:{
        id:true,
        name:true,
        phone:true
      }
    })
    if(!user){
      throw new NotFoundException(`No Tappay USer found for query ${query}`)
    }
    return {
      message:'User found',
      data:{ 
        user
      }
    }
  }
}
