import { Inject, BadRequestException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import {
  LANGUAGE_REPOSITORY,
  ILanguageRepository,
  LanguageDto,
} from '../../../ports/language.repository';

export class CreateLanguageCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly code: string,
    public readonly isActive = false
  ) {}
}

@CommandHandler(CreateLanguageCommand)
export class CreateLanguageHandler
  implements ICommandHandler<CreateLanguageCommand, LanguageDto>
{
  constructor(
    @Inject(LANGUAGE_REPOSITORY)
    private readonly languageRepository: ILanguageRepository
  ) {}

  async execute(command: CreateLanguageCommand): Promise<Result<LanguageDto, Error>> {
    try {
      const existing = await this.languageRepository.findByCode(command.code);
      if (existing) {
        throw new BadRequestException('Language already exists');
      }

      const result = await this.languageRepository.create({
        name: command.name,
        code: command.code,
        isActive: command.isActive,
      });

      return new Success(result);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
