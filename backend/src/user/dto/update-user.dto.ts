import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Role } from '../../auth/roles/role.enum';

/**
 * Self-service profile update.
 *
 * SECURITY: `role` and `isActive` are deliberately NOT accepted here. This
 * endpoint is reachable by the account owner (SelfOrRolesGuard), so allowing
 * `role` would let any customer promote themselves to admin. Privileged
 * fields are changed through AdminUpdateUserDto on an admin-only route.
 */
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9+\-\s()]{6,20}$/, { message: 'phone is not a valid number' })
  phone?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  /** Comma separated IPs allowed to call the H2H API. */
  @IsString()
  @IsOptional()
  ipWhitelist?: string;
}

/** Privileged fields — admin/superaccess only. */
export class AdminUpdateUserDto {
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
