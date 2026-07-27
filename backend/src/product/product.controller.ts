import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // Public catalog browsing (loginless storefront). Write routes stay guarded.
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll(@Query('category') category?: string, @Query('provider') provider?: string) {
    if (category) return this.productService.findByCategory(category);
    if (provider) return this.productService.findByProvider(provider);
    return this.productService.findAll();
  }

  /** Distinct providers — used by admin filters. Declared before ':id'. */
  @Get('providers')
  providers() {
    return this.productService.findProviders();
  }

  /** Paginated admin listing (includes inactive products). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  @Get('admin/list')
  adminList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('provider') provider?: string,
  ) {
    return this.productService.findPaginated({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      category,
      provider,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
