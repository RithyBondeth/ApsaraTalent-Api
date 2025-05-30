import { createParamDecorator, ExecutionContext, NotFoundException } from "@nestjs/common";
import { EUserRole } from "../database/enums/user-role.enum";

export type TUser = {
    firstname?: string;
    lastname?: string;
    username?: string;
    email?: string;
    password?: string;
    role: EUserRole;
    sub: string;
    iat: number;
    exp: number;
}

export const User = createParamDecorator((data: any, context: ExecutionContext): TUser => {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if(!user) throw new NotFoundException("There's no token found.");

    return user;
});