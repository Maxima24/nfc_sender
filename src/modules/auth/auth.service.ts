import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { LoggerService } from 'src/logger/logger.service';
import { SquadcoService } from '../squadco/squadco.service';
import { Currency } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: PrismaService,
    private jwt: JwtService,
    private configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly squadcoService: SquadcoService,
  ) {}
  public async registerUser(body: SignupDto) {
    const { email, name, password, phone } = body;

    if (!email || !password || !name || !phone) {
      this.logger.warn('FIll in all Field', 'Auth', {
        email,
        name,
      });
      throw new BadRequestException('Fill in all fields');
    }

    const hashedPwd = await bcrypt.hash(password, 10);
    const { tokens, userObj } = await this.db.$transaction(async (tx) => {
      if (!email) {
        throw new BadRequestException('Fill in the email Field');
      }
      const user = await tx.user.findFirst({
        where: {
          email,
        },
      });
      if (user) {
        throw new BadRequestException('This user already exists Login ');
      }

      const newUser = await tx.user.create({
        data: {
          email: email,
          name: name,
          password: hashedPwd,
          phone,
        },
        omit: {
          password: true,
        },
      });

      await tx.wallet.create({
        data: {
          balance: 0,
          currency: Currency.NGN,
          userId: newUser.id,
        },
      });

      const payload = {
        email: newUser.email,
        id: newUser.id,
        role: newUser.role,
      };
      const accessToken = this.jwt.sign(payload);
      const refreshToken = this.jwt.sign(payload, {
        secret: this.configService.get('JWT_SECRET')!,
        expiresIn: '7d',
      });

      this.logger.logAuthEvent('Register', newUser?.id, {
        email: newUser.email,
      });

      return {
        tokens: {
          accessToken,
          refreshToken,
        },
        userObj: newUser,
      };
    });

    try {
      await this.squadcoService.createVirtualAccount(userObj);
    } catch (err) {
        if(err instanceof HttpException){
            throw err
        }else{
          this.logger.error(
    `Virtual account creation failed for user ${userObj.id}`,
    'AuthService',
  );
        }
    }

    return {
      message: 'User creation successful',
      data: {
        ...tokens,
        userObj,
      },
    };
  }

  public async getUser(userId: string) {
    if (!userId) {
      this.logger.warn('User id Must not be blank', 'Auth', {
        userId,
      });
      throw new BadRequestException('User id Must not be blank');
    }
    const user = await this.db.user.findFirst({
      where: {
        id: userId,
      },
      omit: {
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      this.logger.warn('User not found', 'Auth');
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User details retrieval successful',
      data: {
        ...user,
      },
    };
  }
  public async loginUser(body: LoginDto) {
    const { password: oldPwd, email } = body;

    if (!email) {
      this.logger.warn('Email or phoneno must exist,', 'Auth');
      throw new BadRequestException('Email or phoneno must exist');
    }
    const user = await this.db.user.findFirst({
      where: {
        email,
      },
      omit: {
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      this.logger.warn('User does not exist', 'Auth', {
        email,
      });
      throw new NotFoundException('User Does not exist');
    }
    const pwdMatch = await bcrypt.compare(oldPwd, user.password);
    if (!pwdMatch) {
      this.logger.warn('Ivalid credentials', 'Auth', {
        userId: user.id,
        email: user.email,
      });
      throw new BadRequestException('Invalid Credentials');
    }

    const payload = {
      email: user.email,
      id: user.id,
      role: user.role,
    };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.configService.get('JWT_SECRET')!,
      expiresIn: '30d',
    });
    this.logger.logAuthEvent('login', user.id, {
      email: user.email,
    });
    return {
      message: 'Login Successful',
      data: {
        ...user,
        accessToken,
        refreshToken,
      },
    };
  }
  public async refreshToken(userId: string, refreshToken: string) {
    const user = await this.db.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new BadRequestException('Could not find user');
    }
    if (!refreshToken) {
      throw new BadRequestException('Could not parse refresh token');
    }
    const verified = await this.jwt.verify(refreshToken, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
    if (!verified) {
      throw new BadRequestException('Could not verify refresh token');
    }
    const payload = {
      email: user.email,
      password: user.password,
      role: user.role,
    };
    const accessToken = this.jwt.sign(payload);
    const newrefreshToken = this.jwt.sign(payload, {
      secret: this.configService.get<string>('JWT_SERVICE'),
      expiresIn: '30d',
    });

    return {
      message: 'refresh token generated successfully',
      data: {
        accessToken,
        refreshToken,
      },
    };
  }
}
