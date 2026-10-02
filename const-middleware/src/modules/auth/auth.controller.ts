import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { IsOptional, IsString } from 'class-validator';

class RefreshDto {
  @IsOptional()
  @IsString()
  refresh_token?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return result;
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token ?? '');
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refresh_token);
  }
}
