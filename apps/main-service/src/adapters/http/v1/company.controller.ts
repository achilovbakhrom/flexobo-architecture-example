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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedUser } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  VerifyCompanyDto,
  RejectCompanyDto,
  SuspendCompanyDto,
  AddCompanyMemberDto,
  UpdateCompanyMemberDto,
  ListCompaniesQueryDto,
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
} from '../../../application/commands/company';
import {
  GetCompanyQuery,
  GetMyCompanyQuery,
  ListCompaniesQuery,
  GetCompanyMembersQuery,
  GetUserCompaniesQuery,
} from '../../../application/queries/company';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('v1/companies')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCompanyDto
  ): Promise<{ id: string }> {
    const companyId = await this.commandBus.execute(
      new CreateCompanyCommand(
        user.userId,
        dto.name,
        dto.type,
        dto.description,
        dto.logo,
        dto.phone,
        dto.email,
        dto.address,
        dto.country,
        dto.city,
        dto.taxId,
        dto.website
      )
    );

    return { id: companyId };
  }

  @Get()
  @ApiOperation({ summary: 'List all companies with filters' })
  @ApiResponse({ status: 200, description: 'List of companies' })
  async list(@Query() query: ListCompaniesQueryDto) {
    return this.queryBus.execute(
      new ListCompaniesQuery(
        {
          status: query.status,
          type: query.type,
          country: query.country,
          city: query.city,
          isActive: query.isActive,
          search: query.search,
        },
        query.page ?? 1,
        query.limit ?? 20
      )
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user\'s company' })
  @ApiResponse({ status: 200, description: 'User\'s company' })
  async getMyCompany(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetMyCompanyQuery(user.userId));
  }

  @Get('user-companies')
  @ApiOperation({ summary: 'Get all companies the current user is a member of' })
  @ApiResponse({ status: 200, description: 'List of user\'s companies' })
  async getUserCompanies(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetUserCompaniesQuery(user.userId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company details' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getById(@Param('id') id: string) {
    return this.queryBus.execute(new GetCompanyQuery(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyDto
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateCompanyCommand(
        id,
        user.userId,
        dto.name,
        dto.description,
        dto.logo,
        dto.phone,
        dto.email,
        dto.address,
        dto.country,
        dto.city,
        dto.taxId,
        dto.website
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
  ): Promise<void> {
    await this.commandBus.execute(new DeleteCompanyCommand(id, user.userId));
  }

  // Admin actions for company verification
  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify company (admin only)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company verified successfully' })
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyCompanyDto
  ): Promise<void> {
    // TODO: Add admin role check
    await this.commandBus.execute(
      new VerifyCompanyCommand(id, user.userId, dto.notes)
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject company (admin only)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company rejected successfully' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectCompanyDto
  ): Promise<void> {
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
  ): Promise<void> {
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
  ): Promise<void> {
    // TODO: Add admin role check
    await this.commandBus.execute(new ReactivateCompanyCommand(id, user.userId));
  }

  // Member management
  @Get(':id/members')
  @ApiOperation({ summary: 'Get company members' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'List of company members' })
  async getMembers(@Param('id') id: string) {
    return this.queryBus.execute(new GetCompanyMembersQuery(id));
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  async addMember(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddCompanyMemberDto
  ): Promise<void> {
    await this.commandBus.execute(
      new AddCompanyMemberCommand(id, user.userId, dto.userId, dto.role)
    );
  }

  @Put(':id/members/:memberId')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  @HttpCode(HttpStatus.OK)
  async updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyMemberDto
  ): Promise<void> {
    await this.commandBus.execute(
      new UpdateCompanyMemberCommand(id, user.userId, memberId, dto.role)
    );
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member from company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.commandBus.execute(
      new RemoveCompanyMemberCommand(id, user.userId, memberId)
    );
  }
}
