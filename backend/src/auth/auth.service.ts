import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../admin/schemas/audit-log.schema';
import { User, UserDocument } from '../investor/schemas/user.schema';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private signToken(user: UserDocument) {
    const roles = user.roles?.length ? user.roles : ['investor'];
    const payload = { sub: user.id, email: user.email, name: user.name, roles };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        roles,
        balance: user.balance,
        totalInvested: user.totalInvested,
        totalEarned: user.totalEarned,
        emailVerified: user.emailVerified,
        referralCode: user.referralCode,
        referralCount: user.referralCount ?? 0,
        referralEarnings: user.referralEarnings ?? 0,
      },
    };
  }

  async register(
    name: string,
    email: string,
    password: string,
    phoneNumber: string,
    referralCode?: string,
  ) {
    if (!name || !email || !password || !phoneNumber) {
      throw new BadRequestException('Name, email, phone number and password are required');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhoneNumber = this.normalizeInternationalPhoneNumber(phoneNumber);
    const existing = await this.userModel.findOne({ email: normalizedEmail }).exec();
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL')?.toLowerCase();
    const roles =
      adminEmail && normalizedEmail === adminEmail
        ? ['investor', 'admin', 'superadmin']
        : ['investor'];
    const referrer = await this.findReferrer(referralCode, normalizedEmail);
    const user = new this.userModel({
      name,
      email: normalizedEmail,
      phoneNumber: normalizedPhoneNumber,
      passwordHash,
      roles,
      balance: 0,
      totalInvested: 0,
      totalEarned: 0,
      referralCode: await this.generateReferralCode(name, normalizedEmail),
      referredBy: referrer?._id ?? null,
      referralCount: 0,
      referralEarnings: 0,
      referralRewardPaid: false,
      emailVerified: false,
    });
    await user.save();
    if (referrer) {
      referrer.referralCount = (referrer.referralCount ?? 0) + 1;
      await referrer.save();
    }
    const verification = await this.issueEmailVerification(user);
    await this.mailService.sendVerificationEmail(user.email, user.name, verification);
    await this.audit('auth.register', user.email, user.id, {
      roles,
      referralCode: user.referralCode,
      referredBy: referrer?.id,
    });
    return {
      ...this.signToken(user),
      verificationToken: this.exposeTokenForEnvironment(verification),
    };
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
    // select passwordHash which is normally hidden
    const user = await this.userModel
      .findOne({ email: email.trim().toLowerCase() })
      .select('+passwordHash')
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.deletedAt) {
      throw new UnauthorizedException('This account is not active');
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException('Account is temporarily locked. Try again later.');
    }

    // Migration fallback: if user has no password hash yet, reject and ask to re-register
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account needs a password reset — please create a new account or contact support',
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= this.maxLoginAttempts()) {
        user.lockedUntil = new Date(Date.now() + this.lockoutMs());
        user.failedLoginAttempts = 0;
      }
      await user.save();
      await this.audit('auth.login_failed', user.email, user.id);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.referralCode) {
      user.referralCode = await this.generateReferralCode(user.name, user.email);
    }
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();
    await this.audit('auth.login', user.email, user.id);
    return this.signToken(user);
  }

  async me(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.deletedAt) {
      throw new UnauthorizedException('This account is not active');
    }
    if (!user.referralCode) {
      user.referralCode = await this.generateReferralCode(user.name, user.email);
      await user.save();
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      roles: user.roles?.length ? user.roles : ['investor'],
      balance: user.balance,
      totalInvested: user.totalInvested,
      totalEarned: user.totalEarned,
      emailVerified: user.emailVerified,
      referralCode: user.referralCode,
      referralCount: user.referralCount ?? 0,
      referralEarnings: user.referralEarnings ?? 0,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.userModel
      .findOne({ email: email?.trim().toLowerCase() })
      .select('+passwordResetTokenHash')
      .exec();
    if (!user) {
      return { success: true };
    }

    const token = this.generateToken();
    user.passwordResetTokenHash = this.hashToken(token);
    user.passwordResetExpiresAt = new Date(Date.now() + this.resetTokenTtlMs());
    await user.save();
    await this.mailService.sendPasswordResetEmail(user.email, user.name, token);
    await this.audit('auth.password_reset.request', user.email, user.id);
    return { success: true, resetToken: this.exposeTokenForEnvironment(token) };
  }

  async resetPassword(token: string, password: string) {
    if (!token || !password || password.length < 8) {
      throw new BadRequestException('Valid token and a password of at least 8 characters are required');
    }

    const user = await this.userModel
      .findOne({
        passwordResetTokenHash: this.hashToken(token),
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .select('+passwordResetTokenHash')
      .exec();
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();
    await this.audit('auth.password_reset.complete', user.email, user.id);
    return { success: true };
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    const user = await this.userModel
      .findOne({
        emailVerificationTokenHash: this.hashToken(token),
        emailVerificationExpiresAt: { $gt: new Date() },
      })
      .select('+emailVerificationTokenHash')
      .exec();
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    await this.audit('auth.email.verify', user.email, user.id);
    return { success: true };
  }

  async resendVerification(email: string) {
    const user = await this.userModel
      .findOne({ email: email?.trim().toLowerCase() })
      .select('+emailVerificationTokenHash')
      .exec();
    if (!user || user.emailVerified) {
      return { success: true };
    }
    const token = await this.issueEmailVerification(user);
    await this.mailService.sendVerificationEmail(user.email, user.name, token);
    await this.audit('auth.email.resend_verification', user.email, user.id);
    return { success: true, verificationToken: this.exposeTokenForEnvironment(token) };
  }

  private async issueEmailVerification(user: UserDocument) {
    if (!user.referralCode) {
      user.referralCode = await this.generateReferralCode(user.name, user.email);
    }
    const token = this.generateToken();
    user.emailVerificationTokenHash = this.hashToken(token);
    user.emailVerificationExpiresAt = new Date(Date.now() + this.emailTokenTtlMs());
    await user.save();
    return token;
  }

  private generateToken() {
    return randomBytes(32).toString('hex');
  }

  private async generateReferralCode(name: string, email: string) {
    const prefixSource = (name || email.split('@')[0] || 'FF').replace(/[^a-zA-Z0-9]/g, '');
    const prefix = (prefixSource.slice(0, 5).toUpperCase() || 'FFUND').padEnd(5, 'X');

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      const code = `${prefix}${suffix}`;
      const exists = await this.userModel.exists({ referralCode: code }).exec();
      if (!exists) return code;
    }

    return randomBytes(8).toString('hex').toUpperCase();
  }

  private async findReferrer(referralCode: string | undefined, newUserEmail: string) {
    const normalizedCode = referralCode?.trim().toUpperCase();
    if (!normalizedCode) return null;

    const referrer = await this.userModel.findOne({ referralCode: normalizedCode }).exec();
    if (!referrer) {
      throw new BadRequestException('Invalid referral code');
    }
    if (referrer.email === newUserEmail) {
      throw new BadRequestException('You cannot refer yourself');
    }
    if (!Types.ObjectId.isValid(referrer.id)) {
      throw new BadRequestException('Invalid referral code');
    }
    return referrer;
  }

  private normalizeInternationalPhoneNumber(phoneNumber: string) {
    const compact = phoneNumber.trim().replace(/[\s().-]/g, '');
    const normalized = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;

    if (!/^\+[1-9]\d{6,14}$/.test(normalized)) {
      throw new BadRequestException('Enter a valid phone number with country code');
    }

    return normalized;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private exposeTokenForEnvironment(token: string) {
    return this.configService.get<string>('NODE_ENV') === 'production' ? undefined : token;
  }

  private maxLoginAttempts() {
    return Number(this.configService.get<string>('AUTH_MAX_LOGIN_ATTEMPTS') ?? 5);
  }

  private lockoutMs() {
    return Number(this.configService.get<string>('AUTH_LOCKOUT_MS') ?? 15 * 60 * 1000);
  }

  private resetTokenTtlMs() {
    return Number(this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL_MS') ?? 30 * 60 * 1000);
  }

  private emailTokenTtlMs() {
    return Number(this.configService.get<string>('EMAIL_VERIFICATION_TOKEN_TTL_MS') ?? 24 * 60 * 60 * 1000);
  }

  private async audit(action: string, actorEmail: string, entityId: string, metadata: Record<string, unknown> = {}) {
    await this.auditLogModel.create({
      actorEmail,
      action,
      entityType: 'auth',
      entityId,
      metadata,
    });
  }
}
