# Board Visibility Feature Documentation

## Overview

The Board feature provides visibility control for loads and trips. Companies can create private boards to share specific loads/trips only with invited partners, enabling controlled marketplace access.

---

## Data Model

### Board Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  owner: ObjectId,                  // ref: User - Board creator
  owner_company: ObjectId,          // ref: Company - Company scope

  // Board Info
  name: string,                     // Board name
  type: BoardType,                  // 'load' or 'trip'

  // Visibility
  is_open: boolean,                 // Public or private
  private_duration: number,         // Days before going public (0 = always private)

  // Invited Companies
  companies: ObjectId[],            // ref: Company[] - Companies with access

  // Timestamps
  created_at: Date,
  updated_at: Date,
}
```

### BoardType Enum

```typescript
enum BoardType {
  LOAD = 'load',
  TRIP = 'trip',
}
```

### Frontend Type Definition

```typescript
interface IBoard {
  _id: string;
  owner: {
    _id: string;
    fio: string;
  };
  owner_company: {
    _id: string;
    company_name: string;
  };
  name: string;
  type: BoardType;
  is_open: boolean;
  private_duration: number;
  companies: {
    _id: string;
    company_name: string;
    avatar?: string;
  }[];
  created_at: string;
  updated_at: string;
}

interface IBoardCreate {
  name: string;
  type: BoardType;
  is_open: boolean;
  private_duration?: number;
  companies?: string[];  // Company IDs to invite
}
```

---

## REST API Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/boards/me` | Get user's own boards | Yes |
| GET | `/boards/:id` | Get board details | Yes |
| GET | `/board-invites` | Get boards user is invited to | Yes |
| GET | `/boards/:id/items` | Get loads/trips in a board | Yes |
| POST | `/boards` | Create new board | Yes |
| PUT | `/boards/:id` | Update board | Yes |
| DELETE | `/boards/:id` | Delete board | Yes |

---

## API Request/Response Examples

### POST /boards

**Request:**
```json
{
  "name": "Premium Partners",
  "type": "load",
  "is_open": false,
  "private_duration": 7,
  "companies": ["company_id_1", "company_id_2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "board_id",
    "name": "Premium Partners",
    "type": "load",
    "is_open": false,
    "private_duration": 7,
    "companies": [
      {
        "_id": "company_id_1",
        "company_name": "Fast Transport LLC"
      },
      {
        "_id": "company_id_2",
        "company_name": "Express Logistics"
      }
    ],
    "owner": {
      "_id": "user_id",
      "fio": "John Smith"
    },
    "owner_company": {
      "_id": "company_id",
      "company_name": "Global Shipping Inc"
    },
    "created_at": "2024-03-01T10:00:00Z"
  }
}
```

### GET /boards/me

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "board_id_1",
      "name": "VIP Carriers",
      "type": "load",
      "is_open": false,
      "private_duration": 0,
      "companies": [
        { "_id": "c1", "company_name": "Carrier A" },
        { "_id": "c2", "company_name": "Carrier B" }
      ],
      "created_at": "2024-01-15T10:00:00Z"
    },
    {
      "_id": "board_id_2",
      "name": "Regional Partners",
      "type": "trip",
      "is_open": true,
      "private_duration": 3,
      "companies": [],
      "created_at": "2024-02-20T10:00:00Z"
    }
  ]
}
```

### GET /board-invites

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "board_id",
        "name": "Exclusive Loads",
        "type": "load",
        "owner_company": {
          "_id": "company_id",
          "company_name": "Big Shipper Corp",
          "avatar": "https://..."
        },
        "created_at": "2024-03-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20
    }
  }
}
```

### GET /boards/:id/items

**Response:**
```json
{
  "success": true,
  "data": {
    "board": {
      "_id": "board_id",
      "name": "Premium Partners",
      "type": "load"
    },
    "items": [
      {
        "_id": "load_id_1",
        "from": { "city": "Tashkent" },
        "to": { "city": "Moscow" },
        "price": 5000,
        "currency": { "code": "USD" },
        "target_date": "2024-03-15"
      },
      {
        "_id": "load_id_2",
        "from": { "city": "Almaty" },
        "to": { "city": "Berlin" },
        "price": 8000,
        "currency": { "code": "EUR" },
        "target_date": "2024-03-20"
      }
    ],
    "pagination": {
      "total": 12,
      "page": 1,
      "limit": 20
    }
  }
}
```

---

## Visibility Logic

### Board Types

1. **Open Board** (`is_open: true`)
   - Items are visible to everyone after `private_duration` days
   - Invited companies see items immediately
   - Public after duration expires

2. **Private Board** (`is_open: false`)
   - Only invited companies can see items
   - Never goes public
   - `private_duration` is ignored

### Visibility Timeline

```
Load Created                    private_duration
     │                              days
     │◄─────────────────────────────►│
     │                               │
     │  Only invited companies       │  Everyone (if is_open=true)
     │  can see this load            │  can see this load
     │                               │
     ▼                               ▼
  Day 0                           Day N
```

### Query Logic

```typescript
// Backend: Get visible loads for user
async function getVisibleLoads(userId: string) {
  const user = await User.findById(userId).populate('active_company_id');
  const userCompanyId = user.active_company_id?._id;

  // Get boards where user's company is invited
  const invitedBoards = await Board.find({
    type: 'load',
    companies: userCompanyId,
  });
  const invitedBoardIds = invitedBoards.map(b => b._id);

  // Find visible loads
  const loads = await Load.find({
    is_active: true,
    $or: [
      // No boards assigned (public)
      { boards: { $size: 0 } },

      // User's company is invited to the board
      { boards: { $in: invitedBoardIds } },

      // Open board and private_duration expired
      {
        boards: {
          $elemMatch: {
            $in: await Board.find({
              is_open: true,
              created_at: {
                $lte: new Date(Date.now() - this.private_duration * 24 * 60 * 60 * 1000)
              }
            }).distinct('_id')
          }
        }
      },

      // User owns the load
      { owner: userId },
    ],
  });

  return loads;
}
```

---

## Frontend-Backend Communication Flow

### 1. Create Board

```
Frontend                              Backend
   │                                     │
   │   [User clicks "Create Board"]      │
   │                                     │
   │   [Get companies to invite]         │
   ├─GET /company?limit=1000───────────►│
   │◄────────────companies───────────────┤
   │                                     │
   │   [User fills form]                 │
   │   - Name                            │
   │   - Type (load/trip)                │
   │   - Open/Private                    │
   │   - Duration (if open)              │
   │   - Select companies to invite      │
   │                                     │
   ├─POST /boards──────────────────────►│
   │   {name, type, is_open, companies}  │
   │◄────────────board created───────────┤
```

### 2. Assign Load/Trip to Board

```
Frontend                              Backend
   │                                     │
   │   [Creating/editing a load]         │
   │                                     │
   │   [Get user's boards]               │
   ├─GET /boards/me────────────────────►│
   │◄────────────my boards───────────────┤
   │                                     │
   │   [Select boards for visibility]    │
   │                                     │
   ├─POST /loads───────────────────────►│
   │   {...loadData, boards: [board_id]} │
   │◄────────────load created────────────┤
```

### 3. View Invited Boards

```
Frontend                              Backend
   │                                     │
   ├─GET /board-invites────────────────►│
   │◄────────────invited boards──────────┤
   │                                     │
   │   [View specific board's loads]     │
   ├─GET /boards/:id/items─────────────►│
   │◄────────────loads in board──────────┤
```

### 4. Browse Loads from Invited Boards

```
Frontend                              Backend
   │                                     │
   │   [Special "Invited" tab/filter]    │
   ├─GET /loads/invite─────────────────►│
   │◄────────loads from invited boards───┤
```

---

## State Management (Frontend)

### React Query Hooks

```typescript
// Get my boards
const useGetBoardMe = () => {
  return useQuery({
    queryKey: ['boards', 'me'],
    queryFn: () => boardAPI.getBoardMe(),
  });
};

// Get board by ID
const useGetBoardById = (id: string) => {
  return useQuery({
    queryKey: ['board', id],
    queryFn: () => boardAPI.getBoardById(id),
    enabled: !!id,
  });
};

// Get board invitations
const useGetBoardInvites = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['boards', 'invites', params],
    queryFn: () => boardAPI.getBoardInvites(params),
  });
};

// Get items in a board
const useGetBoardItems = (boardId: string, params?: { page?: number }) => {
  return useQuery({
    queryKey: ['board', boardId, 'items', params],
    queryFn: () => boardAPI.getInviteBoardItems(boardId, params),
    enabled: !!boardId,
  });
};

// Create board
const useCreateBoard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: IBoardCreate) => boardAPI.createBoard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success(t('board.created'));
      navigate('/profile-board');
    },
  });
};

// Update board
const useEditBoard = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IBoardCreate>) => boardAPI.updateBoard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success(t('board.updated'));
    },
  });
};

// Delete board
const useDeleteBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => boardAPI.deleteBoard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success(t('board.deleted'));
    },
  });
};
```

---

## Key Business Logic

### 1. Board Assignment on Load/Trip Creation

When creating a load or trip, the user can assign it to one or more boards:

```typescript
// Load/Trip creation with board assignment
{
  // ... load/trip data
  boards: ["board_id_1", "board_id_2"],
}

// If no boards selected:
// - Load/trip is public (visible to everyone)
// - Shown in main listings

// If boards selected:
// - Initially visible only to invited companies
// - Visibility expands based on board settings
```

### 2. Multi-Board Visibility

A load/trip can belong to multiple boards:

```typescript
// Load assigned to multiple boards
{
  boards: ["premium_partners", "regional_carriers"],
}

// Visibility rules:
// - If ANY assigned board grants access, user can see the load
// - This allows flexible visibility strategies
```

### 3. Company Invitation System

```typescript
// Add company to board
async function inviteCompanyToBoard(boardId: string, companyId: string) {
  await Board.findByIdAndUpdate(boardId, {
    $addToSet: { companies: companyId },
  });

  // Notify company about invitation
  const company = await Company.findById(companyId);
  await notificationService.send({
    users: company.members,
    title: t('board.invitation'),
    body: t('board.invited_to_board'),
    data: { boardId },
  });
}

// Remove company from board
async function removeCompanyFromBoard(boardId: string, companyId: string) {
  await Board.findByIdAndUpdate(boardId, {
    $pull: { companies: companyId },
  });
}
```

### 4. Duration-Based Public Transition

```typescript
// Check if board content should be public
function isContentPublic(board: Board, loadCreatedAt: Date): boolean {
  if (!board.is_open) {
    return false; // Private boards never go public
  }

  if (board.private_duration === 0) {
    return true; // No private period
  }

  const publicDate = new Date(loadCreatedAt);
  publicDate.setDate(publicDate.getDate() + board.private_duration);

  return new Date() >= publicDate;
}
```

### 5. Filtering by Board Access

```typescript
// Frontend: Filter loads by access type
const [filter, setFilter] = useState<'all' | 'public' | 'invited'>('all');

// API calls based on filter
switch (filter) {
  case 'public':
    return loadAPI.getPublicLoads(params);
  case 'invited':
    return loadAPI.getInviteLoads(params);
  case 'all':
  default:
    return loadAPI.getLoads(params);
}
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `BoardList.tsx` | List user's boards |
| `BoardCard.tsx` | Board preview card |
| `BoardCreate.tsx` | Create board form |
| `BoardEdit.tsx` | Edit board settings |
| `BoardInviteList.tsx` | View board invitations |
| `BoardItemsList.tsx` | View loads/trips in a board |
| `CompanyMultiSelect.tsx` | Select companies to invite |
| `BoardSelector.tsx` | Select boards when creating load/trip |
| `VisibilityBadge.tsx` | Show board/visibility info on load card |

---

## Use Cases

### 1. VIP Partner Access

**Scenario**: A shipper wants to give first access to premium carriers.

```typescript
// Create VIP board
const vipBoard = {
  name: "VIP Carriers",
  type: "load",
  is_open: true,
  private_duration: 3,  // 3 days exclusive access
  companies: [premiumCarrier1Id, premiumCarrier2Id],
};

// Assign high-value loads to this board
const highValueLoad = {
  // ...load data
  boards: [vipBoard._id],
};

// Result:
// - Day 0-3: Only VIP carriers see the load
// - Day 3+: Everyone sees the load
```

### 2. Private Freight Network

**Scenario**: A logistics company wants to share loads only with vetted partners.

```typescript
// Create private network
const privateNetwork = {
  name: "Trusted Partners",
  type: "load",
  is_open: false,  // Never goes public
  private_duration: 0,
  companies: [partner1Id, partner2Id, partner3Id],
};

// All loads assigned to this board stay private forever
```

### 3. Regional Specialization

**Scenario**: Different boards for different regions/routes.

```typescript
// Create regional boards
const europeBoard = {
  name: "Europe Routes",
  type: "trip",
  is_open: true,
  private_duration: 1,
  companies: [europeanPartners],
};

const asiaBoard = {
  name: "Asia Routes",
  type: "trip",
  is_open: true,
  private_duration: 1,
  companies: [asianPartners],
};

// Assign trips to relevant boards based on route
```

---

## Integration with Loads/Trips

### Load Schema Extension

```typescript
// Load has boards field
{
  // ...load fields
  boards: ObjectId[],  // ref: Board[]
}
```

### Trip Schema Extension

```typescript
// Trip has boards field
{
  // ...trip fields
  boards: ObjectId[],  // ref: Board[]
}
```

### Special Endpoints

```typescript
// Get loads from invited boards only
GET /loads/invite

// Get trips from invited boards only
GET /trips/invite
```

---

## Notification System

```typescript
// Notifications for board events
const boardNotifications = {
  // When company is invited to board
  BOARD_INVITATION: {
    title: 'New Board Invitation',
    body: 'You have been invited to {board_name}',
  },

  // When new load is posted to board
  NEW_LOAD_IN_BOARD: {
    title: 'New Load Available',
    body: 'New load posted in {board_name}',
  },

  // When new trip is posted to board
  NEW_TRIP_IN_BOARD: {
    title: 'New Trip Available',
    body: 'New trip posted in {board_name}',
  },
};
```
