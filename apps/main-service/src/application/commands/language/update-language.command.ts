import {
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import {
  LANGUAGE_REPOSITORY,
  ILanguageRepository,
  LanguageDto,
  UpdateLanguageInput,
} from '../../../ports/language.repository';

export class UpdateLanguageCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly payload: UpdateLanguageInput
  ) {}
}

@CommandHandler(UpdateLanguageCommand)
export class UpdateLanguageHandler
  implements ICommandHandler<UpdateLanguageCommand, LanguageDto>
{
  constructor(
    @Inject(LANGUAGE_REPOSITORY)
    private readonly languageRepository: ILanguageRepository
  ) {}

  async execute(command: UpdateLanguageCommand): Promise<Result<LanguageDto, Error>> {
    try {
      if (command.payload.code) {
        const existing = await this.languageRepository.findByCode(
          command.payload.code
        );
        if (existing && existing.id !== command.id) {
          throw new BadRequestException('Language already exists');
        }
      }

      const updated = await this.languageRepository.update(
        command.id,
        command.payload
      );

      if (!updated) {
        throw new NotFoundException('Language not found');
      }

      return new Success(updated);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
