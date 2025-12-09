import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ResponseDTO } from '@flexobo/shared-kernel';
import {
  IReferenceDataRepository,
  REFERENCE_DATA_REPOSITORY,
} from '../../../ports/reference-data.repository';
import {
  ResponseCountryDto,
  ResponseLanguageDto,
  ResponseCurrencyDto,
  ResponseLoadTypeDto,
  ResponseTransportTypeDto,
  ResponseLoadingTypeDto,
  ResponseCompanyTypeDto,
  ResponseADRClassificationDto,
  ResponsePermitDto,
} from '../dto/reference-data.dto';

@ApiTags('Reference Data')
@Controller('v1')
export class ReferenceDataController {
  constructor(
    @Inject(REFERENCE_DATA_REPOSITORY)
    private readonly referenceDataRepo: IReferenceDataRepository
  ) {}

  // Countries
  @Get('countries')
  @ResponseDTO(ResponseCountryDto, { isArray: true })
  @ApiOperation({ summary: 'Get all countries' })
  @ApiResponse({ status: 200, description: 'List of countries' })
  async getCountries() {
    return this.referenceDataRepo.findAllCountries();
  }

  @Get('countries/by-code/:code')
  @ResponseDTO(ResponseCountryDto)
  @ApiOperation({ summary: 'Get country by code' })
  @ApiParam({ name: 'code', description: 'ISO 3166-1 alpha-2 country code (e.g., UZ, RU)' })
  @ApiResponse({ status: 200, description: 'Country details' })
  async getCountryByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findCountryByCode(code.toUpperCase());
  }

  @Get('countries/:id')
  @ResponseDTO(ResponseCountryDto)
  @ApiOperation({ summary: 'Get country by ID' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  async getCountryById(@Param('id') id: string) {
    const item = await this.referenceDataRepo.findCountryById(id);

    if (!item) {
      throw new NotFoundException('Country not found');
    }

    return item;
  }

  // Languages
  @Get('languages')
  @ResponseDTO(ResponseLanguageDto, { isArray: true })
  @ApiOperation({ summary: 'Get all languages' })
  @ApiResponse({ status: 200, description: 'List of languages' })
  async getLanguages() {
    return this.referenceDataRepo.findAllLanguages();
  }

  @Get('languages/by-code/:code')
  @ResponseDTO(ResponseLanguageDto)
  @ApiOperation({ summary: 'Get language by code' })
  @ApiParam({ name: 'code', description: 'ISO 639-1 language code (e.g., uz, ru, en)' })
  @ApiResponse({ status: 200, description: 'Language details' })
  async getLanguageByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findLanguageByCode(code.toLowerCase());
  }

  @Get('languages/:id')
  @ResponseDTO(ResponseLanguageDto)
  @ApiOperation({ summary: 'Get language by ID' })
  @ApiParam({ name: 'id', description: 'Language ID' })
  async getLanguageById(@Param('id') id: string) {
    const item = await this.referenceDataRepo.findLanguageById(id);

    if (!item) {
      throw new NotFoundException('Language not found');
    }

    return item;
  }

  // Currencies
  @Get('currencies')
  @ResponseDTO(ResponseCurrencyDto, { isArray: true })
  @ApiOperation({ summary: 'Get all currencies' })
  @ApiResponse({ status: 200, description: 'List of currencies' })
  async getCurrencies() {
    return this.referenceDataRepo.findAllCurrencies();
  }

  @Get('currencies/by-code/:code')
  @ResponseDTO(ResponseCurrencyDto)
  @ApiOperation({ summary: 'Get currency by code' })
  @ApiParam({ name: 'code', description: 'ISO 4217 currency code (e.g., USD, UZS, RUB)' })
  @ApiResponse({ status: 200, description: 'Currency details' })
  async getCurrencyByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findCurrencyByCode(code.toUpperCase());
  }

  @Get('currencies/:id')
  @ResponseDTO(ResponseCurrencyDto)
  @ApiOperation({ summary: 'Get currency by ID' })
  @ApiParam({ name: 'id', description: 'Currency ID' })
  async getCurrencyById(@Param('id') id: string) {
    const item = await this.referenceDataRepo.findCurrencyById(id);

    if (!item) {
      throw new NotFoundException('Currency not found');
    }

    return item;
  }

  // Load Types
  @Get('load-types')
  @ResponseDTO(ResponseLoadTypeDto, { isArray: true })
  @ApiOperation({ summary: 'Get all load/cargo types' })
  @ApiResponse({ status: 200, description: 'List of load types' })
  async getLoadTypes() {
    return this.referenceDataRepo.findAllLoadTypes();
  }

  @Get('load-types/by-code/:code')
  @ResponseDTO(ResponseLoadTypeDto)
  @ApiOperation({ summary: 'Get load type by code' })
  @ApiParam({ name: 'code', description: 'Load type code' })
  @ApiResponse({ status: 200, description: 'Load type details' })
  async getLoadTypeByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findLoadTypeByCode(code);
  }

  @Get('load-types/:id')
  @ResponseDTO(ResponseLoadTypeDto)
  @ApiOperation({ summary: 'Get load type by ID' })
  @ApiParam({ name: 'id', description: 'Load type ID' })
  async getLoadTypeById(@Param('id') id: string) {
    const item = await this.referenceDataRepo.findLoadTypeById(id);

    if (!item) {
      throw new NotFoundException('Load type not found');
    }

    return item;
  }

  // Transport Types
  @Get('transport-types')
  @ResponseDTO(ResponseTransportTypeDto, { isArray: true })
  @ApiOperation({ summary: 'Get all transport types' })
  @ApiResponse({ status: 200, description: 'List of transport types' })
  async getTransportTypes() {
    return this.referenceDataRepo.findAllTransportTypes();
  }

  @Get('transport-types/by-code/:code')
  @ResponseDTO(ResponseTransportTypeDto)
  @ApiOperation({ summary: 'Get transport type by code' })
  @ApiParam({ name: 'code', description: 'Transport type code' })
  @ApiResponse({ status: 200, description: 'Transport type details' })
  async getTransportTypeByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findTransportTypeByCode(code);
  }

  @Get('transport-types/:id')
  @ResponseDTO(ResponseTransportTypeDto)
  @ApiOperation({ summary: 'Get transport type by ID' })
  @ApiParam({ name: 'id', description: 'Transport type ID' })
  async getTransportTypeById(@Param('id') id: string) {
    const item = await this.referenceDataRepo.findTransportTypeById(id);

    if (!item) {
      throw new NotFoundException('Transport type not found');
    }

    return item;
  }

  // Loading Types
  @Get('loading-types')
  @ResponseDTO(ResponseLoadingTypeDto, { isArray: true })
  @ApiOperation({ summary: 'Get all loading types (TOP, SIDE, REAR, etc.)' })
  @ApiResponse({ status: 200, description: 'List of loading types' })
  async getLoadingTypes() {
    return this.referenceDataRepo.findAllLoadingTypes();
  }

  @Get('loading-types/by-code/:code')
  @ResponseDTO(ResponseLoadingTypeDto)
  @ApiOperation({ summary: 'Get loading type by code' })
  @ApiParam({ name: 'code', description: 'Loading type code (e.g., TOP, SIDE, REAR)' })
  @ApiResponse({ status: 200, description: 'Loading type details' })
  async getLoadingTypeByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findLoadingTypeByCode(code.toUpperCase());
  }

  @Get('loading-types/:id')
  @ResponseDTO(ResponseLoadingTypeDto)
  @ApiOperation({ summary: 'Get loading type by ID' })
  @ApiParam({ name: 'id', description: 'Loading type ID' })
  async getLoadingTypeById(@Param('id') id: string) {
    const item = await this.referenceDataRepo.findLoadingTypeById(id);

    if (!item) {
      throw new NotFoundException('Loading type not found');
    }

    return item;
  }

  // Company Types
  @Get('company-types')
  @ResponseDTO(ResponseCompanyTypeDto, { isArray: true })
  @ApiOperation({ summary: 'Get all company types' })
  @ApiResponse({ status: 200, description: 'List of company types' })
  async getCompanyTypes() {
    return this.referenceDataRepo.findAllCompanyTypes();
  }

  @Get('company-types/by-code/:code')
  @ResponseDTO(ResponseCompanyTypeDto)
  @ApiOperation({ summary: 'Get company type by code' })
  @ApiParam({ name: 'code', description: 'Company type code' })
  @ApiResponse({ status: 200, description: 'Company type details' })
  async getCompanyTypeByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findCompanyTypeByCode(code);
  }

  @Get('company-types/:id')
  @ResponseDTO(ResponseCompanyTypeDto)
  @ApiOperation({ summary: 'Get company type by ID' })
  @ApiParam({ name: 'id', description: 'Company type ID' })
  async getCompanyTypeById(@Param('id') id: string) {
    const item = await this.referenceDataRepo.findCompanyTypeById(id);

    if (!item) {
      throw new NotFoundException('Company type not found');
    }

    return item;
  }

  // ADR Classifications
  @Get('adr-classifications')
  @ResponseDTO(ResponseADRClassificationDto, { isArray: true })
  @ApiOperation({ summary: 'Get all ADR (hazardous goods) classifications' })
  @ApiResponse({ status: 200, description: 'List of ADR classifications' })
  async getADRClassifications() {
    return this.referenceDataRepo.findAllADRClassifications();
  }

  @Get('adr-classifications/by-code/:code')
  @ResponseDTO(ResponseADRClassificationDto)
  @ApiOperation({ summary: 'Get ADR classification by code' })
  @ApiParam({ name: 'code', description: 'ADR classification code (e.g., 1, 2, 3, 4.1)' })
  @ApiResponse({ status: 200, description: 'ADR classification details' })
  async getADRClassificationByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findADRClassificationByCode(code);
  }

  @Get('adr-classifications/:id')
  @ResponseDTO(ResponseADRClassificationDto)
  @ApiOperation({ summary: 'Get ADR classification by ID' })
  @ApiParam({ name: 'id', description: 'ADR classification ID' })
  async getADRClassificationById(@Param('id') id: string) {
    const item = await this.referenceDataRepo.findADRClassificationById(id);

    if (!item) {
      throw new NotFoundException('ADR classification not found');
    }

    return item;
  }

  // Permits
  @Get('permits')
  @ResponseDTO(ResponsePermitDto, { isArray: true })
  @ApiOperation({ summary: 'Get all available permits' })
  @ApiResponse({ status: 200, description: 'List of permits' })
  async getPermits() {
    return this.referenceDataRepo.findAllPermits();
  }

  @Get('permits/by-code/:code')
  @ResponseDTO(ResponsePermitDto)
  @ApiOperation({ summary: 'Get permit by code' })
  @ApiParam({ name: 'code', description: 'Permit code (e.g., TIR, CMR, EKMT)' })
  @ApiResponse({ status: 200, description: 'Permit details' })
  async getPermitByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findPermitByCode(code.toUpperCase());
  }

  @Get('permits/:id')
  @ResponseDTO(ResponsePermitDto)
  @ApiOperation({ summary: 'Get permit by ID' })
  @ApiParam({ name: 'id', description: 'Permit ID' })
  async getPermitById(@Param('id') id: string) {
    const item = await this.referenceDataRepo.findPermitById(id);

    if (!item) {
      throw new NotFoundException('Permit not found');
    }

    return item;
  }
}
