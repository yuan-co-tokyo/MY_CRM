import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthenticatedRequest } from "./auth.types";

const loginSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/login")
  async login(@Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>) {
    return this.authService.login(body);
  }

  @Post("/refresh")
  async refresh(@Body(new ZodValidationPipe(refreshSchema)) body: z.infer<typeof refreshSchema>) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post("/logout")
  async logout(@Body(new ZodValidationPipe(refreshSchema)) body: z.infer<typeof refreshSchema>) {
    await this.authService.logout(body.refreshToken);
    return { status: "ok" };
  }

  @UseGuards(JwtAuthGuard)
  @Get("/me")
  async me(@Req() req: AuthenticatedRequest) {
    return this.authService.getMe(req.user);
  }
}
