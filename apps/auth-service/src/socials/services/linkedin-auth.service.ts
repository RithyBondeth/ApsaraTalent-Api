import { IPayload } from "@app/common/jwt/interfaces/payload.interface";
import { JwtService } from "@app/common/jwt/jwt.service";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LinkedInAuthDTO } from "../dtos/linkedin-auth.dto";
import { Repository } from "typeorm";
import { User } from "@app/common/database/entities/user.entity";

@Injectable()
export class LinkedInAuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async linkedInLogin(linkedInData: LinkedInAuthDTO) {
    try {
      let user = await this.users.findOne({ where: { email: linkedInData.email } });
  
      if (!user) {
        return {
          message: 'Successfully logged in with LinkedIn',
          newUser: true,
          email: linkedInData.email,
          firstName: linkedInData.firstName,
          lastName: linkedInData.lastName,
          picture: linkedInData.picture,
          accessToken: null,
          refreshToken: null,
          provider: 'linkedin',
        };
      }
  
      const payload: IPayload = { id: user.id, info: user.email, role: user.role };
      const [accessToken, refreshToken] = await Promise.all([
        this.jwt.generateToken(payload),
        this.jwt.generateRefreshToken(user.id),
      ]);
  
      return {
        message: 'Successfully logged in with LinkedIn',
        newUser: false,
        accessToken,
        refreshToken,
      };
    } catch (err) {
      console.error('LinkedIn login error:', err);
      throw new Error('Failed to login with LinkedIn');
    }
  }
}