# Admin Panel Feature Documentation

## Overview

The Admin Panel provides platform administrators with tools to manage users, companies, reference data, notifications, and system configuration. It includes role-based access control with `ADMIN` and `SUPERADMIN` roles.

---

## Role Hierarchy

```typescript
enum Role {
  USER = 'user',           // Regular platform user
  ADMIN = 'admin',         // Platform administrator
  SUPERADMIN = 'superadmin', // Super administrator (highest privileges)
}
```

**Access Levels:**
- `USER` - Standard platform access
- `ADMIN` - Reference data management, user/company verification, notifications
- `SUPERADMIN` - All ADMIN permissions + system configuration, global roles

---

## Authentication

### Admin Login

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/admin/signin` | Admin-specific login |

**Request:**
```json
{
  "email": "admin@flexobo.com",
  "password": "AdminSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "admin_user_id",
      "fio": "Admin User",
      "email": "admin@flexobo.com",
      "role": "admin",
      "status": "active"
    }
  }
}
```

---

## User Management

### Endpoints

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/user` | List all users with pagination | ADMIN |
| GET | `/api/user/export` | Export users to Excel | ADMIN |
| GET | `/api/user/:id` | Get user details | ADMIN |
| PUT | `/api/user/:id` | Update user | ADMIN |
| POST | `/api/user/:id/verify` | Verify user | ADMIN |
| POST | `/api/user/:id/reject` | Reject user | ADMIN |
| DELETE | `/api/user/:id` | Delete user | ADMIN |

### GET /api/user (List Users)

**Query Parameters:**
```
page=1
limit=20
status=active|inactive|suspended|blocked
verify_status=pending|verified|rejected
role=user|admin|superadmin
search=john                    // Search by name, phone, email
country=country_id
created_from=2024-01-01
created_to=2024-12-31
sort_by=created_at
sort_order=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "user_id",
        "user_unique_id": "USR-2024-001",
        "fio": "John Doe",
        "phone_number": "+998901234567",
        "email": "john@example.com",
        "country": {
          "_id": "country_id",
          "name": { "en": "Uzbekistan" }
        },
        "role": "user",
        "status": "active",
        "verify_status": "verified",
        "active_company_id": {
          "_id": "company_id",
          "company_name": "Transport Co"
        },
        "platform": "web",
        "created_at": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1250,
      "page": 1,
      "limit": 20,
      "pages": 63
    }
  }
}
```

### GET /api/user/export (Export to Excel)

**Query Parameters:**
```
created_from=2024-01-01
created_to=2024-12-31
status=active
```

**Response:** StreamableFile (Excel .xlsx format)

**Excel Columns:**
- User ID
- Full Name
- Phone Number
- Email
- Country
- City
- Role
- Status
- Verification Status
- Company
- Platform
- Registration Date

### PUT /api/user/:id (Update User)

**Request:**
```json
{
  "fio": "John Doe Updated",
  "status": "suspended",
  "status_reason": "Violation of terms of service",
  "role": "user",
  "verify_status": "verified"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "fio": "John Doe Updated",
    "status": "suspended",
    "status_history": [
      {
        "status": "active",
        "changedAt": "2024-01-15T10:00:00Z"
      },
      {
        "status": "suspended",
        "reason": "Violation of terms of service",
        "changedBy": "admin_user_id",
        "changedAt": "2024-03-01T14:00:00Z"
      }
    ]
  }
}
```

### POST /api/user/:id/verify

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "verify_status": "verified",
    "updated_at": "2024-03-01T14:00:00Z"
  }
}
```

### POST /api/user/:id/reject

**Request:**
```json
{
  "reason": "Incomplete documentation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "verify_status": "rejected",
    "updated_at": "2024-03-01T14:00:00Z"
  }
}
```

---

## Company Management

### Endpoints

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/company` | List all companies | Public |
| GET | `/api/company/:id` | Get company details | Public |
| POST | `/api/company/:id/verify` | Verify company | ADMIN |
| POST | `/api/company/:id/reject` | Reject company | ADMIN |
| PUT | `/api/company/:id` | Update company | ADMIN |
| DELETE | `/api/company/:id` | Delete company | ADMIN |
| POST | `/api/company/:id/members` | Add members | ADMIN |
| DELETE | `/api/company/:id/members/:member_id` | Remove member | ADMIN |

### GET /api/company (List Companies)

**Query Parameters:**
```
page=1
limit=20
status=active|suspended|inactive
verify_status=pending|verified|rejected
company_type=company_type_id
country=country_id
search=transport              // Search by company name
sort_by=created_at
sort_order=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "company_id",
        "company_unique_id": "CMP-2024-001",
        "company_name": "Fast Transport LLC",
        "company_type": {
          "_id": "type_id",
          "name": { "en": "Carrier" }
        },
        "owner": {
          "_id": "user_id",
          "fio": "John Smith"
        },
        "country": {
          "_id": "country_id",
          "name": { "en": "Uzbekistan" }
        },
        "status": "active",
        "verify_status": "pending",
        "rating": 4.5,
        "count_ratings": 25,
        "members": ["user_id_1", "user_id_2"],
        "created_at": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 350,
      "page": 1,
      "limit": 20,
      "pages": 18
    }
  }
}
```

### POST /api/company/:id/verify

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "company_id",
    "company_name": "Fast Transport LLC",
    "verify_status": "verified",
    "updated_at": "2024-03-01T14:00:00Z"
  }
}
```

### POST /api/company/:id/reject

**Request:**
```json
{
  "reason": "Invalid business license"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "company_id",
    "verify_status": "rejected",
    "status_history": [
      {
        "status": "rejected",
        "reason": "Invalid business license",
        "changedBy": "admin_user_id",
        "changedAt": "2024-03-01T14:00:00Z"
      }
    ]
  }
}
```

---

## Reference Data Management

All reference data follows the same CRUD pattern with admin-only write access.

### Common Reference Data Structure

```typescript
interface ReferenceData {
  _id: string;
  name: {
    en: string;
    ru: string;
    uz: string;
  };
  description?: {
    en: string;
    ru: string;
    uz: string;
  };
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Countries

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/country` | List countries | Public |
| GET | `/api/country/:id` | Get country | Public |
| POST | `/api/country` | Create country | ADMIN |
| PUT | `/api/country/:id` | Update country | ADMIN |
| DELETE | `/api/country/:id` | Delete country | ADMIN |

**POST /api/country Request:**
```json
{
  "name": {
    "en": "Kazakhstan",
    "ru": "Казахстан",
    "uz": "Qozog'iston"
  },
  "code": "KZ",
  "phone_code": "+7",
  "is_active": true
}
```

### Currencies

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/currency` | List currencies | Public |
| GET | `/api/currency/all` | List all currencies | Public |
| GET | `/api/currency/:id` | Get currency | Public |
| POST | `/api/currency` | Create currency | ADMIN |
| PUT | `/api/currency/:id` | Update currency | ADMIN |
| DELETE | `/api/currency/:id` | Delete currency | ADMIN |
| POST | `/api/currency/convert` | Convert amount | Public |

**POST /api/currency Request:**
```json
{
  "name": "US Dollar",
  "code": "USD",
  "symbol": "$",
  "rate": 1.0,
  "is_active": true
}
```

**POST /api/currency/convert Request:**
```json
{
  "amount": 1000,
  "from": "USD",
  "to": "EUR"
}
```

### Transport Types

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/transport-types` | List transport types | Public |
| GET | `/api/transport-types/all` | List all (no pagination) | Public |
| POST | `/api/transport-types` | Create transport type | ADMIN |
| PUT | `/api/transport-types/:id` | Update transport type | ADMIN |
| DELETE | `/api/transport-types/:id` | Delete transport type | ADMIN |

**POST /api/transport-types Request:**
```json
{
  "name": {
    "en": "Refrigerator Truck",
    "ru": "Рефрижератор",
    "uz": "Refrijerator"
  },
  "description": {
    "en": "Temperature-controlled truck",
    "ru": "Грузовик с температурным контролем",
    "uz": "Harorat nazorati bilan yuk mashinasi"
  },
  "is_active": true
}
```

### Load Types (Cargo Types)

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/load-types` | List load types | Public |
| GET | `/api/load-types/all` | List all | Public |
| POST | `/api/load-types` | Create load type | ADMIN |
| PUT | `/api/load-types/:id` | Update load type | ADMIN |
| DELETE | `/api/load-types/:id` | Delete load type | ADMIN |

### Loading Types

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/loading-types` | List loading types | Public |
| POST | `/api/loading-types` | Create loading type | ADMIN |
| PUT | `/api/loading-types/:id` | Update loading type | ADMIN |
| DELETE | `/api/loading-types/:id` | Delete loading type | ADMIN |

### Transport Loading Types

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/transport-loading-type` | List | Public |
| GET | `/api/transport-loading-type/all` | List all | Public |
| POST | `/api/transport-loading-type` | Create | ADMIN |
| PUT | `/api/transport-loading-type/:id` | Update | ADMIN |
| DELETE | `/api/transport-loading-type/:id` | Delete | ADMIN |

### ADR Classes (Dangerous Goods)

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/adr` | List ADR classes | Public |
| GET | `/api/adr/all` | List all | Public |
| POST | `/api/adr` | Create ADR class | ADMIN |
| PUT | `/api/adr/:id` | Update ADR class | ADMIN |
| DELETE | `/api/adr/:id` | Delete ADR class | ADMIN |

**Standard ADR Classes:**
- Class 1: Explosives
- Class 2: Gases
- Class 3: Flammable Liquids
- Class 4: Flammable Solids
- Class 5: Oxidizing Substances
- Class 6: Toxic Substances
- Class 7: Radioactive Materials
- Class 8: Corrosive Substances
- Class 9: Miscellaneous

### Transport Permits

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/permit` | List permits | Public |
| GET | `/api/permit/all` | List all | Public |
| POST | `/api/permit` | Create permit | ADMIN |
| PUT | `/api/permit/:id` | Update permit | ADMIN |
| DELETE | `/api/permit/:id` | Delete permit | ADMIN |

**Common Permits:**
- TIR Carnet
- CMR
- EKMT/CEMT
- Bilateral Permits
- Transit Permits

### Company Types

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/company-type` | List company types | Public |
| POST | `/api/company-type` | Create company type | ADMIN |
| PUT | `/api/company-type/:id` | Update company type | ADMIN |
| DELETE | `/api/company-type/:id` | Delete company type | ADMIN |

**Common Company Types:**
- Carrier
- Shipper
- Freight Forwarder
- Logistics Provider
- Broker

### Languages

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/languages` | List languages | Public |
| POST | `/api/languages` | Create language | ADMIN |
| PUT | `/api/languages/:id` | Update language | ADMIN |
| DELETE | `/api/languages/:id` | Delete language | ADMIN |

---

## Dashboard & Statistics

### Endpoints

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/statistics/all` | Main statistics | Public |
| GET | `/api/statistics/active-users` | Active users stats | ADMIN |
| GET | `/api/statistics/cargo-transport-types` | Popular types | ADMIN |
| GET | `/api/statistics/valued-directions` | Top routes by value | ADMIN |
| GET | `/api/statistics/search-analytics` | Search analytics | ADMIN |
| GET | `/api/statistics/search-directions` | Popular search routes | ADMIN |
| GET | `/api/statistics/search-load-types` | Popular load types | ADMIN |
| GET | `/api/statistics/search-transport-types` | Popular transport types | ADMIN |
| GET | `/api/statistics/search-trends` | Search trends | ADMIN |

### GET /api/statistics/all

**Query Parameters:**
```
startDate=2024-01-01
endDate=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 5420,
    "total_companies": 1250,
    "total_loads": 15600,
    "total_trips": 8400,
    "total_bookings": 3200,
    "total_revenue": {
      "USD": 2500000,
      "EUR": 1800000
    },
    "active_loads": 450,
    "active_trips": 280,
    "pending_verifications": {
      "users": 45,
      "companies": 12
    }
  }
}
```

### GET /api/statistics/active-users

**Query Parameters:**
```
startDate=2024-01-01
endDate=2024-03-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_active": 2150,
    "by_activity": {
      "posted_loads": 850,
      "posted_trips": 420,
      "searched": 1800,
      "saved_searches": 350,
      "placed_bids": 1200
    },
    "by_platform": {
      "web": 1500,
      "mobile": 550,
      "telegram": 100
    },
    "daily_active": [
      { "date": "2024-03-01", "count": 180 },
      { "date": "2024-03-02", "count": 165 }
    ]
  }
}
```

### GET /api/statistics/valued-directions

**Query Parameters:**
```
period=month|quarter|custom
level=country|city
startDate=2024-01-01
endDate=2024-03-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "top_directions": [
      {
        "from": { "country": "UZ", "city": "Tashkent" },
        "to": { "country": "RU", "city": "Moscow" },
        "total_value": 850000,
        "currency": "USD",
        "load_count": 245,
        "avg_price": 3469
      },
      {
        "from": { "country": "KZ", "city": "Almaty" },
        "to": { "country": "DE", "city": "Berlin" },
        "total_value": 720000,
        "currency": "USD",
        "load_count": 180,
        "avg_price": 4000
      }
    ]
  }
}
```

### GET /api/statistics/search-trends

**Query Parameters:**
```
period=month
granularity=day|week|month
startDate=2024-01-01
endDate=2024-03-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "date": "2024-03-01",
        "total_searches": 1250,
        "load_searches": 800,
        "trip_searches": 450
      },
      {
        "date": "2024-03-02",
        "total_searches": 1180,
        "load_searches": 750,
        "trip_searches": 430
      }
    ],
    "growth": {
      "week_over_week": 5.2,
      "month_over_month": 12.8
    }
  }
}
```

---

## Global Role Management

### Endpoints

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/role/admin/global` | List global roles | ADMIN |
| GET | `/api/role/admin/global/:id` | Get global role | ADMIN |
| POST | `/api/role/admin/global` | Create global role | ADMIN |
| PUT | `/api/role/admin/global/:id` | Update global role | ADMIN |

### Global Role Structure

```typescript
interface GlobalRole {
  _id: string;
  name: string;
  description: string;
  permissions: {
    entity: ENTITIES;
    actions: CRUD_PERMISSIONS[];
  }[];
  page_permissions: {
    page: PAGES;
    actions: PAGE_PERMISSIONS[];
  }[];
  is_system: boolean;  // Cannot be deleted
  created_at: Date;
  updated_at: Date;
}

enum ENTITIES {
  LOAD = 'LOAD',
  TRUCK = 'TRUCK',
  TRIP = 'TRIP',
  BID = 'BID',
  BOOKING = 'BOOKING',
  USER = 'USER',
  COMPANY = 'COMPANY',
  ROLE = 'ROLE',
  CHAT = 'CHAT',
  NOTIFICATION = 'NOTIFICATION',
  BOARD = 'BOARD',
}

enum CRUD_PERMISSIONS {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

enum PAGES {
  DASHBOARD = 'DASHBOARD',
  ANALYTICS = 'ANALYTICS',
  REPORTS = 'REPORTS',
  FINANCE = 'FINANCE',
  SETTINGS = 'SETTINGS',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  LOAD_BOARD = 'LOAD_BOARD',
  DOCUMENTS = 'DOCUMENTS',
  NOTIFICATIONS = 'NOTIFICATIONS',
}

enum PAGE_PERMISSIONS {
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  CONFIGURE = 'CONFIGURE',
}
```

### POST /api/role/admin/global (Create Global Role)

**Request:**
```json
{
  "name": "Support Agent",
  "description": "Customer support role with read access",
  "permissions": [
    { "entity": "USER", "actions": ["READ"] },
    { "entity": "COMPANY", "actions": ["READ"] },
    { "entity": "LOAD", "actions": ["READ"] },
    { "entity": "TRIP", "actions": ["READ"] },
    { "entity": "BID", "actions": ["READ"] },
    { "entity": "BOOKING", "actions": ["READ"] },
    { "entity": "CHAT", "actions": ["READ"] }
  ],
  "page_permissions": [
    { "page": "DASHBOARD", "actions": ["VIEW"] },
    { "page": "USER_MANAGEMENT", "actions": ["VIEW"] }
  ]
}
```

### PUT /api/role/admin/global/:id (Update with Propagation)

**Query Parameters:**
```
propagate=true   // Propagate changes to all companies using this role
```

**Request:**
```json
{
  "permissions": [
    { "entity": "USER", "actions": ["READ", "UPDATE"] }
  ]
}
```

---

## Notification Management

### Endpoints

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/notification/all` | List all notifications | ADMIN |
| POST | `/api/notification/send` | Send notification | ADMIN |
| POST | `/api/notification/send-with-token` | Send with user token | ADMIN |
| PUT | `/api/notification/:id` | Update notification | ADMIN |
| DELETE | `/api/notification/:id` | Delete notification | ADMIN |
| POST | `/api/notification/test-expiration-check` | Test expiration | ADMIN |
| GET | `/api/notification/expiration-stats` | Expiration stats | ADMIN |

### GET /api/notification/all

**Query Parameters:**
```
page=1
limit=20
type=system|user|expiration|bid|booking
status=sent|delivered|read|failed
user_id=user_id
created_from=2024-01-01
created_to=2024-03-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "notification_id",
        "type": "system",
        "title": "System Maintenance",
        "body": "Platform will be under maintenance on March 5th",
        "recipient": {
          "_id": "user_id",
          "fio": "John Doe"
        },
        "status": "delivered",
        "sent_at": "2024-03-01T10:00:00Z",
        "delivered_at": "2024-03-01T10:00:05Z",
        "read_at": null
      }
    ],
    "pagination": {
      "total": 5420,
      "page": 1,
      "limit": 20
    }
  }
}
```

### POST /api/notification/send

**Request:**
```json
{
  "type": "system",
  "title": "Important Update",
  "body": "New features have been released",
  "recipients": ["user_id_1", "user_id_2"],
  "send_to_all": false,
  "filters": {
    "role": "user",
    "status": "active",
    "country": "country_id"
  },
  "channels": ["push", "email", "telegram"],
  "scheduled_at": "2024-03-05T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notification_id": "batch_notification_id",
    "recipients_count": 2,
    "scheduled_at": "2024-03-05T10:00:00Z",
    "status": "scheduled"
  }
}
```

### GET /api/notification/expiration-stats

**Response:**
```json
{
  "success": true,
  "data": {
    "expiring_today": {
      "loads": 45,
      "trips": 23
    },
    "expiring_this_week": {
      "loads": 180,
      "trips": 95
    },
    "expired_last_24h": {
      "loads": 32,
      "trips": 18
    },
    "notifications_sent": {
      "today": 156,
      "this_week": 890
    }
  }
}
```

---

## Platform Settings

### Endpoints

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| GET | `/api/platform-settings` | Get settings | Public |
| POST | `/api/platform-settings` | Create/Update settings | ADMIN |
| DELETE | `/api/platform-settings` | Delete settings | ADMIN |

### Platform Settings Structure

```typescript
interface PlatformSettings {
  _id: string;

  // General
  platform_name: string;
  support_email: string;
  support_phone: string;

  // Features
  features: {
    registration_enabled: boolean;
    email_verification_required: boolean;
    phone_verification_required: boolean;
    company_verification_required: boolean;
    telegram_auth_enabled: boolean;
  };

  // Limits
  limits: {
    max_loads_per_user: number;
    max_trips_per_user: number;
    max_transports_per_user: number;
    max_bids_per_load: number;
    otp_expiry_minutes: number;
    otp_max_attempts: number;
  };

  // Pricing
  pricing: {
    default_currency: string;
    supported_currencies: string[];
    commission_percentage: number;
  };

  // Notifications
  notifications: {
    expiration_warning_days: number;
    enable_email_notifications: boolean;
    enable_push_notifications: boolean;
    enable_telegram_notifications: boolean;
  };

  // Maintenance
  maintenance: {
    enabled: boolean;
    message: string;
    allowed_ips: string[];
  };

  updated_at: Date;
  updated_by: string;
}
```

### POST /api/platform-settings

**Request:**
```json
{
  "platform_name": "Flexobo",
  "support_email": "support@flexobo.com",
  "features": {
    "registration_enabled": true,
    "email_verification_required": false,
    "phone_verification_required": true,
    "company_verification_required": true,
    "telegram_auth_enabled": true
  },
  "limits": {
    "max_loads_per_user": 100,
    "max_trips_per_user": 100,
    "max_transports_per_user": 50,
    "max_bids_per_load": 50,
    "otp_expiry_minutes": 5,
    "otp_max_attempts": 3
  },
  "notifications": {
    "expiration_warning_days": 3,
    "enable_email_notifications": true,
    "enable_push_notifications": true,
    "enable_telegram_notifications": true
  }
}
```

---

## Audit & Logging

### Status History Tracking

Both users and companies maintain status history:

```typescript
interface StatusHistoryEntry {
  status: string;
  reason?: string;
  changedBy: string;  // Admin user ID
  changedAt: Date;
}

// Automatically tracked on status changes
user.status_history.push({
  status: newStatus,
  reason: statusReason,
  changedBy: adminUserId,
  changedAt: new Date(),
});
```

### Request Logging

All HTTP requests are logged with:

```typescript
interface RequestLog {
  method: string;
  url: string;
  status_code: number;
  content_length: number;
  user_agent: string;
  ip_address: string;
  user_id?: string;
  timestamp: Date;
  response_time_ms: number;
}
```

---

## Admin Panel UI Components

| Component | Purpose |
|-----------|---------|
| `AdminDashboard.tsx` | Main dashboard with statistics |
| `UserManagement.tsx` | User list with filters, actions |
| `UserDetail.tsx` | User detail view with status history |
| `CompanyManagement.tsx` | Company list with verification actions |
| `CompanyDetail.tsx` | Company detail with members, documents |
| `ReferenceDataManager.tsx` | CRUD for reference data |
| `RoleManager.tsx` | Global role management |
| `NotificationCenter.tsx` | Send and manage notifications |
| `PlatformSettings.tsx` | Platform configuration |
| `StatisticsCharts.tsx` | Charts for analytics |
| `AuditLog.tsx` | View activity logs |
| `ExportDialog.tsx` | Export data to Excel |

---

## Admin Flow Diagrams

### User Verification Flow

```
Admin Panel                           Backend
   │                                     │
   ├─GET /api/user?verify_status=pending─►│
   │◄────────────pending users───────────┤
   │                                     │
   │   [Admin reviews user documents]    │
   │                                     │
   │   [If approved]                     │
   ├─POST /api/user/:id/verify──────────►│
   │◄────────────verified────────────────┤
   │                                     │
   │   [If rejected]                     │
   ├─POST /api/user/:id/reject──────────►│
   │   {reason: "..."}                   │
   │◄────────────rejected────────────────┤
   │                                     │
   │   [User notified via email/push]    │
```

### Company Verification Flow

```
Admin Panel                           Backend
   │                                     │
   ├─GET /api/company?verify_status=pending─►│
   │◄────────────pending companies───────┤
   │                                     │
   │   [Admin reviews company documents] │
   │   - Business license                │
   │   - Registration certificate        │
   │   - DOT/MC number verification      │
   │                                     │
   │   [If approved]                     │
   ├─POST /api/company/:id/verify───────►│
   │◄────────────verified────────────────┤
   │                                     │
   │   [If rejected]                     │
   ├─POST /api/company/:id/reject───────►│
   │   {reason: "Invalid license"}       │
   │◄────────────rejected────────────────┤
```

### Reference Data Management Flow

```
Admin Panel                           Backend
   │                                     │
   │   [View existing data]              │
   ├─GET /api/transport-types───────────►│
   │◄────────────transport types─────────┤
   │                                     │
   │   [Add new type]                    │
   ├─POST /api/transport-types──────────►│
   │   {name: {...}, is_active: true}    │
   │◄────────────created─────────────────┤
   │                                     │
   │   [Update existing]                 │
   ├─PUT /api/transport-types/:id───────►│
   │   {name: {...}}                     │
   │◄────────────updated─────────────────┤
   │                                     │
   │   [Deactivate (soft delete)]        │
   ├─PUT /api/transport-types/:id───────►│
   │   {is_active: false}                │
   │◄────────────deactivated─────────────┤
```

---

## Security Considerations

1. **Role-Based Guards**: All admin endpoints protected by `@Roles(Role.ADMIN)` or `@Roles(Role.SUPERADMIN)`
2. **Audit Trail**: All status changes tracked with timestamp and admin ID
3. **IP Whitelisting**: Optional IP restrictions for admin access in platform settings
4. **Session Management**: Admin sessions can be invalidated remotely
5. **Two-Factor Authentication**: Recommended for admin accounts
6. **Rate Limiting**: Stricter rate limits on admin endpoints
7. **Action Logging**: All admin actions logged for audit purposes
