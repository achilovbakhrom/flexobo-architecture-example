import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@flexobo/core';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser, RolesGuard, Roles } from '@flexobo/shared-kernel';
import {
  CreateInvoiceCommand,
  FinalizeInvoiceCommand,
  VoidInvoiceCommand,
  MarkInvoicePaidCommand,
} from '../../../application/commands/invoice';
import {
  GetInvoiceQuery,
  ListInvoicesByCompanyQuery,
  InvoiceDto,
  InvoiceListResult,
} from '../../../application/queries/invoice';
import {
  CreateInvoiceDto,
  VoidInvoiceDto,
  InvoiceResponseDto,
  InvoiceListResponseDto,
} from '../dto/invoice.dto';

@Controller('v1/invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async listInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ): Promise<InvoiceListResponseDto> {
    if (!user.companyId) {
      throw new BadRequestException('User must have a company');
    }

    const result = await this.queryBus.execute<InvoiceListResult>(
      new ListInvoicesByCompanyQuery(user.companyId, page, pageSize),
    );

    return {
      items: result.items.map(this.toInvoiceResponse),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Get(':id')
  async getInvoice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.queryBus.execute<InvoiceDto | null>(
      new GetInvoiceQuery(id),
    );

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.companyId !== user.companyId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot access this invoice');
    }

    return this.toInvoiceResponse(invoice);
  }

  @Get(':id/pdf')
  async downloadInvoicePdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const invoice = await this.queryBus.execute<InvoiceDto | null>(
      new GetInvoiceQuery(id),
    );

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.companyId !== user.companyId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot access this invoice');
    }

    if (!invoice.pdfUrl) {
      throw new NotFoundException('PDF not yet generated');
    }

    // Redirect to PDF URL (could be S3 presigned URL or file service)
    res.redirect(invoice.pdfUrl);
  }

  // Admin endpoints
  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    const id = uuidv4();

    // Calculate line item amounts
    const lineItems = dto.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
    }));

    const createResult = await this.commandBus.execute(
      new CreateInvoiceCommand(
        id,
        dto.subscriptionId,
        dto.companyId, // Admin must provide companyId
        dto.periodStart,
        dto.periodEnd,
        lineItems,
        dto.billingInfo,
        dto.currency ?? 'USD',
        dto.tax ?? 0,
      ),
    );

    if (createResult.isFailure) {
      throw createResult.error;
    }

    const invoice = await this.queryBus.execute<InvoiceDto | null>(
      new GetInvoiceQuery(id),
    );

    if (!invoice) {
      throw new Error('Invoice creation failed');
    }

    return this.toInvoiceResponse(invoice);
  }

  @Post(':id/finalize')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async finalizeInvoice(
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.queryBus.execute<InvoiceDto | null>(
      new GetInvoiceQuery(id),
    );

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const finalizeResult = await this.commandBus.execute(new FinalizeInvoiceCommand(id));
    if (finalizeResult.isFailure) {
      throw finalizeResult.error;
    }

    const updated = await this.queryBus.execute<InvoiceDto>(
      new GetInvoiceQuery(id),
    );

    return this.toInvoiceResponse(updated);
  }

  @Post(':id/void')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async voidInvoice(
    @Param('id') id: string,
    @Body() dto: VoidInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.queryBus.execute<InvoiceDto | null>(
      new GetInvoiceQuery(id),
    );

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const voidResult = await this.commandBus.execute(new VoidInvoiceCommand(id, dto.reason));
    if (voidResult.isFailure) {
      throw voidResult.error;
    }

    const updated = await this.queryBus.execute<InvoiceDto>(
      new GetInvoiceQuery(id),
    );

    return this.toInvoiceResponse(updated);
  }

  @Post(':id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async markInvoicePaid(
    @Param('id') id: string,
    @Body() body: { paymentId: string },
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.queryBus.execute<InvoiceDto | null>(
      new GetInvoiceQuery(id),
    );

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const markPaidResult = await this.commandBus.execute(new MarkInvoicePaidCommand(id, body.paymentId));
    if (markPaidResult.isFailure) {
      throw markPaidResult.error;
    }

    const updated = await this.queryBus.execute<InvoiceDto>(
      new GetInvoiceQuery(id),
    );

    return this.toInvoiceResponse(updated);
  }

  private toInvoiceResponse(invoice: InvoiceDto): InvoiceResponseDto {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      subscriptionId: invoice.subscriptionId,
      companyId: invoice.companyId,
      paymentId: invoice.paymentId,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      lineItems: invoice.lineItems,
      billingInfo: invoice.billingInfo,
      pdfUrl: invoice.pdfUrl,
      createdAt: invoice.createdAt,
    };
  }
}
