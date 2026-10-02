import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /** Spec §7: Argon2id primary; bcrypt accepted only to migrate legacy seed hashes. */
  private async verifyPassword(password: string, hash: string) {
    if (hash.startsWith('$argon2')) {
      return argon2.verify(hash, password);
    }
    return bcrypt.compare(password, hash);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: { company: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await this.verifyPassword(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Upgrade legacy bcrypt hashes to Argon2id on successful login
    if (!user.passwordHash.startsWith('$argon2')) {
      const upgraded = await argon2.hash(dto.password, {
        type: argon2.argon2id,
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: upgraded },
      });
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      } as Parameters<JwtService['signAsync']>[1],
    );

    const refreshRaw = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(refreshRaw).digest('hex');
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
    const expiresAt = this.parseTtlDate(refreshTtl);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.audit.write({
      userId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshRaw,
      expires_in: refreshTtl,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        memberships: user.memberships.map((m) => ({
          company_id: m.companyId,
          company_name: m.company.name,
          role: m.role,
        })),
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('refresh_token required');
    }
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.jwt.signAsync(
      { sub: stored.user.id, email: stored.user.email },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      } as Parameters<JwtService['signAsync']>[1],
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return { ok: true };
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private parseTtlDate(ttl: string): Date {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const n = Number(match[1]);
    const unit = match[2];
    const ms =
      unit === 's'
        ? n * 1000
        : unit === 'm'
          ? n * 60 * 1000
          : unit === 'h'
            ? n * 60 * 60 * 1000
            : n * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ms);
  }
}
