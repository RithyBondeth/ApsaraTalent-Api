import {
    createParamDecorator,
    ExecutionContext,
    NotFoundException
} from '@nestjs/common';
import { EUserRole } from '../database/enums/user-role.enum';

export interface AuthUser {
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  password?: string;
  role: EUserRole;
  id: string;
  iat: number;
  exp: number;
}

export const User = createParamDecorator(
  (data: any, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new NotFoundException("There's no token found.");

    return user;
  },
);
