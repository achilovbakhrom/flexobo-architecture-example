# Company Management Feature Documentation

## Overview

The Company feature enables organizations to manage their logistics business on the platform. It includes company registration, verification, team management, role-based access control, and rating systems.

---

## Data Models

### Company Schema (MongoDB)

```typescript
{
  _id: ObjectId,

  // Identification
  company_unique_id: string,        // Unique identifier (indexed)
  dot_mc: string,                   // DOT/MC number (US regulatory)

  // Basic Info
  owner: ObjectId,                  // ref: User - Company founder
  company_name: string,
  company_description: string,
  avatar: string,                   // Company logo URL

  // Classification
  company_type: ObjectId,           // ref: CompanyType

  // Contact
  phone_number: string,
  email: string,

  // Location
  country: ObjectId,                // ref: Country
  city: string,

  // Team
  members: ObjectId[],              // ref: User[] - Team members

  // Status
  status: CompanyStatus,
  status_history: [{
    status: CompanyStatus,
    reason: string,
    changedBy: ObjectId,
    changedAt: Date,
  }],

  // Verification
  verify_status: VerifyStatus,
  is_legal_entity: boolean,

  // Ratings
  rating: number,                   // 1-5 average
  count_ratings: number,

  // Documents
  documents: [{
    type: string,                   // 'certificate', 'license', 'passport'
    url: string,
    name: string,
  }],

  // Timestamps
  created_at: Date,
  updated_at: Date,
}
```

### CompanyUser Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  company: ObjectId,                // ref: Company
  user: ObjectId,                   // ref: User
  roles: ObjectId[],                // ref: Role[]
  status: 'active' | 'invited' | 'removed',
  invited_by: ObjectId,             // ref: User
  joined_at: Date,
  created_at: Date,
  updated_at: Date,
}
```

### Role Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  company: ObjectId,                // ref: Company
  name: string,
  permissions: [{
    entity: string,                 // 'LOAD', 'TRIP', 'TRUCK', etc.
    actions: string[],              // ['CREATE', 'READ', 'UPDATE', 'DELETE']
  }],
  is_default: boolean,
  created_at: Date,
  updated_at: Date,
}
```

### Enums

```typescript
enum CompanyStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

enum VerifyStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

enum ENTITIES {
  LOAD = 'LOAD',
  TRIP = 'TRIP',
  TRUCK = 'TRUCK',
  BOARD = 'BOARD',
  ROLE = 'ROLE',
  USER = 'USER',
  COMPANY = 'COMPANY',
  BOOKING = 'BOOKING',
}

enum CRUD_ACTIONS {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}
```

### Frontend Type Definitions

```typescript
interface Company {
  _id: string;
  company_unique_id: string;
  dot_mc?: string;
  owner: {
    _id: string;
    fio: string;
    phone_number: string;
  };
  company_name: string;
  company_description?: string;
  avatar?: string;
  company_type: ICompanyType;
  phone_number: string;
  email?: string;
  country: ICountry;
  city?: string;
  members: string[];
  status: CompanyStatus;
  verify_status: VerifyStatus;
  is_legal_entity: boolean;
  rating: number;
  count_ratings: number;
  documents: IDocument[];
  created_at: string;
  updated_at: string;
}

interface CompanyRole {
  _id: string;
  company: string;
  name: string;
  permissions: IPermission[];
  is_default: boolean;
  created_at: string;
}

interface IPermission {
  entity: ENTITIES;
  actions: CRUD_ACTIONS[];
}

interface CompanyUser {
  _id: string;
  user: {
    _id: string;
    fio: string;
    phone_number: string;
    email?: string;
    avatar?: string;
  };
  roles: CompanyRole[];
  status: string;
  joined_at: string;
}
```

---

## REST API Endpoints

### Company CRUD

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/company` | List all companies | No |
| GET | `/company/:id` | Get company details | No |
| GET | `/company/me` | Get my company | Yes |
| POST | `/company/me` | Create/apply for company | Yes |
| POST | `/company` | Create company (admin) | Yes |
| PUT | `/company` | Update my company | Yes |
| PUT | `/company/:id` | Update company | Yes |
| DELETE | `/company/:id` | Delete company | Yes |

### Company Stats & Ratings

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/company/:id/stats` | Get company statistics | No |
| GET | `/company/:id/ratings` | Get company rating details | No |
| GET | `/company/:id/bookings` | Get company booking history | Yes |

### Member Management

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/role/company-users/:companyId` | Get company team members | Yes |
| POST | `/role/assign-by-phone/:companyId` | Invite user by phone | Yes |
| POST | `/role/assign-by-email/:companyId` | Invite user by email | Yes |
| DELETE | `/role/remove-user/:companyId/:userId` | Remove team member | Yes |

### Role Management

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/role/company/:companyId` | Get all roles | Yes |
| GET | `/role/company/:companyId/:roleId` | Get role details | Yes |
| POST | `/role/company/:companyId` | Create role | Yes |
| PUT | `/role/company/:companyId/:roleId` | Update role | Yes |
| DELETE | `/role/company/:companyId/:roleId` | Delete role | Yes |
| GET | `/role/permissions/my` | Get my permissions | Yes |

### Verification (Admin)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/company/verify/:id` | Verify company | Admin |
| POST | `/company/reject/:id` | Reject company | Admin |

---

## API Request/Response Examples

### POST /company/me (Apply for Company)

**Request:**
```json
{
  "company_name": "Fast Transport LLC",
  "company_description": "International freight forwarding company",
  "company_type": "company_type_id",
  "phone_number": "+998901234567",
  "email": "info@fasttransport.com",
  "country": "country_id",
  "city": "Tashkent",
  "is_legal_entity": true,
  "dot_mc": "MC-123456",
  "documents": [
    {
      "type": "license",
      "url": "https://storage.example.com/license.pdf",
      "name": "Business License"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "company_id",
    "company_unique_id": "FT-2024-001",
    "company_name": "Fast Transport LLC",
    "status": "active",
    "verify_status": "pending",
    "rating": 0,
    "count_ratings": 0,
    "created_at": "2024-03-01T10:00:00Z"
  }
}
```

### GET /company/:id

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "company_id",
    "company_unique_id": "FT-2024-001",
    "company_name": "Fast Transport LLC",
    "company_description": "International freight forwarding",
    "avatar": "https://storage.example.com/avatar.jpg",
    "owner": {
      "_id": "user_id",
      "fio": "John Smith",
      "phone_number": "+998901234567"
    },
    "company_type": {
      "_id": "type_id",
      "name": { "en": "Carrier", "ru": "Перевозчик" }
    },
    "country": {
      "_id": "country_id",
      "name": { "en": "Uzbekistan" },
      "code": "UZ"
    },
    "city": "Tashkent",
    "status": "active",
    "verify_status": "verified",
    "rating": 4.7,
    "count_ratings": 156,
    "members": ["user_id_1", "user_id_2", "user_id_3"],
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

### POST /role/company/:companyId (Create Role)

**Request:**
```json
{
  "name": "Driver",
  "permissions": [
    {
      "entity": "LOAD",
      "actions": ["READ"]
    },
    {
      "entity": "TRIP",
      "actions": ["READ", "UPDATE"]
    },
    {
      "entity": "TRUCK",
      "actions": ["READ"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "role_id",
    "company": "company_id",
    "name": "Driver",
    "permissions": [
      { "entity": "LOAD", "actions": ["READ"] },
      { "entity": "TRIP", "actions": ["READ", "UPDATE"] },
      { "entity": "TRUCK", "actions": ["READ"] }
    ],
    "is_default": false,
    "created_at": "2024-03-01T10:00:00Z"
  }
}
```

### POST /role/assign-by-phone/:companyId (Invite User)

**Request:**
```json
{
  "phone_number": "+998907654321",
  "roles": ["role_id_1", "role_id_2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "fio": "Mike Driver",
      "phone_number": "+998907654321"
    },
    "roles": ["role_id_1", "role_id_2"],
    "status": "active",
    "joined_at": "2024-03-01T10:00:00Z"
  }
}
```

### GET /role/permissions/my

**Response:**
```json
{
  "success": true,
  "data": {
    "permissions": [
      { "entity": "LOAD", "actions": ["CREATE", "READ", "UPDATE", "DELETE"] },
      { "entity": "TRIP", "actions": ["CREATE", "READ", "UPDATE", "DELETE"] },
      { "entity": "TRUCK", "actions": ["CREATE", "READ", "UPDATE", "DELETE"] },
      { "entity": "BOARD", "actions": ["READ"] },
      { "entity": "USER", "actions": ["READ"] }
    ],
    "is_owner": false
  }
}
```

---

## Frontend-Backend Communication Flow

### 1. Apply for Company

```
Frontend                              Backend
   │                                     │
   │   [User clicks "Create Company"]    │
   │                                     │
   │   [Load reference data]             │
   ├─GET /company-type─────────────────►│
   ├─GET /country──────────────────────►│
   │◄────────────reference data──────────┤
   │                                     │
   │   [User fills form]                 │
   │                                     │
   ├─POST /company/me──────────────────►│
   │   {company data}                    │
   │◄────────────company created─────────┤
   │                                     │
   │   [verify_status = 'pending']       │
```

### 2. View Company Profile

```
Frontend                              Backend
   │                                     │
   ├─GET /company/me───────────────────►│
   │◄────────────my company──────────────┤
   │                                     │
   ├─GET /company/:id/stats────────────►│
   │◄────────────statistics──────────────┤
   │                                     │
   ├─GET /company/:id/ratings──────────►│
   │◄────────────rating details──────────┤
```

### 3. Team Management

```
Frontend                              Backend
   │                                     │
   │   [View team members]               │
   ├─GET /role/company-users/:id───────►│
   │◄────────────team members────────────┤
   │                                     │
   │   [Invite new member]               │
   ├─POST /role/assign-by-phone/:id────►│
   │   {phone_number, roles}             │
   │◄────────────member added────────────┤
   │                                     │
   │   [Remove member]                   │
   ├─DELETE /role/remove-user/:id/:uid─►│
   │◄────────────member removed──────────┤
```

### 4. Role Management

```
Frontend                              Backend
   │                                     │
   │   [View roles]                      │
   ├─GET /role/company/:id─────────────►│
   │◄────────────roles list──────────────┤
   │                                     │
   │   [Create new role]                 │
   ├─POST /role/company/:id────────────►│
   │   {name, permissions}               │
   │◄────────────role created────────────┤
   │                                     │
   │   [Edit role]                       │
   ├─PUT /role/company/:id/:roleId─────►│
   │   {updated permissions}             │
   │◄────────────role updated────────────┤
```

### 5. Permission Check Flow

```
Frontend                              Backend
   │                                     │
   │   [On app load / company switch]    │
   ├─GET /role/permissions/my──────────►│
   │◄────────────my permissions──────────┤
   │                                     │
   │   [Store in context]                │
   │   [Render UI based on permissions]  │
```

---

## State Management (Frontend)

### React Query Hooks

```typescript
// Get my company
const useGetMyCompany = () => {
  return useQuery({
    queryKey: ['company', 'me'],
    queryFn: () => companyAPI.getMyCompany(),
  });
};

// Get company by ID
const useGetCompanyById = (id: string) => {
  return useQuery({
    queryKey: ['company', id],
    queryFn: () => companyAPI.getCompanyById(id),
    enabled: !!id,
  });
};

// Get company stats
const useGetCompanyStats = (id: string) => {
  return useQuery({
    queryKey: ['company', id, 'stats'],
    queryFn: () => companyAPI.getCompanyStats(id),
    enabled: !!id,
  });
};

// Apply for company
const useApplyForCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CompanyCreateRequest) => companyAPI.applyForCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'me'] });
      toast.success(t('company.created'));
    },
  });
};

// Get company users
const useGetCompanyUsers = (companyId: string) => {
  return useQuery({
    queryKey: ['company', companyId, 'users'],
    queryFn: () => companyAPI.getCompanyUsers(companyId),
    enabled: !!companyId,
  });
};

// Get all roles
const useGetAllRoles = (companyId: string) => {
  return useQuery({
    queryKey: ['company', companyId, 'roles'],
    queryFn: () => companyAPI.getAllRoles(companyId),
    enabled: !!companyId,
  });
};

// Create role
const useCreateRole = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RoleCreateRequest) => companyAPI.createRole(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId, 'roles'] });
      toast.success(t('role.created'));
    },
  });
};

// Assign user to company
const useAssignUser = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { phone_number: string; roles: string[] }) =>
      companyAPI.assignUserByPhone(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId, 'users'] });
      toast.success(t('user.invited'));
    },
  });
};

// Remove user from company
const useUnassignUser = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => companyAPI.unassignUser(companyId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId, 'users'] });
      toast.success(t('user.removed'));
    },
  });
};
```

---

## Permission-Based UI Rendering

### Can Component

```typescript
// Permission check component
interface CanProps {
  entity: ENTITIES;
  action: CRUD_ACTIONS;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const Can: React.FC<CanProps> = ({ entity, action, children, fallback = null }) => {
  const { permissions, isOwner } = usePermissions();

  // Owner has all permissions
  if (isOwner) {
    return <>{children}</>;
  }

  // Check specific permission
  const permission = permissions.find(p => p.entity === entity);
  const hasPermission = permission?.actions.includes(action);

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

// Usage
<Can entity={ENTITIES.LOAD} action={CRUD_ACTIONS.CREATE}>
  <Button onClick={createLoad}>Create Load</Button>
</Can>

<Can entity={ENTITIES.USER} action={CRUD_ACTIONS.DELETE}>
  <Button onClick={removeUser}>Remove User</Button>
</Can>
```

### usePermissions Hook

```typescript
const usePermissions = () => {
  const { data } = useQuery({
    queryKey: ['permissions', 'my'],
    queryFn: () => companyAPI.getMyPermissions(),
  });

  return {
    permissions: data?.permissions || [],
    isOwner: data?.is_owner || false,
    hasPermission: (entity: ENTITIES, action: CRUD_ACTIONS) => {
      if (data?.is_owner) return true;
      const permission = data?.permissions.find(p => p.entity === entity);
      return permission?.actions.includes(action) || false;
    },
  };
};
```

### Protected Routes

```typescript
// Route protection based on permissions
const ProtectedRoute: React.FC<{
  entity: ENTITIES;
  action: CRUD_ACTIONS;
  children: React.ReactNode;
}> = ({ entity, action, children }) => {
  const { hasPermission, isOwner } = usePermissions();

  if (!isOwner && !hasPermission(entity, action)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};

// Usage in router
<Route
  path="/loads/create"
  element={
    <ProtectedRoute entity={ENTITIES.LOAD} action={CRUD_ACTIONS.CREATE}>
      <LoadCreatePage />
    </ProtectedRoute>
  }
/>
```

---

## Key Business Logic

### 1. Company Verification Workflow

```
┌─────────────┐
│   PENDING   │ ─── Initial state after company creation
└──────┬──────┘
       │
       ├─── Admin reviews documents
       │
       ▼
┌──────────────────┐          ┌────────────┐
│    VERIFIED      │          │  REJECTED  │
│                  │          │            │
│ - Full platform  │          │ - Limited  │
│   access         │          │   access   │
│ - Badge shown    │          │ - Can fix  │
│                  │          │   & reapply│
└──────────────────┘          └────────────┘
```

### 2. Company Status Management

```typescript
// Backend: Status change with history
async function updateCompanyStatus(
  companyId: string,
  newStatus: CompanyStatus,
  reason: string,
  changedBy: string
) {
  const company = await Company.findById(companyId);

  company.status_history.push({
    status: newStatus,
    reason,
    changedBy,
    changedAt: new Date(),
  });

  company.status = newStatus;
  await company.save();

  // Notify company owner
  await notificationService.send({
    users: [company.owner],
    title: t('company.status_changed'),
    body: t(`company.status.${newStatus}`),
  });
}
```

### 3. Rating Calculation

```typescript
// Company rating aggregation
async function updateCompanyRating(companyId: string, newRating: number) {
  const company = await Company.findById(companyId);

  // Calculate new average
  const newCount = company.count_ratings + 1;
  const newAverage = (
    (company.rating * company.count_ratings) + newRating
  ) / newCount;

  company.rating = Math.round(newAverage * 10) / 10; // Round to 1 decimal
  company.count_ratings = newCount;

  await company.save();
}
```

### 4. Active Company Context

Users can belong to multiple companies but work in one at a time:

```typescript
// User schema
{
  active_company_id: ObjectId,  // ref: Company - Currently active
  // ...
}

// Switch active company
async function switchActiveCompany(userId: string, companyId: string) {
  // Verify user is member of company
  const membership = await CompanyUser.findOne({
    user: userId,
    company: companyId,
    status: 'active',
  });

  if (!membership) {
    throw new Error('Not a member of this company');
  }

  await User.findByIdAndUpdate(userId, { active_company_id: companyId });

  // Reload permissions for new company context
  return getPermissions(userId, companyId);
}
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `CompanyDetails.tsx` | View company profile |
| `ApplyForCompanyDialog.tsx` | Company registration form |
| `UpdateCompanyDialog.tsx` | Edit company info |
| `CompanyUsers.tsx` | Team member management |
| `InviteUserDialog.tsx` | Invite team member by phone/email |
| `RolesList.tsx` | List all roles |
| `CreateRole.tsx` | Create role form |
| `UpdateRole.tsx` | Edit role permissions |
| `PermissionMatrix.tsx` | Visual permission editor |
| `RatingList.tsx` | Browse companies by rating |
| `CompanyCard.tsx` | Company preview card |
| `VerificationBadge.tsx` | Verified status indicator |

---

## Reference Data

### CompanyType

```typescript
{
  _id: ObjectId,
  name: {
    en: string,
    ru: string,
    uz: string,
  },
  is_active: boolean,
}

// Examples: Carrier, Shipper, Freight Forwarder, Logistics Provider
```

### Default Permissions Matrix

| Role | LOAD | TRIP | TRUCK | BOARD | USER | ROLE | COMPANY |
|------|------|------|-------|-------|------|------|---------|
| **Owner** | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| **Manager** | CRUD | CRUD | CRUD | CRUD | R | R | R |
| **Dispatcher** | CRU | CRU | R | R | - | - | - |
| **Driver** | R | RU | R | - | - | - | - |
| **Viewer** | R | R | R | R | - | - | - |

---

## Company Statistics

```typescript
interface CompanyStats {
  totalLoads: number;
  activeLoads: number;
  completedLoads: number;
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalRatings: number;
  teamSize: number;
  trucksCount: number;
}

// GET /company/:id/stats
```
