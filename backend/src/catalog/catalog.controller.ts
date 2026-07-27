import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CatalogService } from './catalog.service';
import {
  CreateCategoryDto,
  CreatePrefixDto,
  UpdateCategoryDto,
  UpdatePrefixDto,
} from './dto/catalog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';

/**
 * Public reads power the loginless storefront (tabs, field labels, operator
 * detection). Writes are admin-only.
 */
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // --- public ---------------------------------------------------------------
  @Get('categories')
  categories() {
    return this.catalog.findActiveCategories();
  }

  @Get('prefixes')
  prefixes() {
    return this.catalog.findPrefixes();
  }

  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get('detect')
  async detect(@Query('phone') phone: string) {
    return { provider: await this.catalog.detectProvider(phone || '') };
  }

  // --- admin ----------------------------------------------------------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Get('admin/categories')
  allCategories() {
    return this.catalog.findAllCategories();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalog.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalog.updateCategory(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.catalog.removeCategory(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Post('prefixes')
  createPrefix(@Body() dto: CreatePrefixDto) {
    return this.catalog.createPrefix(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Patch('prefixes/:id')
  updatePrefix(@Param('id') id: string, @Body() dto: UpdatePrefixDto) {
    return this.catalog.updatePrefix(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Delete('prefixes/:id')
  removePrefix(@Param('id') id: string) {
    return this.catalog.removePrefix(id);
  }
}
