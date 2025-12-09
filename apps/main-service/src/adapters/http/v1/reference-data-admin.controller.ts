import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
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
import { ResponseDTO } from '@flexobo/shared-kernel';
import {
  CreateCountryDto,
  CreateCurrencyDto,
  CreateTransportTypeDto,
  CreateLoadTypeDto,
  CreateLoadingTypeDto,
  CreateADRClassificationDto,
  CreatePermitDto,
  CreateCompanyTypeDto,
  UpdateCountryDto,
  UpdateCurrencyDto,
  UpdateReferenceItemDto,
  UpdateADRClassificationDto,
  UpdateCompanyTypeDto,
  ReferenceDataListQueryDto,
  ResponseCountryDto,
  ResponseCurrencyDto,
  ResponseTransportTypeDto,
  ResponseLoadTypeDto,
  ResponseLoadingTypeDto,
  ResponseADRClassificationDto,
  ResponsePermitDto,
  ResponseCompanyTypeDto,
} from '../dto/reference-data.dto';

@ApiTags('Reference Data')
@ApiBearerAuth()
@Controller('v1/admin/reference-data')
export class ReferenceDataAdminController {
  constructor(@Inject('PrismaClient') private readonly prisma: any) {}

  // ===== COUNTRIES =====

  @Get('countries')
  @ResponseDTO(ResponseCountryDto, { isArray: true })
  @ApiOperation({ summary: 'List all countries (admin)' })
  @ApiResponse({ status: 200, description: 'List of countries' })
  async listCountries(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        {
          translations: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.countryReadModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { translations: true },
      }),
      this.prisma.countryReadModel.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
    };
  }

  @Get('countries/:id')
  @ResponseDTO(ResponseCountryDto)
  @ApiOperation({ summary: 'Get country by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  async getCountryById(@Param('id') id: string) {
    const item = await this.prisma.countryReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!item) {
      throw new NotFoundException('Country not found');
    }

    return { data: item };
  }

  @Post('countries')
  @ResponseDTO(ResponseCountryDto)
  @ApiOperation({ summary: 'Create a country' })
  @ApiBody({ type: CreateCountryDto })
  @ApiResponse({ status: 201, description: 'Country created successfully' })
  async createCountry(@Body() dto: CreateCountryDto) {
    const country = await this.prisma.countryReadModel.create({
      data: {
        code: dto.code.toUpperCase(),
        currencyCode: dto.currency_code,
        phoneCode: dto.phone_code,
        isActive: dto.is_active ?? true,
        translations: dto.translations
          ? {
              create: dto.translations.map((t) => ({
                languageCode: t.language_code,
                name: t.name,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    return { data: country };
  }

  @Put('countries/:id')
  @ResponseDTO(ResponseCountryDto)
  @ApiOperation({ summary: 'Update a country' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiBody({ type: UpdateCountryDto })
  @ApiResponse({ status: 200, description: 'Country updated successfully' })
  async updateCountry(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    const data: Record<string, unknown> = {};

    if (dto.code !== undefined) {
      data.code = dto.code.toUpperCase();
    }
    if (dto.currency_code !== undefined) {
      data.currencyCode = dto.currency_code;
    }
    if (dto.phone_code !== undefined) {
      data.phoneCode = dto.phone_code;
    }
    if (dto.is_active !== undefined) {
      data.isActive = dto.is_active;
    }

    if (dto.translations !== undefined) {
      await this.prisma.countryTranslationReadModel.deleteMany({
        where: { countryId: id },
      });
      data.translations = {
        create: dto.translations.map((t) => ({
          languageCode: t.language_code,
          name: t.name,
        })),
      };
    }

    const country = await this.prisma.countryReadModel.update({
      where: { id },
      data,
      include: { translations: true },
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
  @ResponseDTO(ResponseCurrencyDto, { isArray: true })
  @ApiOperation({ summary: 'List all currencies (admin)' })
  @ApiResponse({ status: 200, description: 'List of currencies' })
  async listCurrencies(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        {
          translations: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.currencyReadModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { translations: true },
      }),
      this.prisma.currencyReadModel.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
    };
  }

  @Get('currencies/:id')
  @ResponseDTO(ResponseCurrencyDto)
  @ApiOperation({ summary: 'Get currency by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Currency ID' })
  async getCurrencyById(@Param('id') id: string) {
    const item = await this.prisma.currencyReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!item) {
      throw new NotFoundException('Currency not found');
    }

    return { data: item };
  }

  @Post('currencies')
  @ResponseDTO(ResponseCurrencyDto)
  @ApiOperation({ summary: 'Create a currency' })
  @ApiBody({ type: CreateCurrencyDto })
  @ApiResponse({ status: 201, description: 'Currency created successfully' })
  async createCurrency(@Body() dto: CreateCurrencyDto) {
    const currency = await this.prisma.currencyReadModel.create({
      data: {
        code: dto.code.toUpperCase(),
        symbol: dto.symbol,
        rate: dto.rate ?? 1,
        isActive: dto.is_active ?? true,
        translations: dto.translations
          ? {
              create: dto.translations.map((t) => ({
                languageCode: t.language_code,
                name: t.name,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    return { data: currency };
  }

  @Put('currencies/:id')
  @ResponseDTO(ResponseCurrencyDto)
  @ApiOperation({ summary: 'Update a currency' })
  @ApiParam({ name: 'id', description: 'Currency ID' })
  async updateCurrency(
    @Param('id') id: string,
    @Body() dto: UpdateCurrencyDto
  ) {
    const data: Record<string, unknown> = {};

    if (dto.code !== undefined) {
      data.code = dto.code.toUpperCase();
    }
    if (dto.symbol !== undefined) {
      data.symbol = dto.symbol;
    }
    if (dto.rate !== undefined) {
      data.rate = dto.rate;
    }
    if (dto.is_active !== undefined) {
      data.isActive = dto.is_active;
    }

    if (dto.translations !== undefined) {
      await this.prisma.currencyTranslationReadModel.deleteMany({
        where: { currencyId: id },
      });
      data.translations = {
        create: dto.translations.map((t) => ({
          languageCode: t.language_code,
          name: t.name,
        })),
      };
    }

    const currency = await this.prisma.currencyReadModel.update({
      where: { id },
      data,
      include: { translations: true },
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
  @ResponseDTO(ResponseTransportTypeDto, { isArray: true })
  @ApiOperation({ summary: 'List all transport types (admin)' })
  async listTransportTypes(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }

    if (query.search) {
      where.OR = [
        {
          translations: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.transportTypeReadModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { translations: true },
      }),
      this.prisma.transportTypeReadModel.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
    };
  }

  @Get('transport-types/:id')
  @ResponseDTO(ResponseTransportTypeDto)
  @ApiOperation({ summary: 'Get transport type by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Transport type ID' })
  async getTransportTypeById(@Param('id') id: string) {
    const item = await this.prisma.transportTypeReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!item) {
      throw new NotFoundException('Transport type not found');
    }

    return { data: item };
  }

  @Post('transport-types')
  @ResponseDTO(ResponseTransportTypeDto)
  @ApiOperation({ summary: 'Create a transport type' })
  @ApiBody({ type: CreateTransportTypeDto })
  @ApiResponse({
    status: 201,
    description: 'Transport type created successfully',
  })
  async createTransportType(@Body() dto: CreateTransportTypeDto) {
    const item = await this.prisma.transportTypeReadModel.create({
      data: {
        isActive: dto.is_active ?? true,
        translations: dto.translations
          ? {
              create: dto.translations.map((t) => ({
                languageCode: t.language_code,
                name: t.name,
                description: t.description,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    return { data: item };
  }

  @Put('transport-types/:id')
  @ResponseDTO(ResponseTransportTypeDto)
  @ApiOperation({ summary: 'Update a transport type' })
  @ApiParam({ name: 'id', description: 'Transport type ID' })
  async updateTransportType(
    @Param('id') id: string,
    @Body() dto: UpdateReferenceItemDto
  ) {
    const data: Record<string, unknown> = {};

    if (dto.is_active !== undefined) {
      data.isActive = dto.is_active;
    }

    if (dto.translations !== undefined) {
      await this.prisma.transportTypeTranslationReadModel.deleteMany({
        where: { transportTypeId: id },
      });
      data.translations = {
        create: dto.translations.map((t) => ({
          languageCode: t.language_code,
          name: t.name,
          description: t.description,
        })),
      };
    }

    const item = await this.prisma.transportTypeReadModel.update({
      where: { id },
      data,
      include: { translations: true },
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
  @ResponseDTO(ResponseLoadTypeDto, { isArray: true })
  @ApiOperation({ summary: 'List all load types (admin)' })
  async listLoadTypes(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }

    if (query.search) {
      where.OR = [
        {
          translations: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.loadTypeReadModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { translations: true },
      }),
      this.prisma.loadTypeReadModel.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
    };
  }

  @Get('load-types/:id')
  @ResponseDTO(ResponseLoadTypeDto)
  @ApiOperation({ summary: 'Get load type by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Load type ID' })
  async getLoadTypeById(@Param('id') id: string) {
    const item = await this.prisma.loadTypeReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!item) {
      throw new NotFoundException('Load type not found');
    }

    return { data: item };
  }

  @Post('load-types')
  @ResponseDTO(ResponseLoadTypeDto)
  @ApiOperation({ summary: 'Create a load type' })
  @ApiBody({ type: CreateLoadTypeDto })
  @ApiResponse({ status: 201, description: 'Load type created successfully' })
  async createLoadType(@Body() dto: CreateLoadTypeDto) {
    const item = await this.prisma.loadTypeReadModel.create({
      data: {
        isActive: dto.is_active ?? true,
        translations: dto.translations
          ? {
              create: dto.translations.map((t) => ({
                languageCode: t.language_code,
                name: t.name,
                description: t.description,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    return { data: item };
  }

  @Put('load-types/:id')
  @ResponseDTO(ResponseLoadTypeDto)
  @ApiOperation({ summary: 'Update a load type' })
  @ApiParam({ name: 'id', description: 'Load type ID' })
  async updateLoadType(
    @Param('id') id: string,
    @Body() dto: UpdateReferenceItemDto
  ) {
    const data: Record<string, unknown> = {};

    if (dto.is_active !== undefined) {
      data.isActive = dto.is_active;
    }

    if (dto.translations !== undefined) {
      await this.prisma.loadTypeTranslationReadModel.deleteMany({
        where: { loadTypeId: id },
      });
      data.translations = {
        create: dto.translations.map((t) => ({
          languageCode: t.language_code,
          name: t.name,
          description: t.description,
        })),
      };
    }

    const item = await this.prisma.loadTypeReadModel.update({
      where: { id },
      data,
      include: { translations: true },
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
  @ResponseDTO(ResponseLoadingTypeDto, { isArray: true })
  @ApiOperation({ summary: 'List all loading types (admin)' })
  async listLoadingTypes(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }

    if (query.search) {
      where.OR = [
        {
          translations: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.loadingTypeReadModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { translations: true },
      }),
      this.prisma.loadingTypeReadModel.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
    };
  }

  @Get('loading-types/:id')
  @ResponseDTO(ResponseLoadingTypeDto)
  @ApiOperation({ summary: 'Get loading type by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Loading type ID' })
  async getLoadingTypeById(@Param('id') id: string) {
    const item = await this.prisma.loadingTypeReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!item) {
      throw new NotFoundException('Loading type not found');
    }

    return { data: item };
  }

  @Post('loading-types')
  @ResponseDTO(ResponseLoadingTypeDto)
  @ApiOperation({ summary: 'Create a loading type' })
  @ApiBody({ type: CreateLoadingTypeDto })
  @ApiResponse({
    status: 201,
    description: 'Loading type created successfully',
  })
  async createLoadingType(@Body() dto: CreateLoadingTypeDto) {
    const item = await this.prisma.loadingTypeReadModel.create({
      data: {
        isActive: dto.is_active ?? true,
        translations: dto.translations
          ? {
              create: dto.translations.map((t) => ({
                languageCode: t.language_code,
                name: t.name,
                description: t.description,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    return { data: item };
  }

  @Put('loading-types/:id')
  @ResponseDTO(ResponseLoadingTypeDto)
  @ApiOperation({ summary: 'Update a loading type' })
  @ApiParam({ name: 'id', description: 'Loading type ID' })
  async updateLoadingType(
    @Param('id') id: string,
    @Body() dto: UpdateReferenceItemDto
  ) {
    const data: Record<string, unknown> = {};

    if (dto.is_active !== undefined) {
      data.isActive = dto.is_active;
    }

    if (dto.translations !== undefined) {
      await this.prisma.loadingTypeTranslationReadModel.deleteMany({
        where: { loadingTypeId: id },
      });
      data.translations = {
        create: dto.translations.map((t) => ({
          languageCode: t.language_code,
          name: t.name,
          description: t.description,
        })),
      };
    }

    const item = await this.prisma.loadingTypeReadModel.update({
      where: { id },
      data,
      include: { translations: true },
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
  @ResponseDTO(ResponseADRClassificationDto, { isArray: true })
  @ApiOperation({ summary: 'List all ADR classifications (admin)' })
  async listADRClassifications(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }

    if (query.search) {
      where.OR = [
        {
          translations: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.aDRClassificationReadModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { translations: true },
      }),
      this.prisma.aDRClassificationReadModel.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
    };
  }

  @Get('adr-classifications/:id')
  @ResponseDTO(ResponseADRClassificationDto)
  @ApiOperation({ summary: 'Get ADR classification by ID (admin)' })
  @ApiParam({ name: 'id', description: 'ADR classification ID' })
  async getADRClassificationById(@Param('id') id: string) {
    const item = await this.prisma.aDRClassificationReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!item) {
      throw new NotFoundException('ADR classification not found');
    }

    return { data: item };
  }

  @Post('adr-classifications')
  @ResponseDTO(ResponseADRClassificationDto)
  @ApiOperation({ summary: 'Create an ADR classification' })
  @ApiBody({ type: CreateADRClassificationDto })
  @ApiResponse({
    status: 201,
    description: 'ADR classification created successfully',
  })
  async createADRClassification(@Body() dto: CreateADRClassificationDto) {
    const item = await this.prisma.aDRClassificationReadModel.create({
      data: {
        isActive: dto.is_active ?? true,
        translations: dto.translations
          ? {
              create: dto.translations.map((t) => ({
                languageCode: t.language_code,
                name: t.name,
                description: t.description,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    return { data: item };
  }

  @Put('adr-classifications/:id')
  @ResponseDTO(ResponseADRClassificationDto)
  @ApiOperation({ summary: 'Update an ADR classification' })
  @ApiParam({ name: 'id', description: 'ADR classification ID' })
  async updateADRClassification(
    @Param('id') id: string,
    @Body() dto: UpdateADRClassificationDto
  ) {
    const data: Record<string, unknown> = {};

    if (dto.is_active !== undefined) {
      data.isActive = dto.is_active;
    }

    if (dto.translations !== undefined) {
      await this.prisma.aDRClassificationTranslationReadModel.deleteMany({
        where: { adrClassificationId: id },
      });
      data.translations = {
        create: dto.translations.map((t) => ({
          languageCode: t.language_code,
          name: t.name,
          description: t.description,
        })),
      };
    }

    const item = await this.prisma.aDRClassificationReadModel.update({
      where: { id },
      data,
      include: { translations: true },
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
  @ResponseDTO(ResponsePermitDto, { isArray: true })
  @ApiOperation({ summary: 'List all permits (admin)' })
  async listPermits(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }

    if (query.search) {
      where.OR = [
        {
          translations: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.permitReadModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { translations: true },
      }),
      this.prisma.permitReadModel.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
    };
  }

  @Get('permits/:id')
  @ResponseDTO(ResponsePermitDto)
  @ApiOperation({ summary: 'Get permit by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Permit ID' })
  async getPermitById(@Param('id') id: string) {
    const item = await this.prisma.permitReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!item) {
      throw new NotFoundException('Permit not found');
    }

    return { data: item };
  }

  @Post('permits')
  @ResponseDTO(ResponsePermitDto)
  @ApiOperation({ summary: 'Create a permit' })
  @ApiBody({ type: CreatePermitDto })
  @ApiResponse({ status: 201, description: 'Permit created successfully' })
  async createPermit(@Body() dto: CreatePermitDto) {
    const item = await this.prisma.permitReadModel.create({
      data: {
        isActive: dto.is_active ?? true,
        translations: dto.translations
          ? {
              create: dto.translations.map((t) => ({
                languageCode: t.language_code,
                name: t.name,
                description: t.description,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    return { data: item };
  }

  @Put('permits/:id')
  @ResponseDTO(ResponsePermitDto)
  @ApiOperation({ summary: 'Update a permit' })
  @ApiParam({ name: 'id', description: 'Permit ID' })
  async updatePermit(
    @Param('id') id: string,
    @Body() dto: UpdateReferenceItemDto
  ) {
    const data: Record<string, unknown> = {};

    if (dto.is_active !== undefined) {
      data.isActive = dto.is_active;
    }

    if (dto.translations !== undefined) {
      await this.prisma.permitTranslationReadModel.deleteMany({
        where: { permitId: id },
      });
      data.translations = {
        create: dto.translations.map((t) => ({
          languageCode: t.language_code,
          name: t.name,
          description: t.description,
        })),
      };
    }

    const item = await this.prisma.permitReadModel.update({
      where: { id },
      data,
      include: { translations: true },
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

  // ===== COMPANY TYPES =====

  @Get('company-types')
  @ResponseDTO(ResponseCompanyTypeDto, { isArray: true })
  @ApiOperation({ summary: 'List all company types (admin)' })
  async listCompanyTypes(@Query() query: ReferenceDataListQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }

    if (query.search) {
      where.OR = [
        {
          translations: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.companyTypeReadModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { translations: true },
      }),
      this.prisma.companyTypeReadModel.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
    };
  }

  @Get('company-types/:id')
  @ResponseDTO(ResponseCompanyTypeDto)
  @ApiOperation({ summary: 'Get company type by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Company type ID' })
  async getCompanyTypeById(@Param('id') id: string) {
    const item = await this.prisma.companyTypeReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!item) {
      throw new NotFoundException('Company type not found');
    }

    return { data: item };
  }

  @Post('company-types')
  @ResponseDTO(ResponseCompanyTypeDto)
  @ApiOperation({ summary: 'Create a company type' })
  async createCompanyType(@Body() dto: CreateCompanyTypeDto) {
    const item = await this.prisma.companyTypeReadModel.create({
      data: {
        isActive: dto.is_active ?? true,
        translations: dto.translations
          ? {
              create: dto.translations.map((t) => ({
                languageCode: t.language_code,
                name: t.name,
                description: t.description,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    return { data: item };
  }

  @Put('company-types/:id')
  @ResponseDTO(ResponseCompanyTypeDto)
  @ApiOperation({ summary: 'Update a company type' })
  @ApiParam({ name: 'id', description: 'Company type ID' })
  async updateCompanyType(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyTypeDto
  ) {
    const data: Record<string, unknown> = {};

    if (dto.is_active !== undefined) {
      data.isActive = dto.is_active;
    }

    if (dto.translations !== undefined) {
      await this.prisma.companyTypeTranslationReadModel.deleteMany({
        where: { companyTypeId: id },
      });
      data.translations = {
        create: dto.translations.map((t) => ({
          languageCode: t.language_code,
          name: t.name,
          description: t.description,
        })),
      };
    }

    const item = await this.prisma.companyTypeReadModel.update({
      where: { id },
      data,
      include: { translations: true },
    });

    return { data: item };
  }

  @Delete('company-types/:id')
  @ApiOperation({ summary: 'Delete a company type' })
  @ApiParam({ name: 'id', description: 'Company type ID' })
  async deleteCompanyType(@Param('id') id: string) {
    await this.prisma.companyTypeReadModel.delete({ where: { id } });
    return { success: true };
  }
}
