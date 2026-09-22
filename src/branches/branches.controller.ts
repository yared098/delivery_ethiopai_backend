import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRoles } from '../common/decorators/staff-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StaffRole } from '@prisma/client';

@Controller('admin/branches')
@UseGuards(JwtAuthGuard, RolesGuard)
@StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
export class BranchesController {
  constructor(private branches: BranchesService) {}

  @Post()
  create(@Body() dto: CreateBranchDto, @CurrentUser() user: any) {
    return this.branches.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query('regionId') regionId?: string) {
    return this.branches.findAll(regionId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.branches.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: any,
  ) {
    return this.branches.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.branches.remove(id, user);
  }
}
