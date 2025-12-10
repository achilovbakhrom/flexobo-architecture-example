import {
  Controller,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@flexobo/core';
import { UpdateUserLanguageDto, UserResponseDto } from '../dto';
import { UpdateUserProfileCommand } from '../../../application/commands';
import { GetUserByIdQuery } from '../../../application/queries';
import { JwtAuthGuard } from '../guards';
import { IUser } from '../../../ports/user.interface';
import { ResponseDTO } from '@flexobo/shared-kernel';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Put(':id/lang')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user language' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserLanguageDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ResponseDTO(UserResponseDto)
  async updateUserLanguage(
    @Param('id') id: string,
    @Body() dto: UpdateUserLanguageDto
  ): Promise<{ data: IUser }> {
    // First check if user exists
    const existingUser = await this.queryBus.execute<IUser | null>(
      new GetUserByIdQuery(id)
    );

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Update user language using existing command
    const command = new UpdateUserProfileCommand(
      id,
      undefined, // fio
      undefined, // phoneNumber
      dto.lang, // language
      undefined // avatar
    );

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }

    // Fetch updated user
    const updatedUser = await this.queryBus.execute<IUser | null>(
      new GetUserByIdQuery(id)
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return { data: updatedUser };
  }
}
