import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@flexobo/core';
import { JwtAuthGuard, CurrentUser, JwtPayload } from '@flexobo/shared-kernel';
import { randomUUID } from 'crypto';

// Multer file interface (from @types/multer)
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
import {
  UploadFileCommand,
  DeleteFileCommand,
  UploadChatFileCommand,
} from '../../../application/commands/file.commands';
import {
  GetFileByIdQuery,
  GetFilesByUserQuery,
  GetStorageStatsQuery,
  GetDownloadUrlQuery,
} from '../../../application/queries/file.queries';
import {
  UploadFileDto,
  UploadFileResponseDto,
  UploadChatFileDto,
  UploadChatFileResponseDto,
  FileResponseDto,
  FilesListResponseDto,
  StorageStatsResponseDto,
  DownloadUrlResponseDto,
  SuccessResponseDto,
} from './dto/file.dto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@ApiTags('Files')
@ApiBearerAuth()
@Controller('v1/files')
@UseGuards(JwtAuthGuard)
export class FileController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  /**
   * Upload a file
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a file',
    description: 'Upload a file to S3 storage (max 50MB). Optionally specify a folder path.',
  })
  @ApiBody({ type: UploadFileDto })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Optional company ID',
  })
  @ApiQuery({
    name: 'folder',
    required: false,
    description: 'Optional folder path (e.g., "documents", "images/avatars")',
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadFileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
        fileIsRequired: true,
      })
    )
    file: MulterFile,
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('folder') folder?: string
  ): Promise<UploadFileResponseDto> {
    const fileId = `file-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const result = await this.commandBus.execute(
      new UploadFileCommand(
        fileId,
        user.sub,
        file.buffer,
        file.originalname,
        file.mimetype,
        file.size,
        companyId,
        folder
      )
    );

    if (result.isFailure) {
      throw new BadRequestException(result.error?.message || 'Upload failed');
    }

    return result.value as UploadFileResponseDto;
  }

  /**
   * Upload a file for chat
   */
  @Post('chat/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a chat file',
    description:
      'Upload a file for chat. Publishes chat.file.uploaded event with chatId.',
  })
  @ApiBody({ type: UploadChatFileDto })
  @ApiResponse({
    status: 201,
    description: 'Chat file uploaded successfully',
    type: UploadChatFileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadChatFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
        fileIsRequired: true,
      })
    )
    file: MulterFile,
    @CurrentUser() user: JwtPayload,
    @Query('chatId') chatId: string,
    @Query('companyId') companyId?: string
  ): Promise<UploadChatFileResponseDto> {
    if (!chatId) {
      throw new BadRequestException('chatId is required');
    }

    const fileId = `file-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const result = await this.commandBus.execute(
      new UploadChatFileCommand(
        fileId,
        user.sub,
        chatId,
        file.buffer,
        file.originalname,
        file.mimetype,
        file.size,
        companyId
      )
    );

    if (result.isFailure) {
      throw new BadRequestException(result.error?.message || 'Upload failed');
    }

    return result.value as UploadChatFileResponseDto;
  }

  /**
   * Get file metadata by ID
   */
  @Get(':fileId')
  @ApiOperation({
    summary: 'Get file metadata',
    description: 'Get metadata for a specific file',
  })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'File metadata',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Param('fileId') fileId: string): Promise<FileResponseDto> {
    const file = await this.queryBus.execute(new GetFileByIdQuery(fileId));

    if (!file) {
      throw new NotFoundException(`File ${fileId} not found`);
    }

    return file as FileResponseDto;
  }

  /**
   * Get download URL for a file
   */
  @Get(':fileId/download')
  @ApiOperation({
    summary: 'Get download URL',
    description: 'Get a URL to download the file',
  })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'Download URL',
    type: DownloadUrlResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getDownloadUrl(
    @Param('fileId') fileId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<DownloadUrlResponseDto> {
    return this.queryBus.execute(new GetDownloadUrlQuery(fileId, user.sub));
  }

  /**
   * List user's files
   */
  @Get()
  @ApiOperation({
    summary: 'List user files',
    description: 'Get paginated list of files for the authenticated user',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'Files list',
    type: FilesListResponseDto,
  })
  async listFiles(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<FilesListResponseDto> {
    return this.queryBus.execute(
      new GetFilesByUserQuery(
        user.sub,
        limit ? parseInt(limit, 10) : undefined,
        offset ? parseInt(offset, 10) : undefined
      )
    );
  }

  /**
   * Get storage statistics
   */
  @Get('stats/usage')
  @ApiOperation({
    summary: 'Get storage stats',
    description:
      'Get storage usage statistics for the authenticated user or company',
  })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Get stats for company instead of user',
  })
  @ApiResponse({
    status: 200,
    description: 'Storage stats',
    type: StorageStatsResponseDto,
  })
  async getStorageStats(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string
  ): Promise<StorageStatsResponseDto> {
    return this.queryBus.execute(new GetStorageStatsQuery(user.sub, companyId));
  }

  /**
   * Delete a file
   */
  @Delete(':fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a file',
    description: 'Delete a file from storage',
  })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'File deleted',
    type: SuccessResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not file owner' })
  async deleteFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<SuccessResponseDto> {
    const result = await this.commandBus.execute(
      new DeleteFileCommand(fileId, user.sub)
    );

    if (result.isFailure) {
      if (result.error?.message?.includes('not found')) {
        throw new NotFoundException(result.error.message);
      }
      throw new BadRequestException(
        result.error?.message || 'Delete failed'
      );
    }

    return { success: true };
  }
}
