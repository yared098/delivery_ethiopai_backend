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
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/branches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.REGIONAL_ADMIN)
export class BranchesController {
  constructor(private branches: BranchesService) {}

  @Post()
  create(@Body() dto: CreateBranchDto) {
    return this.branches.create(dto);
  }

  @Get()
  findAll(@Query('regionId') regionId?: string) {
    return this.branches.findAll(regionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branches.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branches.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branches.remove(id);
  }
}
