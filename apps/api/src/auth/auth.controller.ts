import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '@fashion/shared';

interface AuthRequest extends Request {
  user: {
    userId: string;
    email?: string;
    accountType?: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const data = RegisterSchema.parse(body);
    return this.authService.register(data);
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const data = LoginSchema.parse(body);
    return this.authService.login(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: AuthRequest) {
    return this.authService.getUserById(req.user.userId);
  }

  @Post('refresh')
  async refresh(@Body() body: unknown) {
    const data = RefreshTokenSchema.parse(body);
    return this.authService.refreshTokenFromBody(data.refreshToken);
  }
}
