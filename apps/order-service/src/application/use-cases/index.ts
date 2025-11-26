/**
 * Use Cases
 *
 * Use cases orchestrate complex business operations that span multiple
 * commands, queries, or aggregates.
 *
 * When to use Use Cases vs Command Handlers:
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Command Handler                    │ Use Case                       │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ Single aggregate operation         │ Multi-aggregate orchestration  │
 * │ Simple CRUD                        │ Complex workflows              │
 * │ Direct domain logic               │ Cross-cutting concerns          │
 * │ One command → one change          │ Saga-like coordination          │
 * │ e.g., CreateOrder, AddItem        │ e.g., Checkout, ProcessRefund  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Use Cases can:
 * - Call multiple commands
 * - Query data before executing commands
 * - Handle compensation/rollback on failures
 * - Coordinate with external services
 * - Implement complex business rules
 */

export * from './checkout.use-case';
