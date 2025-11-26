/**
 * Product query handlers
 *
 * Queries use the read model repository (CQRS read side).
 */

import { QueryHandler, IQueryHandler } from '@flexobo/core';
import {
  IProductReadModelRepository,
  PRODUCT_READ_MODEL_REPOSITORY,
} from '../../ports/product.repository.port';
import {
  GetProductByIdQuery,
  GetProductBySkuQuery,
  GetProductsByCategoryQuery,
  GetActiveProductsQuery,
  SearchProductsQuery,
} from './product.queries';
import { Inject } from '@nestjs/common';
import { ProductDto } from '../dto/product.dto';

@QueryHandler(GetProductByIdQuery)
export class GetProductByIdHandler
  implements IQueryHandler<GetProductByIdQuery>
{
  constructor(
    @Inject(PRODUCT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IProductReadModelRepository
  ) {}

  async execute(query: GetProductByIdQuery): Promise<ProductDto | null> {
    return this.readModelRepository.findById(query.productId);
  }
}

@QueryHandler(GetProductBySkuQuery)
export class GetProductBySkuHandler
  implements IQueryHandler<GetProductBySkuQuery>
{
  constructor(
    @Inject(PRODUCT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IProductReadModelRepository
  ) {}

  async execute(query: GetProductBySkuQuery): Promise<ProductDto | null> {
    return this.readModelRepository.findBySku(query.sku);
  }
}

@QueryHandler(GetProductsByCategoryQuery)
export class GetProductsByCategoryHandler
  implements IQueryHandler<GetProductsByCategoryQuery>
{
  constructor(
    @Inject(PRODUCT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IProductReadModelRepository
  ) {}

  async execute(query: GetProductsByCategoryQuery): Promise<{
    category: string;
    products: ProductDto[];
  }> {
    const products = await this.readModelRepository.findByCategory(
      query.category,
      { limit: query.limit, offset: query.offset }
    );

    return {
      category: query.category,
      products,
    };
  }
}

@QueryHandler(GetActiveProductsQuery)
export class GetActiveProductsHandler
  implements IQueryHandler<GetActiveProductsQuery>
{
  constructor(
    @Inject(PRODUCT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IProductReadModelRepository
  ) {}

  async execute(query: GetActiveProductsQuery): Promise<ProductDto[]> {
    return this.readModelRepository.findActive({
      limit: query.limit,
      offset: query.offset,
    });
  }
}

@QueryHandler(SearchProductsQuery)
export class SearchProductsHandler
  implements IQueryHandler<SearchProductsQuery>
{
  constructor(
    @Inject(PRODUCT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IProductReadModelRepository
  ) {}

  async execute(query: SearchProductsQuery): Promise<{
    query: string;
    products: ProductDto[];
  }> {
    const products = await this.readModelRepository.search(query.query, {
      limit: query.limit,
      offset: query.offset,
    });

    return {
      query: query.query,
      products,
    };
  }
}
