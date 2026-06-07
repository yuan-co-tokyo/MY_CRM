import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../auth/auth.types";
import type { CreateTaskDto, UpdateTaskDto, ListTaskQuery } from "./tasks.dto";

const TASK_INCLUDE = {
  customer: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, email: true } }
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: JwtPayload, query: ListTaskQuery) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const where: any = {
      tenantId: user.tenantId,
      deletedAt: null
    };

    if (query.scope === "mine") {
      where.assigneeId = user.sub;
    }

    if (query.due === "today") {
      where.dueDate = { gte: today, lt: tomorrow };
    } else if (query.due === "overdue") {
      where.dueDate = { lt: today };
      where.status = { not: "DONE" };
    }

    if (query.status && query.due !== "overdue") {
      where.status = query.status;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: { createdAt: "desc" }
    });

    return tasks.map((task) => this.toResponse(task));
  }

  async findOne(user: JwtPayload, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: TASK_INCLUDE
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    return this.toResponse(task);
  }

  async create(user: JwtPayload, dto: CreateTaskDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!customer) {
        throw new BadRequestException("Customer not found");
      }
    }

    const task = await this.prisma.task.create({
      data: {
        tenantId: user.tenantId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        priority: dto.priority ?? "MEDIUM",
        customerId: dto.customerId,
        assigneeId: dto.assigneeId ?? user.sub,
        createdBy: user.sub
      },
      include: TASK_INCLUDE
    });

    return this.toResponse(task);
  }

  async update(user: JwtPayload, id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    if (dto.customerId !== undefined) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true }
      });
      if (!customer) throw new NotFoundException("Customer not found");
    }

    if (dto.assigneeId !== undefined) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.assigneeId, tenantId: user.tenantId },
        select: { id: true }
      });
      if (!assignee) throw new NotFoundException("Assignee not found");
    }

    const completedAt =
      dto.status === "DONE"
        ? new Date()
        : dto.status !== undefined
          ? null
          : undefined;

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(completedAt !== undefined && { completedAt })
      },
      include: TASK_INCLUDE
    });

    return this.toResponse(updated);
  }

  async complete(user: JwtPayload, id: string, reopen = false) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: reopen
        ? { status: "OPEN", completedAt: null }
        : { status: "DONE", completedAt: new Date() },
      include: TASK_INCLUDE
    });

    return this.toResponse(updated);
  }

  async remove(user: JwtPayload, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() }
    });
  }

  private toResponse(task: any) {
    return {
      id: task.id,
      tenantId: task.tenantId,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      customer: task.customer,
      assignee: task.assignee,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }
}
