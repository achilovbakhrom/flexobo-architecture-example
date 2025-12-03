# Load/Cargo Feature Documentation

## Overview

The Load feature allows shippers to post cargo transportation needs. Carriers can browse, filter, and bid on available loads.

---

## Data Model

### Load Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  owner: ObjectId,              // ref: User - Load creator
  company: ObjectId,            // ref: Company - Associated company

  // Route Information
  from: ObjectId,               // ref: Location - Origin
  to: ObjectId,                 // ref: Location - Destination
  loading_point: Location,      // Embedded loading coordinates
  unloading_point: Location,    // Embedded unloading coordinates
  distance: number,             // Calculated route distance (km)
  toll_distance: number,        // Toll road distance

  // Cargo Details
  cargos: [{
    cargo_type: ObjectId,       // ref: LoadType
    weight: number,
    weight_unit: string,        // kg, ton
    units: number,
    description: string,
  }],
  transport_type: ObjectId,     // ref: TransportType - Required truck type
  truck_load_type: 'FTL' | 'LTL',

  // Features & Requirements
  features: {
    adr_classes: ObjectId[],    // ref: Adr - Dangerous goods
    permits: ObjectId[],        // ref: Permit
    coupling: string,
    capacity: number,
  },
  loading_type: ObjectId,       // ref: TransportLoadingType
  unloading_type: ObjectId,

  // Pricing
  price: number,
  base_price: number,
  price_per_km: number,
  currency: ObjectId,           // ref: Currency
  negotiable: boolean,
  price_mode: string,           // 'fixed', 'per_km', 'negotiable'

  // Payment Terms
  payment_type: string[],       // ['cash', 'credit_card', 'nds', 'bank_transfer']
  payment_condition: string,
  payment_days: number,
  pre_payment: number,

  // Dates
  target_date: Date,            // Pickup date
  additional_extra_day: number, // Flexibility days

  // Status & Visibility
  status: 'open' | 'in_contract' | 'in_transit' | 'delivered',
  is_active: boolean,           // Soft delete flag
  boards: ObjectId[],           // ref: Board - Visibility boards

  // Attachments
  documents: string[],          // TTN, invoice, CMR
  images: string[],             // Cargo photos

  // Metadata
  is_system_load: boolean,
  created_at: Date,
  updated_at: Date,
}
```

### Frontend Type Definition

```typescript
interface ILoads {
  _id: string;
  owner: {
    _id: string;
    fio: string;
    phone_number: string;
    avatar?: string;
  };
  company?: {
    _id: string;
    company_name: string;
    rating: number;
    count_ratings: number;
    avatar?: string;
  };

  // Route
  from: ILocation;
  to: ILocation;
  loading_point: { lat: number; lon: number };
  unloading_point: { lat: number; lon: number };
  distance: number;

  // Cargo
  cargos: ICargo[];
  transport_type: ITransportType;
  truck_load_type: 'FTL' | 'LTL';

  // Pricing
  price: number;
  currency: ICurrency;
  negotiable: boolean;
  converted_prices: Record<string, number>;

  // Dates
  target_date: string;
  additional_extra_day: number;

  // Status
  status: LoadStatus;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}
```

---

## REST API Endpoints

### Public Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/loads/public` | Browse all active loads | No |
| GET | `/loads/:id/public` | Get public load details | No |
| GET | `/loads/filter-data` | Get filter options (min/max values) | No |

### Authenticated Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/loads` | Get all loads with filtering | Yes |
| GET | `/loads/:id` | Get load details | Yes |
| GET | `/loads/me` | Get user's own loads | Yes |
| GET | `/loads/my-sent-bids` | Get loads where user sent bids | Yes |
| GET | `/loads/my-loads-with-requests` | Get user's loads with received bids | Yes |
| GET | `/loads/invite` | Get loads from invited boards | Yes |
| POST | `/loads` | Create new load | Yes |
| POST | `/loads/:user_id` | Create load for another user (admin) | Yes |
| POST | `/loads/bulk` | Bulk create loads | Yes |
| POST | `/loads/upload-excel` | Import loads from Excel | Yes |
| PUT | `/loads/:id` | Update load | Yes |
| PUT | `/loads/:id/status` | Update load status | Yes |
| DELETE | `/loads/:id` | Soft delete load | Yes |
| DELETE | `/loads/bulk` | Bulk delete loads | Yes |
| POST | `/loads/:id/reset` | Reset load to initial state | Yes |

### Request/Response Examples

#### GET /loads/public

**Query Parameters:**
```
page=1
limit=20
from_country_code=UZ
to_country_code=RU
transport_type=64a1b2c3d4e5f6g7h8i9j0k1
min_price=1000
max_price=5000
currency=USD
target_date_from=2024-01-01
target_date_to=2024-12-31
truck_load_type=FTL
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
        "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
        "owner": {
          "_id": "user_id",
          "fio": "John Doe",
          "phone_number": "+998901234567"
        },
        "company": {
          "_id": "company_id",
          "company_name": "Transport Co",
          "rating": 4.5,
          "count_ratings": 25
        },
        "from": {
          "city": "Tashkent",
          "country_code": "UZ",
          "lat": 41.2995,
          "lon": 69.2401
        },
        "to": {
          "city": "Moscow",
          "country_code": "RU",
          "lat": 55.7558,
          "lon": 37.6173
        },
        "cargos": [
          {
            "cargo_type": { "name": "General Cargo" },
            "weight": 20000,
            "weight_unit": "kg"
          }
        ],
        "transport_type": {
          "_id": "type_id",
          "name": "Tent Truck"
        },
        "price": 5000,
        "currency": { "code": "USD", "symbol": "$" },
        "negotiable": true,
        "target_date": "2024-03-15",
        "status": "open",
        "created_at": "2024-03-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "pages": 8
    }
  }
}
```

#### POST /loads

**Request Body:**
```json
{
  "from": "location_id",
  "to": "location_id",
  "loading_point": { "lat": 41.2995, "lon": 69.2401 },
  "unloading_point": { "lat": 55.7558, "lon": 37.6173 },
  "cargos": [
    {
      "cargo_type": "cargo_type_id",
      "weight": 20000,
      "weight_unit": "kg",
      "units": 1,
      "description": "Construction materials"
    }
  ],
  "transport_type": "transport_type_id",
  "truck_load_type": "FTL",
  "features": {
    "adr_classes": [],
    "permits": ["permit_id"],
    "capacity": 20
  },
  "loading_type": "loading_type_id",
  "unloading_type": "unloading_type_id",
  "price": 5000,
  "currency": "currency_id",
  "negotiable": true,
  "price_mode": "fixed",
  "payment_type": ["bank_transfer"],
  "payment_condition": "after_delivery",
  "payment_days": 14,
  "target_date": "2024-03-15",
  "additional_extra_day": 2,
  "boards": ["board_id"],
  "documents": ["url1", "url2"],
  "images": ["url1"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "new_load_id",
    "status": "open",
    "created_at": "2024-03-01T10:00:00Z"
  }
}
```

#### PUT /loads/:id/status

**Request Body:**
```json
{
  "status": "in_contract"
}
```

**Valid Status Transitions:**
- `open` → `in_contract` (when bid accepted)
- `in_contract` → `in_transit` (carrier picked up)
- `in_transit` → `delivered` (completed)
- Any status → `open` (via reset)

---

## Frontend-Backend Communication Flow

### 1. Browse Loads (Public)

```
Frontend                              Backend
   │                                     │
   ├─GET /loads/public?page=1&limit=20──►│
   │   + filters in query params         │
   │◄────────────paginated loads─────────┤
   │                                     │
   ├─GET /loads/filter-data─────────────►│
   │◄────────min/max values for filters──┤
```

### 2. Browse Loads (Authenticated)

```
Frontend                              Backend
   │                                     │
   ├─GET /loads?page=1&limit=20─────────►│
   │   Authorization: Bearer {token}     │
   │   x-language-code: en               │
   │   x-currency-Code: USD              │
   │◄────────────paginated loads─────────┤
```

### 3. Create Load

```
Frontend                              Backend
   │                                     │
   ├─POST /location/route───────────────►│
   │   {from, to coordinates}            │
   │◄────────route with distance─────────┤
   │                                     │
   ├─POST /loads───────────────────────►│
   │   {load data}                       │
   │◄────────────created load────────────┤
   │                                     │
   │   [Optional: Telegram publish]      │
   │   Backend queues for Telegram bot   │
```

### 4. View Load Details

```
Frontend                              Backend
   │                                     │
   ├─GET /loads/:id────────────────────►│
   │◄────────────load details────────────┤
   │                                     │
   │   [If owner, can see bids]          │
   ├─GET /bids/:loadId/bids────────────►│
   │◄────────────bids list───────────────┤
```

### 5. My Loads Management

```
Frontend                              Backend
   │                                     │
   ├─GET /loads/me?page=1&limit=20─────►│
   │◄────────────my loads────────────────┤
   │                                     │
   │   [Update load]                     │
   ├─PUT /loads/:id────────────────────►│
   │◄────────────updated load────────────┤
   │                                     │
   │   [Delete load]                     │
   ├─DELETE /loads/:id─────────────────►│
   │◄────────────success─────────────────┤
```

### 6. Loads with Received Bids

```
Frontend                              Backend
   │                                     │
   ├─GET /loads/my-loads-with-requests─►│
   │◄────loads with bid counts───────────┤
   │                                     │
   │   [View bids on specific load]      │
   ├─GET /bids/:loadId/bids────────────►│
   │◄────────────bids list───────────────┤
```

---

## State Management (Frontend)

### React Query Hooks

```typescript
// Get loads list with infinite scroll
const useGetLoads = (params: LoadsParams) => {
  return useInfiniteQuery({
    queryKey: ['loads', params],
    queryFn: ({ pageParam = 1 }) =>
      createLoadAPI.getPublicLoads({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.pagination.nextPage,
  });
};

// Get single load
const useGetLoadByIds = (id: string) => {
  return useQuery({
    queryKey: ['load', id],
    queryFn: () => createLoadAPI.getLoad(id),
    enabled: !!id,
  });
};

// Get user's loads
const useGetLoadsMe = (params: LoadsParams) => {
  return useQuery({
    queryKey: ['loads-me', params],
    queryFn: () => createLoadAPI.getLoadsMe(params),
  });
};

// Create load mutation
const useCreateLoad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ILoadCreate) => createLoadAPI.createLoad(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['loads-me'] });
    },
  });
};

// Update load status
const useUpdateLoadStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LoadStatus }) =>
      createLoadAPI.updateLoadStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['load', id] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });
};
```

### Filter State Management

Filters are stored in URL query parameters for shareable links:

```typescript
// Read filters from URL
const [searchParams] = useSearchParams();
const filters = {
  from_country_code: searchParams.get('from_country'),
  to_country_code: searchParams.get('to_country'),
  min_price: searchParams.get('min_price'),
  max_price: searchParams.get('max_price'),
  transport_type: searchParams.get('transport_type'),
  // ... more filters
};

// Update filters in URL
const setFilters = (newFilters: Partial<LoadFilters>) => {
  const params = new URLSearchParams(searchParams);
  Object.entries(newFilters).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  setSearchParams(params);
};
```

---

## Key Business Logic

### 1. Load Expiration

Loads expire based on `target_date` + `additional_extra_day`:

```typescript
// Backend virtual field
loadSchema.virtual('is_expired').get(function() {
  const expirationDate = new Date(this.target_date);
  expirationDate.setDate(expirationDate.getDate() + this.additional_extra_day);
  return new Date() > expirationDate;
});
```

### 2. Price Conversion

Prices are stored in original currency but converted for display:

```typescript
// Backend adds converted_prices to response
{
  price: 5000,
  currency: { code: 'USD' },
  converted_prices: {
    USD: 5000,
    EUR: 4600,
    RUB: 450000,
    UZS: 62500000
  }
}
```

### 3. Board-Based Visibility

Loads can be assigned to private boards:

```typescript
// When querying loads, filter by board membership
const visibleLoads = await Load.find({
  $or: [
    { boards: { $size: 0 } },  // Public (no boards)
    { boards: { $in: userBoardIds } },  // User has access
    { owner: userId }  // Own loads
  ]
});
```

### 4. Status Workflow

```
┌─────────┐     Bid Accepted     ┌─────────────┐
│  OPEN   │ ──────────────────► │ IN_CONTRACT │
└─────────┘                      └─────────────┘
                                        │
                                  Carrier Picks Up
                                        │
                                        ▼
                                 ┌────────────┐
                                 │ IN_TRANSIT │
                                 └────────────┘
                                        │
                                   Delivered
                                        │
                                        ▼
                                 ┌───────────┐
                                 │ DELIVERED │
                                 └───────────┘
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `LoadsList.tsx` | Main loads grid with filters, sort, infinite scroll |
| `LoadCard.tsx` | Load preview card with route, price, date |
| `LoadDetails.tsx` | Full load details in drawer |
| `LoadBooking.tsx` | Two-step booking flow (price → date) |
| `AllLoadFilters.tsx` | Filter panel (location, date, price, cargo) |
| `LoadsSort.tsx` | Sort dropdown |
| `LoadCreatePage.tsx` | Multi-step load creation form |
| `LoadBids.tsx` | View bids received on load |

---

## Reference Data Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /load-types/all` | Cargo types |
| `GET /transport-types/all` | Truck types |
| `GET /transport-loading-type/all` | Loading methods |
| `GET /adr/all` | ADR dangerous goods classes |
| `GET /permit/all` | Transport permits |
| `GET /currency/all` | Currencies |
| `GET /country` | Countries |
| `POST /location/route` | Calculate route distance |
