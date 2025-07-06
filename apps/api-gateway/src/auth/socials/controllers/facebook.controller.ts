import { IFacebookAuthController } from "@app/common/interfaces/auth-controller.interface";
import { Controller, Get, HttpCode, HttpStatus, Req, Res, UseGuards } from "@nestjs/common";
import { FacebookAuthGuard } from "../guards/facebook-auth.guard";
import { Response } from "express";

@Controller('social')
export class FacebookController implements IFacebookAuthController {
    @Get('facebook/login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(FacebookAuthGuard)
    async facebookAuth() {}  

    @Get('facebook/callback')
    @HttpCode(HttpStatus.OK)
    @UseGuards(FacebookAuthGuard)
    async facebookCallback(@Req() req: any, @Res() res: Response) {
       
    }

}