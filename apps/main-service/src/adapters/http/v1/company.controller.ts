import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@flexobo/core';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedUser, CurrentUser } from '@flexobo/shared-kernel';
import {
  CreateCompanyDto,
  CreateMyCompanyDto,
  UpdateCompanyDto,
  VerifyCompanyDto,
  RejectCompanyDto,
  SuspendCompanyDto,
  AddCompanyMemberDto,
  AddMembersDto,
  UpdateCompanyMemberDto,
  AddDocumentDto,
  ListCompaniesQueryDto,
  CompanyResponseDto,
  CompanyMemberResponseDto,
  CompanyDocumentResponseDto,
} from '../dto/company.dto';
import {
  CreateCompanyCommand,
  UpdateCompanyCommand,
  DeleteCompanyCommand,
  VerifyCompanyCommand,
  RejectCompanyCommand,
  SuspendCompanyCommand,
  ReactivateCompanyCommand,
  AddCompanyMemberCommand,
  UpdateCompanyMemberCommand,
  RemoveCompanyMemberCommand,
  AddCompanyDocumentCommand,
  RemoveCompanyDocumentCommand,
} from '../../../application/commands/company';
import {
  GetCompanyQuery,
  GetMyCompanyQuery,
  ListCompaniesQuery,
  GetCompanyMembersQuery,
  GetUserCompaniesQuery,
  GetCompanyStatsQuery,
  GetCompanyRatingsQuery,
  GetCompanyBookingsQuery,
} from '../../../application/queries/company';
import { CompanyDocumentType } from '../../../domain/events/company.events';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('v1/companies')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  // Create company for current user (POST /me)
  @Post('me')
  @ApiOperation({ summary: 'Create company for current user' })
  @ApiResponse({ status: 201, description: 'Company created successfully', type: CompanyResponseDto })
  async createMyCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMyCompanyDto
  ) {
    const companyId = await this.commandBus.execute(
      new CreateCompanyCommand(
        user.userId,
        dto.company_type,
        dto.company_name,
        dto.company_description,
        dto.avatar,
        dto.phone_number,
        dto.email,
        dto.country,
        dto.city,
        dto.dot_mc,
        dto.is_legal_entity,
        dto.documents?.map((doc) => ({
          type: doc.type.toUpperCase() as CompanyDocumentType,
          url: doc.url,
        }))
      )
    );

    return { _id: companyId };
  }

  // Get current user's company (GET /me)
  @Get('me')
  @ApiOperation({ summary: "Get current user's company" })
  @ApiResponse({ status: 200, description: "User's company", type: CompanyResponseDto })
  async getMyCompany(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetMyCompanyQuery(user.userId));
  }

  // Update current user's company (PUT /)
  @Put()
  @ApiOperation({ summary: "Update current user's company" })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @HttpCode(HttpStatus.OK)
  async updateMyCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyDto
  ) {
    // First get the user's company
    const company = await this.queryBus.execute(
      new GetMyCompanyQuery(user.userId)
    ) as { id: string } | null;
    if (!company) {
      throw new Error('Company not found');
    }

    await this.commandBus.execute(
      new UpdateCompanyCommand(
        company.id,
        user.userId,
        dto.company_name,
        dto.company_type,
        dto.company_description,
        dto.avatar,
        dto.phone_number,
        dto.email,
        dto.country,
        dto.city,
        dto.dot_mc,
        dto.is_legal_entity,
        dto.status ? (dto.status.toUpperCase() as 'ACTIVE' | 'INACTIVE' | 'BLOCKED') : undefined
      )
    );
  }

  // Admin: Create company (POST /)
  @Post()
  @ApiOperation({ summary: 'Create a new company (admin)' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCompanyDto
  ) {
    const companyId = await this.commandBus.execute(
      new CreateCompanyCommand(
        user.userId,
        dto.company_type,
        dto.company_name,
        dto.company_description,
        dto.avatar,
        dto.phone_number,
        dto.email,
        dto.country,
        dto.city,
        dto.dot_mc,
        dto.is_legal_entity,
        dto.documents?.map((doc) => ({
          type: doc.type.toUpperCase() as CompanyDocumentType,
          url: doc.url,
        }))
      )
    );

    return { _id: companyId };
  }

  @Get()
  @ApiOperation({ summary: 'List all companies with filters' })
  @ApiResponse({ status: 200, description: 'List of companies' })
  async list(@Query() query: ListCompaniesQueryDto) {
    return this.queryBus.execute(
      new ListCompaniesQuery(
        {
          status: query.status ? (query.status.toUpperCase() as 'ACTIVE' | 'INACTIVE' | 'BLOCKED') : undefined,
          verifyStatus: query.verify_status ? (query.verify_status.toUpperCase() as 'PENDING' | 'VERIFIED' | 'REJECTED') : undefined,
          companyTypeId: query.company_type,
          countryId: query.country,
          city: query.city,
          search: query.search,
        },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get('user-companies')
  @ApiOperation({ summary: 'Get all companies the current user is a member of' })
  @ApiResponse({ status: 200, description: "List of user's companies", type: [CompanyResponseDto] })
  async getUserCompanies(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetUserCompaniesQuery(user.userId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company details', type: CompanyResponseDto })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getById(@Param('id') id: string) {
    return this.queryBus.execute(new GetCompanyQuery(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyDto
  ) {
    await this.commandBus.execute(
      new UpdateCompanyCommand(
        id,
        user.userId,
        dto.company_name,
        dto.company_type,
        dto.company_description,
        dto.avatar,
        dto.phone_number,
        dto.email,
        dto.country,
        dto.city,
        dto.dot_mc,
        dto.is_legal_entity,
        dto.status ? (dto.status.toUpperCase() as 'ACTIVE' | 'INACTIVE' | 'BLOCKED') : undefined
      )
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 204, description: 'Company deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.commandBus.execute(new DeleteCompanyCommand(id, user.userId));
  }

  // Admin actions for company verification
  @Post('verify/:id')
  @ApiOperation({ summary: 'Verify company (admin only)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company verified successfully' })
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyCompanyDto
  ) {
    // TODO: Add admin role check
    await this.commandBus.execute(
      new VerifyCompanyCommand(id, user.userId, dto.notes)
    );
  }

  @Post('reject/:id')
  @ApiOperation({ summary: 'Reject company (admin only)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company rejected successfully' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectCompanyDto
  ) {
    // TODO: Add admin role check
    await this.commandBus.execute(
      new RejectCompanyCommand(id, user.userId, dto.reason)
    );
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend company (admin only)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company suspended successfully' })
  @HttpCode(HttpStatus.OK)
  async suspend(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SuspendCompanyDto
  ) {
    // TODO: Add admin role check
    await this.commandBus.execute(
      new SuspendCompanyCommand(id, user.userId, dto.reason)
    );
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate suspended company (admin only)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company reactivated successfully' })
  @HttpCode(HttpStatus.OK)
  async reactivate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    // TODO: Add admin role check
    await this.commandBus.execute(new ReactivateCompanyCommand(id, user.userId));
  }

  // Company statistics and data
  @Get(':id/stats')
  @ApiOperation({ summary: 'Get company statistics (public)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company statistics' })
  async getStats(@Param('id') id: string) {
    return this.queryBus.execute(new GetCompanyStatsQuery(id));
  }

  @Get(':id/ratings')
  @ApiOperation({ summary: 'Get company ratings (public)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company ratings' })
  async getRatings(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.queryBus.execute(
      new GetCompanyRatingsQuery(id, page ?? 1, limit ?? 20)
    );
  }

  @Get(':id/bookings')
  @ApiOperation({ summary: 'Get company bookings' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company bookings' })
  async getBookings(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.queryBus.execute(
      new GetCompanyBookingsQuery(id, status, page ?? 1, limit ?? 20)
    );
  }

  // Member management
  @Get(':id/members')
  @ApiOperation({ summary: 'Get company members' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'List of company members', type: [CompanyMemberResponseDto] })
  async getMembers(@Param('id') id: string) {
    return this.queryBus.execute(new GetCompanyMembersQuery(id));
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add members to company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Members added successfully' })
  async addMembers(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddMembersDto
  ) {
    // Add each member
    for (const memberId of dto.members) {
      await this.commandBus.execute(
        new AddCompanyMemberCommand(id, user.userId, memberId, 'MEMBER')
      );
    }
  }

  @Delete(':id/members/:member_id')
  @ApiOperation({ summary: 'Remove member from company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiParam({ name: 'member_id', description: 'Member ID' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('member_id') memberId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.commandBus.execute(
      new RemoveCompanyMemberCommand(id, user.userId, memberId)
    );
  }

  // Document management
  @Post(':id/documents')
  @ApiOperation({ summary: 'Add document to company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Document added successfully', type: CompanyDocumentResponseDto })
  async addDocument(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddDocumentDto
  ) {
    const documentId = await this.commandBus.execute(
      new AddCompanyDocumentCommand(
        id,
        user.userId,
        dto.type.toUpperCase() as CompanyDocumentType,
        dto.url
      )
    );

    return { id: documentId, type: dto.type, url: dto.url };
  }

  @Delete(':id/documents/:documentId')
  @ApiOperation({ summary: 'Remove document from company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 204, description: 'Document removed successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.commandBus.execute(
      new RemoveCompanyDocumentCommand(id, user.userId, documentId)
    );
  }
}
