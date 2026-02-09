import { Request } from "express";

export type LoginInput = {
  tenantId: string;
  email: string;
  password: string;
};

export type JwtPayload = {
  sub: string;
  tenantId: string;
  email: string;
  userType: string;
  iat?: number;
  exp?: number;
};

export type AuthenticatedRequest = Request & { user: JwtPayload };
