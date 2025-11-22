# Adding a New Service

This guide walks you through creating a new microservice in the monorepo.

## Quick Start

Let's create a new **Payment Service** as an example.

### 1. Generate Service with Nx

```bash
npx nx g @nx/nest:application payment-service
```

This creates:
```
apps/payment-service/
├── src/
│   ├── app/
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   └── app.module.ts
│   └── main.ts
├── project.json
├── tsconfig.app.json
├── tsconfig.json
└── Dockerfile
```

### 2. Configure Build System

Edit `apps/payment-service/project.json`:

```json
{
  "name": "payment-service",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/payment-service/src",
  "projectType": "application",
  "tags": [],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/payment-service",
        "main": "apps/payment-service/src/main.ts",
        "tsConfig": "apps/payment-service/tsconfig.app.json",
        "assets": ["apps/payment-service/src/assets"]
      },
      "configurations": {
        "production": {
          "optimization": true,
          "extractLicenses": true,
          "sourceMap": false
        }
      }
    },
    "serve": {
      "executor": "nx:run-commands",
      "dependsOn": ["build"],
      "options": {
        "command": "node dist/apps/payment-service/src/main.js"
      }
    },
    "test": {
      "options": {
        "passWithNoTests": true
      }
    }
  }
}
```

### 3. Create Service Structure

Organize your service following hexagonal architecture:

```bash
mkdir -p apps/payment-service/src/{domain,application,presentation}
mkdir -p apps/payment-service/src/application/{commands,queries}
```

```
apps/payment-service/src/
├── domain/                           # Domain Layer
│   ├── payment.aggregate.ts          # Aggregate root
│   ├── payment.events.ts             # Domain events
│   └── payment.exceptions.ts         # Domain exceptions
├── application/                      # Application Layer
│   ├── commands/                     # Write operations
│   │   ├── payment.commands.ts
│   │   └── payment.handlers.ts
│   └── queries/                      # Read operations
│       ├── payment.queries.ts
│       └── payment.handlers.ts
├── presentation/                     # Presentation Layer
│   └── payment.controller.ts         # REST API
├── payment.module.ts                 # NestJS module
└── main.ts                          # Entry point
```

### 4. Update Main Entry Point

Edit `apps/payment-service/src/main.ts`:

```typescript
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PaymentModule } from './payment.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentModule);
  const globalPrefix = 'api';
  const port = process.env.PAYMENT_SERVICE_PORT || 3003;

  app.enableCors();
  
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  app.setGlobalPrefix(globalPrefix);
  await app.listen(port);
  
  Logger.log(
    `🚀 Payment Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📊 Health check: http://localhost:${port}/${globalPrefix}/health`
  );
}

bootstrap();
```

### 5. Create Module

Create `apps/payment-service/src/payment.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { PaymentController } from './presentation/payment.controller';
import { CommandHandlers } from './application/commands/payment.handlers';
import { QueryHandlers } from './application/queries/payment.handlers';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CqrsModule,
  ],
  controllers: [PaymentController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class PaymentModule {}
```

### 6. Add Watch Mode Scripts

Edit `package.json` to add watch scripts:

```json
{
  "scripts": {
    "watch:payment": "tsc --build apps/payment-service/tsconfig.app.json --watch",
    "start:payment": "nodemon --watch dist/apps/payment-service --watch dist/libs dist/apps/payment-service/src/main.js",
    "dev:payment:watch": "concurrently \"yarn watch:libs\" \"yarn watch:payment\" \"yarn start:payment\"",
    "dev:payment": "npx nx serve payment-service"
  }
}
```

### 7. Update Main Dev Script (Optional)

To include the new service in `yarn dev`, edit `package.json`:

```json
{
  "scripts": {
    "dev": "concurrently --names \"LIBS,ORDER,GATEWAY,ADMIN,PAYMENT,ORDER-APP,GATEWAY-APP,ADMIN-APP,PAYMENT-APP\" -c \"bgBlue.bold,bgGreen.bold,bgMagenta.bold,bgCyan.bold,bgYellow.bold,green,magenta,cyan,yellow\" \"yarn watch:libs\" \"yarn watch:order\" \"yarn watch:gateway\" \"yarn watch:admin\" \"yarn watch:payment\" \"yarn start:order\" \"yarn start:gateway\" \"yarn start:admin\" \"yarn start:payment\""
  }
}
```

### 8. Add to Docker Compose (Optional)

Edit `docker-compose.dev.yml`:

```yaml
services:
  payment-service:
    build:
      context: .
      dockerfile: apps/payment-service/Dockerfile
    ports:
      - "3003:3003"
    environment:
      - PAYMENT_SERVICE_PORT=3003
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=payment_service
      - REDIS_HOST=redis
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    depends_on:
      - postgres
      - redis
      - rabbitmq
    volumes:
      - ./apps/payment-service:/app/apps/payment-service
      - ./libs:/app/libs
```

### 9. Create Dockerfile

Create `apps/payment-service/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN npx nx build payment-service --prod

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/payment-service ./dist/apps/payment-service
COPY --from=builder /app/dist/libs ./dist/libs
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3003
CMD ["node", "dist/apps/payment-service/src/main.js"]
```

## Running Your New Service

### Development with HMR
```bash
# Individual service
yarn dev:payment:watch

# All services including new one
yarn dev
```

### Build and Run
```bash
# Build
npx nx build payment-service

# Run
npx nx serve payment-service
```

### Docker
```bash
docker-compose up payment-service
```

## Example Implementation

### Domain Layer

**`apps/payment-service/src/domain/payment.aggregate.ts`**:
```typescript
import { AggregateRoot, DomainEvent } from '@flexobo/core';

export class Payment extends AggregateRoot {
  private constructor(
    id: string,
    private orderId: string,
    private amount: number,
    private currency: string,
    private status: 'PENDING' | 'COMPLETED' | 'FAILED'
  ) {
    super(id);
  }

  static create(id: string, orderId: string, amount: number, currency: string): Payment {
    const payment = new Payment(id, orderId, amount, currency, 'PENDING');
    payment.applyEvent({
      type: 'PaymentCreated',
      aggregateId: id,
      aggregateType: 'Payment',
      data: { orderId, amount, currency },
    });
    return payment;
  }

  complete(): void {
    if (this.status !== 'PENDING') {
      throw new Error('Only pending payments can be completed');
    }
    this.status = 'COMPLETED';
    this.applyEvent({
      type: 'PaymentCompleted',
      aggregateId: this.id,
      aggregateType: 'Payment',
      data: { orderId: this.orderId },
    });
  }

  protected applyEvent(event: DomainEvent): void {
    super.applyEvent(event);
    
    switch (event.type) {
      case 'PaymentCreated':
        this.orderId = event.data.orderId;
        this.amount = event.data.amount;
        this.currency = event.data.currency;
        this.status = 'PENDING';
        break;
      case 'PaymentCompleted':
        this.status = 'COMPLETED';
        break;
    }
  }
}
```

### Application Layer

**`apps/payment-service/src/application/commands/payment.commands.ts`**:
```typescript
import { ICommand } from '@flexobo/core';

export class ProcessPaymentCommand implements ICommand {
  public readonly paymentId: string;
  public readonly orderId: string;
  public readonly amount: number;
  public readonly currency: string;

  constructor(...args: unknown[]) {
    this.paymentId = args[0] as string;
    this.orderId = args[1] as string;
    this.amount = args[2] as number;
    this.currency = args[3] as string;
  }
}
```

**`apps/payment-service/src/application/commands/payment.handlers.ts`**:
```typescript
import { CommandHandler, ICommandHandler, Result, Success } from '@flexobo/core';
import { ProcessPaymentCommand } from './payment.commands';
import { Payment } from '../../domain/payment.aggregate';

@CommandHandler(ProcessPaymentCommand)
export class ProcessPaymentHandler
  implements ICommandHandler<ProcessPaymentCommand, void>
{
  async execute(command: ProcessPaymentCommand): Promise<Result<void, Error>> {
    try {
      const payment = Payment.create(
        command.paymentId,
        command.orderId,
        command.amount,
        command.currency
      );
      
      // Process payment logic here
      payment.complete();
      
      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

export const CommandHandlers = [ProcessPaymentHandler];
```

### Presentation Layer

**`apps/payment-service/src/presentation/payment.controller.ts`**:
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ProcessPaymentCommand } from '../application/commands/payment.commands';

@Controller('payments')
export class PaymentController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async processPayment(
    @Body() body: { orderId: string; amount: number; currency: string }
  ) {
    const paymentId = `payment-${Date.now()}`;
    const command = new ProcessPaymentCommand(
      paymentId,
      body.orderId,
      body.amount,
      body.currency
    );
    
    const result = await this.commandBus.execute(command);
    
    if (result.isFailure) {
      throw result.error;
    }
    
    return { paymentId, status: 'processed' };
  }
}
```

## Testing Your Service

```bash
# Unit tests
npx nx test payment-service

# E2E tests
npx nx e2e payment-service-e2e

# Manual test
curl -X POST http://localhost:3003/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-123",
    "amount": 99.99,
    "currency": "USD"
  }'
```

## Checklist

- [ ] Generate service with Nx
- [ ] Configure `project.json` with correct executors
- [ ] Create hexagonal architecture folders
- [ ] Implement domain layer (aggregates, events)
- [ ] Implement application layer (commands, queries, handlers)
- [ ] Implement presentation layer (controllers)
- [ ] Add watch scripts to `package.json`
- [ ] Update main `dev` script (optional)
- [ ] Create Dockerfile
- [ ] Add to docker-compose (optional)
- [ ] Test build: `npx nx build payment-service`
- [ ] Test serve: `yarn dev:payment:watch`
- [ ] Test HMR by editing files

## Next Steps

- Add health checks
- Integrate with Event Store
- Add API versioning
- Implement authentication
- Add OpenTelemetry observability
- Create E2E tests
- Document API endpoints

## References

- [Order Service Example](./ORDER-SERVICE.md)
- [Architecture Guide](./README.md)
- [HMR Setup](./HMR-GUIDE.md)
