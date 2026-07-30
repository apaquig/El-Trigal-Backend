import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdminListQueryDto } from '../common/dto/shared.dto';
import { paginate } from '../common/utils/pagination';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

interface AuditInput {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>) {}

  async record(input: AuditInput): Promise<void> {
    await this.auditModel.create({
      userId: input.userId ? new Types.ObjectId(input.userId) : null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? {},
    });
  }

  async list(query: AdminListQueryDto) {
    const [items, totalItems] = await Promise.all([
      this.auditModel
        .find()
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<AuditLog[]>()
        .exec(),
      this.auditModel.countDocuments().exec(),
    ]);

    return paginate(items, query.page, query.limit, totalItems);
  }
}
