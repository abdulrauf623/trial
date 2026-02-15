import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterInput, LoginInput, AuthResponse, MeResponse } from '@fashion/shared';

const USER_SAFE_SELECT = {
  id: true,
  email: true,
  displayName: true,
  accountType: true,
  avatarUrl: true,
  isPremium: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: RegisterInput): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        accountType: data.accountType,
        stylePreferences: data.stylePreferences || [],
      },
      select: USER_SAFE_SELECT,
    });

    const tokens = await this.generateTokens(user.id);

    return {
      ...tokens,
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: { ...USER_SAFE_SELECT, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        accountType: user.accountType,
        avatarUrl: user.avatarUrl,
        isPremium: user.isPremium,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async getUserById(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SAFE_SELECT,
    });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async refreshTokenFromBody(refreshTokenValue: string) {
    try {
      const payload = this.jwtService.verify(refreshTokenValue);
      if (!payload.userId) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true },
      });
      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }
      return this.generateTokens(user.id);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ userId });
    const refreshToken = this.jwtService.sign({ userId }, { expiresIn: '30d' });
    return { accessToken, refreshToken };
  }
}
