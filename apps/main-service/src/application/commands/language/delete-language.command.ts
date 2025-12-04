import { Inject, NotFoundException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import {
  LANGUAGE_REPOSITORY,
  ILanguageRepository,
  LanguageDto,
} from '../../../ports/language.repository';

export class DeleteLanguageCommand implements ICommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(DeleteLanguageCommand)
export class DeleteLanguageHandler
  implements ICommandHandler<DeleteLanguageCommand, LanguageDto>
{
  constructor(
    @Inject(LANGUAGE_REPOSITORY)
    private readonly languageRepository: ILanguageRepository
  ) {}

  async execute(command: DeleteLanguageCommand): Promise<Result<LanguageDto, Error>> {
    try {
      const deleted = await this.languageRepository.delete(command.id);

      if (!deleted) {
        throw new NotFoundException('Language not found');
      }

      return new Success(deleted);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
