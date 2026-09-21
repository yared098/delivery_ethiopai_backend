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
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/regions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class RegionsController {
  constructor(private regions: RegionsService) {}

  @Post()
  create(@Body() dto: CreateRegionDto) {
    return this.regions.create(dto);
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
