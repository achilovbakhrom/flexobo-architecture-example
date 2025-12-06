import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@flexobo/core';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@flexobo/shared-kernel';
import {
  CreateLanguageDto,
  UpdateLanguageDto,
  LanguageListQueryDto,
  ResponseLanguageDto,
} from '../dto/language.dto';
import { CreateLanguageCommand } from '../../../application/commands/language/create-language.command';
import { UpdateLanguageCommand } from '../../../application/commands/language/update-language.command';
import { DeleteLanguageCommand } from '../../../application/commands/language/delete-language.command';
import { GetLanguageQuery } from '../../../application/queries/language/get-language.query';
import {
  ListLanguagesQuery,
  ListLanguagesResult,
} from '../../../application/queries/language/list-languages.query';
import { LanguageDto } from '../../../ports/language.repository';
import { ResponseDTO } from '@flexobo/shared-kernel';

@ApiTags('Languages')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('v1/languages')
export class LanguageController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Get()
  @ApiOperation({ summary: 'List languages' })
  @ApiOkResponse({ description: 'List of languages' })
  @ResponseDTO(ResponseLanguageDto, { isArray: true })
  async list(@Query() query: LanguageListQueryDto) {
    const result = await this.queryBus.execute<ListLanguagesResult>(
      new ListLanguagesQuery(
        {
          search: query.search,
          code: query.code,
          isActive: query.is_active,
        },
        query.page ?? 1,
        query.limit ?? 10
      )
    );

    return {
      data: result.items,
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @ResponseDTO(ResponseLanguageDto)
  @ApiOperation({ summary: 'Get language by id' })
  async get(@Param('id') id: string) {
    const language = await this.queryBus.execute<LanguageDto>(
      new GetLanguageQuery(id)
    );

    return {
      data: language,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create language' })
  async create(@Body() dto: CreateLanguageDto) {
    const result = await this.commandBus.execute<LanguageDto>(
      new CreateLanguageCommand(dto.name, dto.code, dto.is_active ?? false)
    );

    if (result.isFailure) {
      throw result.error;
    }

    return {
      data: result.value,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update language' })
  async update(@Param('id') id: string, @Body() dto: UpdateLanguageDto) {
    const payload = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.is_active !== undefined && { isActive: dto.is_active }),
    };

    const result = await this.commandBus.execute<LanguageDto>(
      new UpdateLanguageCommand(id, payload)
    );

    if (result.isFailure) {
      throw result.error;
    }

    return {
      data: result.value,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete language' })
  async delete(@Param('id') id: string) {
    const result = await this.commandBus.execute<LanguageDto>(
      new DeleteLanguageCommand(id)
    );

    if (result.isFailure) {
      throw result.error;
    }

    return {
      data: result.value,
    };
  }
}
