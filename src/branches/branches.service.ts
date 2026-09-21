import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBranchDto) {
    const region = await this.prisma.region.findUnique({
      where: { id: dto.regionId },
    });
    if (!region) throw new NotFoundException('Region not found');

    const existing = await this.prisma.branch.findFirst({
      where: { regionId: dto.regionId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Branch with this name already exists in the region');
    }

    return this.prisma.branch.create({
      data: {
        regionId: dto.regionId,
        name: dto.name,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
      },
    });
  }

  async findAll(regionId?: string) {
    return this.prisma.branch.findMany({
      where: regionId ? { regionId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        region: { select: { id: true, name: true, code: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        region: { select: { id: true, name: true, code: true } },
        _count: { select: { users: true } },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);

    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
      });
      if (!region) throw new NotFoundException('Region not found');
    }

    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const userCount = await this.prisma.user.count({ where: { branchId: id } });
    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete branch with ${userCount} assigned users`,
      );
    }

    await this.prisma.branch.delete({ where: { id } });
    return { message: 'Branch deleted' };
  }
}
