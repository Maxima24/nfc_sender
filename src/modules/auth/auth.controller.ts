import { BadRequestException, Body, Controller, Get, HttpCode, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BuyerSignupDto } from './dto/buyer.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DeviceTokenDto } from './dto/device-token.dto';
import { RegistrationResponse, VendorLoginResponse } from './dto/buyer-response.dto';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';
import { JwtGuard } from 'src/common/utils/jwt.utils';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  @ApiOperation({ summary: 'Register a new user (buyer or seller)' })
  @ApiBody({ type: BuyerSignupDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    example: RegistrationResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid input' })
  @ApiResponse({ status: 409, description: 'Conflict - user already exists' })
  public async RegisterUser(@Body() body: BuyerSignupDto) {
    if (!body) {
      throw new BadRequestException('Request body given was empty');
    }
    return this.authService.registerUser(body);
  }

  @Post('/login')
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    example: VendorLoginResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid credentials' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  public async LoginUser(@Body() body: LoginDto) {
    return this.authService.loginUser(body);
  }

  @Post("/refresh")
  @UseGuards(JwtGuard)
  @ApiOperation({description:"Refresh user token"})
  @ApiBody({type:RefreshTokenDto})
  public async refreshToken(@CurrentUser() user,dto:RefreshTokenDto){
      return this.authService.refreshToken(user.id,dto.refreshToken)
  }
  @Get('/me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user details' })
  @ApiResponse({
    status: 200,
    description: 'User details fetched successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@CurrentUser() user) {
    return this.authService.getUser(user.id);
  }

  @Patch('/device-token')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update device token for push notifications' })
  @ApiBody({ type: DeviceTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Device token updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handleDeviceTokenEdit(@Req() req: any, @Body() body: { deviceToken: string }) {
    const userId = req.user.id;
    return this.authService.editDeviceToken({ deviceToken: body.deviceToken, userId });
  }
}
