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
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { EventsService } from "./events.service";
import { CreateEventSchema, UpdateEventSchema } from "./events.dto";
import { z } from "zod";

const listQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  customerId: z.string().optional(),
  scope: z.string().optional(),
  ownerId: z.string().optional()
});

@Controller("events")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @RequirePermissions("event.read")
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>
  ) {
    return this.eventsService.findAll(req.user, query);
  }

  @Post()
  @RequirePermissions("event.create")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateEventSchema)) body: z.infer<typeof CreateEventSchema>
  ) {
    return this.eventsService.create(req.user, body);
  }

  @Get(":id")
  @RequirePermissions("event.read")
  async findOne(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.eventsService.findOne(req.user, id);
  }

  @Patch(":id")
  @RequirePermissions("event.update")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateEventSchema)) body: z.infer<typeof UpdateEventSchema>
  ) {
    return this.eventsService.update(req.user, id, body);
  }

  @Delete(":id")
  @RequirePermissions("event.delete")
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    await this.eventsService.remove(req.user, id);
    return { status: "ok" };
  }
}
