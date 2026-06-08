export class ApiKeyResponseDto {
  id!: string;
  name!: string;
  keyPrefix!: string;
  createdBy!: string;
  lastUsedAt!: Date | null;
  expiresAt!: Date | null;
  revokedAt!: Date | null;
  createdAt!: Date;
  isActive!: boolean;
}
