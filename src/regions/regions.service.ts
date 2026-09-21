import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRegionDto) {
    const existing = await this.prisma.region.findFirst({
      where: {
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Region with ${existing.name === dto.name ? 'name' : 'code'} already exists`,
      );
    }

    return this.prisma.region.create({
      data: { name: dto.name, code: dto.code },
    });
  }

  async findAll() {
    return this.prisma.region.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true, branches: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      include: {
        branches: { orderBy: { name: 'asc' } },
        _count: { select: { users: true } },
      },
    });

    if (!region) throw new NotFoundException('Region not found');
    return region;
  }

  async update(id: string, dto: UpdateRegionDto) {
    await this.findOne(id);

    if (dto.name || dto.code) {
      const conflict = await this.prisma.region.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                dto.name ? { name: dto.name } : {},
                dto.code ? { code: dto.code } : {},
              ].filter((x) => Object.keys(x).length > 0),
            },
          ],
        },
      });
      if (conflict) throw new ConflictException('Name or code already in use');
    }

    return this.prisma.region.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const userCount = await this.prisma.user.count({ where: { regionId: id } });
    const branchCount = await this.prisma.branch.count({ where: { regionId: id } });

    if (userCount > 0 || branchCount > 0) {
      throw new BadRequestException(
        `Cannot delete region with ${userCount} users and ${branchCount} branches`,
      );
    }

    await this.prisma.region.delete({ where: { id } });
    return { message: 'Region deleted' };
  }
}
