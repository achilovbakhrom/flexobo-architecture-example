import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class LineItemInputDto {
  @IsString()
  description!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class BillingInfoInputDto {
  @IsString()
  companyName!: string;

  @IsString()
  address!: string;

  @IsString()
  city!: string;

  @IsString()
  country!: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsEmail()
  email!: string;
}

export class CreateInvoiceDto {
  @IsUUID()
  subscriptionId!: string;

  @IsUUID()
  companyId!: string;

  @IsDate()
  @Type(() => Date)
  periodStart!: Date;

  @IsDate()
  @Type(() => Date)
  periodEnd!: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemInputDto)
  lineItems!: LineItemInputDto[];

  @ValidateNested()
  @Type(() => BillingInfoInputDto)
  billingInfo!: BillingInfoInputDto;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class VoidInvoiceDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class LineItemResponseDto {
  description!: string;
  quantity!: number;
  unitPrice!: number;
  amount!: number;
}

export class BillingInfoResponseDto {
  companyName!: string;
  address!: string;
  city!: string;
  country!: string;
  postalCode?: string;
  taxId?: string;
  email!: string;
}

export class InvoiceResponseDto {
  id!: string;
  invoiceNumber!: string;
  subscriptionId!: string;
  companyId!: string;
  paymentId?: string;
  subtotal!: number;
  tax!: number;
  total!: number;
  currency!: string;
  status!: string;
  periodStart!: Date;
  periodEnd!: Date;
  dueDate!: Date;
  paidAt?: Date;
  lineItems!: LineItemResponseDto[];
  billingInfo!: BillingInfoResponseDto;
  pdfUrl?: string;
  createdAt!: Date;
}

export class InvoiceListResponseDto {
  items!: InvoiceResponseDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}
