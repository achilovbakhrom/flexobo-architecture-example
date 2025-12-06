import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  IReferenceDataRepository,
  REFERENCE_DATA_REPOSITORY,
} from '../../../ports/reference-data.repository';

@ApiTags('Reference Data')
@Controller('v1')
export class ReferenceDataController {
  constructor(
    @Inject(REFERENCE_DATA_REPOSITORY)
    private readonly referenceDataRepo: IReferenceDataRepository
  ) {}

  // Countries
  @Get('countries')
  @ApiOperation({ summary: 'Get all countries' })
  @ApiResponse({ status: 200, description: 'List of countries' })
  async getCountries() {
    return this.referenceDataRepo.findAllCountries();
  }

  @Get('countries/:code')
  @ApiOperation({ summary: 'Get country by code' })
  @ApiParam({ name: 'code', description: 'ISO 3166-1 alpha-2 country code (e.g., UZ, RU)' })
  @ApiResponse({ status: 200, description: 'Country details' })
  async getCountryByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findCountryByCode(code.toUpperCase());
  }

  // Languages
  @Get('languages')
  @ApiOperation({ summary: 'Get all languages' })
  @ApiResponse({ status: 200, description: 'List of languages' })
  async getLanguages() {
    return this.referenceDataRepo.findAllLanguages();
  }

  @Get('languages/:code')
  @ApiOperation({ summary: 'Get language by code' })
  @ApiParam({ name: 'code', description: 'ISO 639-1 language code (e.g., uz, ru, en)' })
  @ApiResponse({ status: 200, description: 'Language details' })
  async getLanguageByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findLanguageByCode(code.toLowerCase());
  }

  // Currencies
  @Get('currencies')
  @ApiOperation({ summary: 'Get all currencies' })
  @ApiResponse({ status: 200, description: 'List of currencies' })
  async getCurrencies() {
    return this.referenceDataRepo.findAllCurrencies();
  }

  @Get('currencies/:code')
  @ApiOperation({ summary: 'Get currency by code' })
  @ApiParam({ name: 'code', description: 'ISO 4217 currency code (e.g., USD, UZS, RUB)' })
  @ApiResponse({ status: 200, description: 'Currency details' })
  async getCurrencyByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findCurrencyByCode(code.toUpperCase());
  }

  // Load Types
  @Get('load-types')
  @ApiOperation({ summary: 'Get all load/cargo types' })
  @ApiResponse({ status: 200, description: 'List of load types' })
  async getLoadTypes() {
    return this.referenceDataRepo.findAllLoadTypes();
  }

  @Get('load-types/:code')
  @ApiOperation({ summary: 'Get load type by code' })
  @ApiParam({ name: 'code', description: 'Load type code' })
  @ApiResponse({ status: 200, description: 'Load type details' })
  async getLoadTypeByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findLoadTypeByCode(code);
  }

  // Transport Types
  @Get('transport-types')
  @ApiOperation({ summary: 'Get all transport types' })
  @ApiResponse({ status: 200, description: 'List of transport types' })
  async getTransportTypes() {
    return this.referenceDataRepo.findAllTransportTypes();
  }

  @Get('transport-types/:code')
  @ApiOperation({ summary: 'Get transport type by code' })
  @ApiParam({ name: 'code', description: 'Transport type code' })
  @ApiResponse({ status: 200, description: 'Transport type details' })
  async getTransportTypeByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findTransportTypeByCode(code);
  }

  // Loading Types
  @Get('loading-types')
  @ApiOperation({ summary: 'Get all loading types (TOP, SIDE, REAR, etc.)' })
  @ApiResponse({ status: 200, description: 'List of loading types' })
  async getLoadingTypes() {
    return this.referenceDataRepo.findAllLoadingTypes();
  }

  @Get('loading-types/:code')
  @ApiOperation({ summary: 'Get loading type by code' })
  @ApiParam({ name: 'code', description: 'Loading type code (e.g., TOP, SIDE, REAR)' })
  @ApiResponse({ status: 200, description: 'Loading type details' })
  async getLoadingTypeByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findLoadingTypeByCode(code.toUpperCase());
  }

  // Company Types
  @Get('company-types')
  @ApiOperation({ summary: 'Get all company types' })
  @ApiResponse({ status: 200, description: 'List of company types' })
  async getCompanyTypes() {
    return this.referenceDataRepo.findAllCompanyTypes();
  }

  @Get('company-types/:code')
  @ApiOperation({ summary: 'Get company type by code' })
  @ApiParam({ name: 'code', description: 'Company type code' })
  @ApiResponse({ status: 200, description: 'Company type details' })
  async getCompanyTypeByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findCompanyTypeByCode(code);
  }

  // ADR Classifications
  @Get('adr-classifications')
  @ApiOperation({ summary: 'Get all ADR (hazardous goods) classifications' })
  @ApiResponse({ status: 200, description: 'List of ADR classifications' })
  async getADRClassifications() {
    return this.referenceDataRepo.findAllADRClassifications();
  }

  @Get('adr-classifications/:code')
  @ApiOperation({ summary: 'Get ADR classification by code' })
  @ApiParam({ name: 'code', description: 'ADR classification code (e.g., 1, 2, 3, 4.1)' })
  @ApiResponse({ status: 200, description: 'ADR classification details' })
  async getADRClassificationByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findADRClassificationByCode(code);
  }

  // Permits
  @Get('permits')
  @ApiOperation({ summary: 'Get all available permits' })
  @ApiResponse({ status: 200, description: 'List of permits' })
  async getPermits() {
    return this.referenceDataRepo.findAllPermits();
  }

  @Get('permits/:code')
  @ApiOperation({ summary: 'Get permit by code' })
  @ApiParam({ name: 'code', description: 'Permit code (e.g., TIR, CMR, EKMT)' })
  @ApiResponse({ status: 200, description: 'Permit details' })
  async getPermitByCode(@Param('code') code: string) {
    return this.referenceDataRepo.findPermitByCode(code.toUpperCase());
  }
}
