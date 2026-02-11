import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { InteractionsService } from "./interactions.service";

const createInteractionSchema = z.object({
  customerId: z.string().min(1),
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE"]),
  note: z.string().min(1),
  occurredAt: z.string().datetime()
});

const updateInteractionSchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE"]).optional(),
  note: z.string().min(1).optional(),
  occurredAt: z.string().datetime().optional()
});

const listQuerySchema = z.object({
  customerId: z.string().optional(),
  userId: z.string().optional(),
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE"]).optional()
});

@Controller("interactions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Get()
  @RequirePermissions("interaction.read")
  async list(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>
  ) {
    return this.interactionsService.list(req.user, query);
  }

  @Post()
  @RequirePermissions("interaction.create")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createInteractionSchema)) body: z.infer<typeof createInteractionSchema>
  ) {
    return this.interactionsService.create(req.user, body);
  }

  @Get(":id")
  @RequirePermissions("interaction.read")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.interactionsService.get(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("interaction.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateInteractionSchema)) body: z.infer<typeof updateInteractionSchema>
  ) {
    return this.interactionsService.update(req.user, id, body);
  }

  @Delete(":id")
  @RequirePermissions("interaction.delete")
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    await this.interactionsService.remove(req.user, id);
    return { status: "ok" };
  }
}
