import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../investor/schemas/user.schema';

export interface JwtPayload {
  sub: string;   // userId
  email: string;
  name: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'futurefund-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userModel.findById(payload.sub).lean().exec();
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('This account is not active');
    }

    return {
      userId: payload.sub,
      email: user.email,
      name: user.name,
      roles: user.roles?.length ? user.roles : ['investor'],
    };
  }
}
