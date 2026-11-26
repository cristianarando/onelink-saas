import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { TrackClickSchema, TrackPageViewSchema } from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard';
import { AnalyticsService } from './analytics.service';
import { TrackClickDto, TrackPageViewDto } from './dto/analytics.dto';

@ApiTags('Telemetry & Tracking')
@UseGuards(RateLimitGuard)
@RateLimit(30, 60)
@Controller('track')
export class TrackController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private extractCountryCode(req: Request): string | undefined {
    const raw =
      (req.headers['x-vercel-ip-country'] as string) ||
      (req.headers['cf-ipcountry'] as string) ||
      (req.headers['x-country-code'] as string);
    if (!raw || typeof raw !== 'string') return undefined;
    const code = raw.split(',')[0].trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return undefined;
    return code;
  }

  @Post('click')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(TrackClickSchema))
  @ApiOperation({
    summary: 'Client Beacon: Ingests outbound link click event (returns 204 immediately)',
  })
  @ApiResponse({ status: 204, description: 'Click event registered successfully' })
  async trackClick(@Body() dto: TrackClickDto, @Req() req: Request): Promise<void> {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : undefined;
    const userAgent = req.headers['user-agent'];
    const country = this.extractCountryCode(req);

    await this.analyticsService.recordClick(dto, clientIp, userAgent, country);
  }

  @Post('view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(TrackPageViewSchema))
  @ApiOperation({
    summary: 'Client Beacon: Ingests profile page view event (returns 204 immediately)',
  })
  @ApiResponse({ status: 204, description: 'Page view event registered successfully' })
  async trackPageView(@Body() dto: TrackPageViewDto, @Req() req: Request): Promise<void> {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : undefined;
    const userAgent = req.headers['user-agent'];
    const country = this.extractCountryCode(req);

    await this.analyticsService.recordPageView(dto, clientIp, userAgent, country);
  }
}
