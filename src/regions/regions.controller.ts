import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RegionsService } from './regions.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRoles } from '../common/decorators/staff-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StaffRole } from '@prisma/client';

@Controller('admin/regions')
@UseGuards(JwtAuthGuard, RolesGuard)
@StaffRoles(StaffRole.SUPER_ADMIN)
export class RegionsController {
  constructor(private regions: RegionsService) {}

  @Post()
  create(@Body() dto: CreateRegionDto, @CurrentUser() user: any) {
    return this.regions.create(dto, user);
  }

  @Get()
  findAll() {
    return this.regions.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.regions.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regions.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.regions.remove(id);
  }
}
