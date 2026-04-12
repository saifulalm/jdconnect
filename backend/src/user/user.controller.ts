import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/role.enum';
import { SelfOrRoles } from '../auth/decorators/self-or-roles.decorator';
import { SelfOrRolesGuard } from '../auth/guards/self-or-roles.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    const user = await this.userService.findById(req.user.id);
    if (!user) {
      return { status: 'error', message: 'User not found' };
    }
    const { password, ...safeUser } = user as any;
    return {
      status: 'success',
      data: safeUser,
    };
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  async generateApiKeys(@Req() req) {
    const user = await this.userService.generateApiCredentials(req.user.id);
    return {
      status: 'success',
      data: {
        apiKey: user.apiKey,
        apiSecret: user.apiSecret,
      },
    };
  }

  @Get('balance/history')
  @UseGuards(JwtAuthGuard)
  async getBalanceHistory(@Req() req) {
    const history = await this.userService.findBalanceHistoryByUserId(req.user.id);
    return { status: 'success', data: history };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERACCESS)
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, SelfOrRolesGuard)
  @SelfOrRoles(Role.ADMIN, Role.SUPERACCESS)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }
}
