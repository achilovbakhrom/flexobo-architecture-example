import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateCountryDto,
  CreateCurrencyDto,
  CreateTransportTypeDto,
  CreateLoadTypeDto,
  CreateLoadingTypeDto,
  CreateADRClassificationDto,
  CreatePermitDto,
  UpdateCountryDto,
  UpdateCurrencyDto,
  UpdateReferenceItemDto,
  UpdateADRClassificationDto,
  ReferenceDataListQueryDto,
} from '../dto/reference-data.dto';

@ApiTags('Reference Data')
@ApiBearerAuth()
@Controller('v1/reference-data')
export class ReferenceDataManagementController {
  constructor(
    @Inject('PrismaClient') private readonly prisma: any
  ) {}

  // ===== COUNTRIES =====

  @Get('countries')
  @ApiOperation({ summary: 'List all countries (admin)' })
  @ApiResponse({ status: 200, description: 'List of countries' })
  async listCountries(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.countryReadModel.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 50),
        take: query.limit ?? 50,
      }),
      this.prisma.countryReadModel.count({ where }),
    ]);

    return { data: items, total, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  @Post('countries')
  @ApiOperation({ summary: 'Create a country' })
  @ApiBody({ type: CreateCountryDto })
  @ApiResponse({ status: 201, description: 'Country created successfully' })
  async createCountry(@Body() dto: CreateCountryDto) {
    const country = await this.prisma.countryReadModel.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        currencyCode: dto.currency_code,
        phoneCode: dto.phone_code,
        isActive: dto.is_active ?? true,
      },
    });
    return { data: country };
  }

  @Put('countries/:id')
  @ApiOperation({ summary: 'Update a country' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiBody({ type: UpdateCountryDto })
  @ApiResponse({ status: 200, description: 'Country updated successfully' })
  async updateCountry(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code.toUpperCase();
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.currency_code !== undefined) data.currencyCode = dto.currency_code;
    if (dto.phone_code !== undefined) data.phoneCode = dto.phone_code;
    if (dto.is_active !== undefined) data.isActive = dto.is_active;

    const country = await this.prisma.countryReadModel.update({
      where: { id },
      data,
    });
    return { data: country };
  }

  @Delete('countries/:id')
  @ApiOperation({ summary: 'Delete a country' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  async deleteCountry(@Param('id') id: string) {
    await this.prisma.countryReadModel.delete({ where: { id } });
    return { success: true };
  }

  // ===== CURRENCIES =====

  @Get('currencies')
  @ApiOperation({ summary: 'List all currencies (admin)' })
  @ApiResponse({ status: 200, description: 'List of currencies' })
  async listCurrencies(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.currencyReadModel.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 50),
        take: query.limit ?? 50,
      }),
      this.prisma.currencyReadModel.count({ where }),
    ]);

    return { data: items, total, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  @Post('currencies')
  @ApiOperation({ summary: 'Create a currency' })
  @ApiBody({ type: CreateCurrencyDto })
  @ApiResponse({ status: 201, description: 'Currency created successfully' })
  async createCurrency(@Body() dto: CreateCurrencyDto) {
    const currency = await this.prisma.currencyReadModel.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        symbol: dto.symbol,
        rate: dto.rate ?? 1,
        isActive: dto.is_active ?? true,
      },
    });
    return { data: currency };
  }

  @Put('currencies/:id')
  @ApiOperation({ summary: 'Update a currency' })
  @ApiParam({ name: 'id', description: 'Currency ID' })
  @ApiBody({ type: UpdateCurrencyDto })
  @ApiResponse({ status: 200, description: 'Currency updated successfully' })
  async updateCurrency(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code.toUpperCase();
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.symbol !== undefined) data.symbol = dto.symbol;
    if (dto.rate !== undefined) data.rate = dto.rate;
    if (dto.is_active !== undefined) data.isActive = dto.is_active;

    const currency = await this.prisma.currencyReadModel.update({
      where: { id },
      data,
    });
    return { data: currency };
  }

  @Delete('currencies/:id')
  @ApiOperation({ summary: 'Delete a currency' })
  @ApiParam({ name: 'id', description: 'Currency ID' })
  async deleteCurrency(@Param('id') id: string) {
    await this.prisma.currencyReadModel.delete({ where: { id } });
    return { success: true };
  }

  // ===== TRANSPORT TYPES =====

  @Get('transport-types')
  @ApiOperation({ summary: 'List all transport types (admin)' })
  async listTransportTypes(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.transportTypeReadModel.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 50),
        take: query.limit ?? 50,
      }),
      this.prisma.transportTypeReadModel.count({ where }),
    ]);

    return { data: items, total, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  @Post('transport-types')
  @ApiOperation({ summary: 'Create a transport type' })
  @ApiBody({ type: CreateTransportTypeDto })
  @ApiResponse({ status: 201, description: 'Transport type created successfully' })
  async createTransportType(@Body() dto: CreateTransportTypeDto) {
    const item = await this.prisma.transportTypeReadModel.create({
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.is_active ?? true,
      },
    });
    return { data: item };
  }

  @Put('transport-types/:id')
  @ApiOperation({ summary: 'Update a transport type' })
  @ApiParam({ name: 'id', description: 'Transport type ID' })
  @ApiBody({ type: UpdateReferenceItemDto })
  @ApiResponse({ status: 200, description: 'Transport type updated successfully' })
  async updateTransportType(@Param('id') id: string, @Body() dto: UpdateReferenceItemDto) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.is_active !== undefined) data.isActive = dto.is_active;

    const item = await this.prisma.transportTypeReadModel.update({
      where: { id },
      data,
    });
    return { data: item };
  }

  @Delete('transport-types/:id')
  @ApiOperation({ summary: 'Delete a transport type' })
  @ApiParam({ name: 'id', description: 'Transport type ID' })
  async deleteTransportType(@Param('id') id: string) {
    await this.prisma.transportTypeReadModel.delete({ where: { id } });
    return { success: true };
  }

  // ===== LOAD TYPES =====

  @Get('load-types')
  @ApiOperation({ summary: 'List all load types (admin)' })
  async listLoadTypes(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.loadTypeReadModel.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 50),
        take: query.limit ?? 50,
      }),
      this.prisma.loadTypeReadModel.count({ where }),
    ]);

    return { data: items, total, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  @Post('load-types')
  @ApiOperation({ summary: 'Create a load type' })
  @ApiBody({ type: CreateLoadTypeDto })
  @ApiResponse({ status: 201, description: 'Load type created successfully' })
  async createLoadType(@Body() dto: CreateLoadTypeDto) {
    const item = await this.prisma.loadTypeReadModel.create({
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.is_active ?? true,
      },
    });
    return { data: item };
  }

  @Put('load-types/:id')
  @ApiOperation({ summary: 'Update a load type' })
  @ApiParam({ name: 'id', description: 'Load type ID' })
  @ApiBody({ type: UpdateReferenceItemDto })
  @ApiResponse({ status: 200, description: 'Load type updated successfully' })
  async updateLoadType(@Param('id') id: string, @Body() dto: UpdateReferenceItemDto) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.is_active !== undefined) data.isActive = dto.is_active;

    const item = await this.prisma.loadTypeReadModel.update({
      where: { id },
      data,
    });
    return { data: item };
  }

  @Delete('load-types/:id')
  @ApiOperation({ summary: 'Delete a load type' })
  @ApiParam({ name: 'id', description: 'Load type ID' })
  async deleteLoadType(@Param('id') id: string) {
    await this.prisma.loadTypeReadModel.delete({ where: { id } });
    return { success: true };
  }

  // ===== LOADING TYPES =====

  @Get('loading-types')
  @ApiOperation({ summary: 'List all loading types (admin)' })
  async listLoadingTypes(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.loadingTypeReadModel.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 50),
        take: query.limit ?? 50,
      }),
      this.prisma.loadingTypeReadModel.count({ where }),
    ]);

    return { data: items, total, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  @Post('loading-types')
  @ApiOperation({ summary: 'Create a loading type' })
  @ApiBody({ type: CreateLoadingTypeDto })
  @ApiResponse({ status: 201, description: 'Loading type created successfully' })
  async createLoadingType(@Body() dto: CreateLoadingTypeDto) {
    const item = await this.prisma.loadingTypeReadModel.create({
      data: {
        name: dto.name.toUpperCase(),
        description: dto.description,
        isActive: dto.is_active ?? true,
      },
    });
    return { data: item };
  }

  @Put('loading-types/:id')
  @ApiOperation({ summary: 'Update a loading type' })
  @ApiParam({ name: 'id', description: 'Loading type ID' })
  @ApiBody({ type: UpdateReferenceItemDto })
  @ApiResponse({ status: 200, description: 'Loading type updated successfully' })
  async updateLoadingType(@Param('id') id: string, @Body() dto: UpdateReferenceItemDto) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.toUpperCase();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.is_active !== undefined) data.isActive = dto.is_active;

    const item = await this.prisma.loadingTypeReadModel.update({
      where: { id },
      data,
    });
    return { data: item };
  }

  @Delete('loading-types/:id')
  @ApiOperation({ summary: 'Delete a loading type' })
  @ApiParam({ name: 'id', description: 'Loading type ID' })
  async deleteLoadingType(@Param('id') id: string) {
    await this.prisma.loadingTypeReadModel.delete({ where: { id } });
    return { success: true };
  }

  // ===== ADR CLASSIFICATIONS =====

  @Get('adr-classifications')
  @ApiOperation({ summary: 'List all ADR classifications (admin)' })
  async listADRClassifications(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.aDRClassificationReadModel.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 50),
        take: query.limit ?? 50,
      }),
      this.prisma.aDRClassificationReadModel.count({ where }),
    ]);

    return { data: items, total, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  @Post('adr-classifications')
  @ApiOperation({ summary: 'Create an ADR classification' })
  @ApiBody({ type: CreateADRClassificationDto })
  @ApiResponse({ status: 201, description: 'ADR classification created successfully' })
  async createADRClassification(@Body() dto: CreateADRClassificationDto) {
    const item = await this.prisma.aDRClassificationReadModel.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        isActive: dto.is_active ?? true,
      },
    });
    return { data: item };
  }

  @Put('adr-classifications/:id')
  @ApiOperation({ summary: 'Update an ADR classification' })
  @ApiParam({ name: 'id', description: 'ADR classification ID' })
  @ApiBody({ type: UpdateADRClassificationDto })
  @ApiResponse({ status: 200, description: 'ADR classification updated successfully' })
  async updateADRClassification(@Param('id') id: string, @Body() dto: UpdateADRClassificationDto) {
    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.is_active !== undefined) data.isActive = dto.is_active;

    const item = await this.prisma.aDRClassificationReadModel.update({
      where: { id },
      data,
    });
    return { data: item };
  }

  @Delete('adr-classifications/:id')
  @ApiOperation({ summary: 'Delete an ADR classification' })
  @ApiParam({ name: 'id', description: 'ADR classification ID' })
  async deleteADRClassification(@Param('id') id: string) {
    await this.prisma.aDRClassificationReadModel.delete({ where: { id } });
    return { success: true };
  }

  // ===== PERMITS =====

  @Get('permits')
  @ApiOperation({ summary: 'List all permits (admin)' })
  async listPermits(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.permitReadModel.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 50),
        take: query.limit ?? 50,
      }),
      this.prisma.permitReadModel.count({ where }),
    ]);

    return { data: items, total, page: query.page ?? 1, limit: query.limit ?? 50 };
  }

  @Post('permits')
  @ApiOperation({ summary: 'Create a permit' })
  @ApiBody({ type: CreatePermitDto })
  @ApiResponse({ status: 201, description: 'Permit created successfully' })
  async createPermit(@Body() dto: CreatePermitDto) {
    const item = await this.prisma.permitReadModel.create({
      data: {
        name: dto.name.toUpperCase(),
        description: dto.description,
        isActive: dto.is_active ?? true,
      },
    });
    return { data: item };
  }

  @Put('permits/:id')
  @ApiOperation({ summary: 'Update a permit' })
  @ApiParam({ name: 'id', description: 'Permit ID' })
  @ApiBody({ type: UpdateReferenceItemDto })
  @ApiResponse({ status: 200, description: 'Permit updated successfully' })
  async updatePermit(@Param('id') id: string, @Body() dto: UpdateReferenceItemDto) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.toUpperCase();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.is_active !== undefined) data.isActive = dto.is_active;

    const item = await this.prisma.permitReadModel.update({
      where: { id },
      data,
    });
    return { data: item };
  }

  @Delete('permits/:id')
  @ApiOperation({ summary: 'Delete a permit' })
  @ApiParam({ name: 'id', description: 'Permit ID' })
  async deletePermit(@Param('id') id: string) {
    await this.prisma.permitReadModel.delete({ where: { id } });
    return { success: true };
  }
}
