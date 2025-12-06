# Transport/Truck Management Feature Documentation

## Overview

The Transport feature allows carriers to manage their fleet of vehicles. Transports are used when bidding on loads or creating trips.

---

## Data Model

### Transport Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  owner: ObjectId,                  // ref: User - Transport owner

  // Basic Info
  name: string,                     // Custom transport name (e.g., "DAF XF 480")

  // Type & Classification
  transport_type: ObjectId,         // ref: TransportType - Required
  transport_type_feature: TypeFeature,  // 'coupling', 'truck', 'trailer'
  transport_loading_type: ObjectId[],   // ref: TransportLoadingType[]
  transport_loading_feature: LoadingFeature,  // 'top', 'side', 'rear'

  // Capacity
  loading_capacity: number,         // Max weight capacity
  capacity: number,                 // Volume capacity
  capacity_unit: CapacityUnit,      // 'm3', 'L', 'mL'

  // Dimensions
  transport_length: number,         // meters
  transport_width: number,          // meters
  transport_height: number,         // meters

  // Certifications
  permits: ObjectId[],              // ref: Permit[] - TIR, CMR, etc.
  adr_classes: ObjectId[],          // ref: Adr[] - Dangerous goods certifications

  // Status
  is_active: boolean,               // Available for use

  // Timestamps
  created_at: Date,
  updated_at: Date,
}
```

### Enums

```typescript
enum TypeFeature {
  COUPLING = 'coupling',
  TRUCK = 'truck',
  TRAILER = 'trailer',
}

enum LoadingFeature {
  TOP = 'top',
  SIDE = 'side',
  REAR = 'rear',
  ALL = 'all',
}

enum CapacityUnit {
  CUBIC_METER = 'm3',
  LITER = 'L',
  MILLILITER = 'mL',
}

enum WeightUnit {
  KG = 'kg',
  TON = 'ton',
}
```

### Frontend Type Definition

```typescript
interface ITransport {
  _id: string;
  owner: {
    _id: string;
    fio: string;
  };
  name: string;
  transport_type: ITransportType;
  transport_type_feature: TypeFeature;
  transport_loading_type: ILoadingType[];
  transport_loading_feature: LoadingFeature;
  loading_capacity: number;
  capacity: number;
  capacity_unit: CapacityUnit;
  transport_length: number;
  transport_width: number;
  transport_height: number;
  permits: IPermit[];
  adr_classes: IAdr[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ITransportCreate {
  name: string;
  transport_type: string;           // ID
  transport_type_feature: TypeFeature;
  transport_loading_type: string[]; // IDs
  transport_loading_feature?: LoadingFeature;
  loading_capacity: number;
  capacity?: number;
  capacity_unit?: CapacityUnit;
  transport_length?: number;
  transport_width?: number;
  transport_height?: number;
  permits?: string[];               // IDs
  adr_classes?: string[];           // IDs
}
```

---

## REST API Endpoints

### Transport CRUD

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/transports` | Get all transports (browsable) | No |
| GET | `/transports/:id` | Get transport details | No |
| GET | `/transports/me` | Get user's own transports | Yes |
| POST | `/transports` | Create new transport | Yes |
| POST | `/transports/:userId` | Create transport for user (admin) | Yes |
| PUT | `/transports/:id` | Update transport | Yes |
| DELETE | `/transports/:id` | Delete transport | Yes |

### Reference Data Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/transport-types/all` | Get all transport types |
| GET | `/transport-loading-type/all` | Get all loading types |
| GET | `/permit/all` | Get all permits |
| GET | `/adr/all` | Get all ADR classes |

---

## API Request/Response Examples

### GET /transports/me

**Query Parameters:**
```
page=1
limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "transport_id",
        "owner": {
          "_id": "user_id",
          "fio": "John Carrier"
        },
        "name": "DAF XF 480",
        "transport_type": {
          "_id": "type_id",
          "name": {
            "en": "Tent Truck",
            "ru": "Тент",
            "uz": "Tent"
          }
        },
        "transport_type_feature": "truck",
        "transport_loading_type": [
          {
            "_id": "loading_type_id",
            "name": { "en": "Rear Loading" }
          },
          {
            "_id": "loading_type_id_2",
            "name": { "en": "Side Loading" }
          }
        ],
        "transport_loading_feature": "rear",
        "loading_capacity": 22,
        "capacity": 92,
        "capacity_unit": "m3",
        "transport_length": 13.6,
        "transport_width": 2.45,
        "transport_height": 2.7,
        "permits": [
          {
            "_id": "permit_id",
            "name": { "en": "TIR Carnet" }
          }
        ],
        "adr_classes": [],
        "is_active": true,
        "created_at": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

### POST /transports

**Request:**
```json
{
  "name": "Volvo FH16",
  "transport_type": "transport_type_id",
  "transport_type_feature": "truck",
  "transport_loading_type": ["loading_type_id_1", "loading_type_id_2"],
  "transport_loading_feature": "rear",
  "loading_capacity": 25,
  "capacity": 100,
  "capacity_unit": "m3",
  "transport_length": 13.6,
  "transport_width": 2.45,
  "transport_height": 2.8,
  "permits": ["permit_id_1", "permit_id_2"],
  "adr_classes": ["adr_class_id"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "new_transport_id",
    "name": "Volvo FH16",
    "transport_type": {
      "_id": "transport_type_id",
      "name": { "en": "Refrigerator Truck" }
    },
    "is_active": true,
    "created_at": "2024-03-01T10:00:00Z"
  }
}
```

### PUT /transports/:id

**Request:**
```json
{
  "name": "Volvo FH16 Updated",
  "loading_capacity": 26,
  "permits": ["permit_id_1", "permit_id_2", "permit_id_3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "transport_id",
    "name": "Volvo FH16 Updated",
    "loading_capacity": 26,
    "updated_at": "2024-03-05T14:00:00Z"
  }
}
```

---

## Frontend-Backend Communication Flow

### 1. View My Transports

```
Frontend                              Backend
   │                                     │
   ├─GET /transports/me?page=1─────────►│
   │◄────────────my transports───────────┤
```

### 2. Create New Transport

```
Frontend                              Backend
   │                                     │
   │   [Load reference data]             │
   ├─GET /transport-types/all───────────►│
   ├─GET /transport-loading-type/all────►│
   ├─GET /permit/all────────────────────►│
   ├─GET /adr/all───────────────────────►│
   │◄────────────reference data──────────┤
   │                                     │
   │   [User fills form]                 │
   │   - Select transport type           │
   │   - Enter dimensions & capacity     │
   │   - Select loading types            │
   │   - Select permits & ADR classes    │
   │                                     │
   ├─POST /transports──────────────────►│
   │   {transport data}                  │
   │◄────────────created transport───────┤
   │                                     │
   │   [Navigate to transport list]      │
```

### 3. Edit Transport

```
Frontend                              Backend
   │                                     │
   ├─GET /transports/:id───────────────►│
   │◄────────────transport details───────┤
   │                                     │
   │   [User modifies fields]            │
   │                                     │
   ├─PUT /transports/:id───────────────►│
   │   {updated fields}                  │
   │◄────────────updated transport───────┤
```

### 4. Delete Transport

```
Frontend                              Backend
   │                                     │
   │   [Confirm delete dialog]           │
   │                                     │
   ├─DELETE /transports/:id────────────►│
   │◄────────────success─────────────────┤
   │                                     │
   │   [Refresh transport list]          │
```

### 5. Use Transport in Bid

```
Frontend                              Backend
   │                                     │
   │   [Viewing a load, want to bid]     │
   ├─GET /transports/me────────────────►│
   │◄────────────my transports───────────┤
   │                                     │
   │   [Select transport(s) for bid]     │
   │                                     │
   ├─POST /bids────────────────────────►│
   │   {post, post_type: 'Load',         │
   │    transport: [transport_id],       │
   │    proposed_price, currency}        │
   │◄────────────bid created─────────────┤
```

---

## State Management (Frontend)

### React Query Hooks

```typescript
// Get user's transports
const useGetTransportsMe = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['transports', 'me', params],
    queryFn: () => transportAPI.getTransportsMe(params),
  });
};

// Get transport by ID
const useGetTransportById = (id: string) => {
  return useQuery({
    queryKey: ['transport', id],
    queryFn: () => transportAPI.getById(id),
    enabled: !!id,
  });
};

// Create transport mutation
const useCreateTransport = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ITransportCreate) => transportAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transports'] });
      toast.success(t('transport.created'));
      navigate('/profile-transport');
    },
    onError: () => {
      toast.error(t('errors.default_error'));
    },
  });
};

// Edit transport mutation
const useEditTransport = (id: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: Partial<ITransportCreate>) => transportAPI.edit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport', id] });
      queryClient.invalidateQueries({ queryKey: ['transports'] });
      toast.success(t('transport.updated'));
      navigate('/profile-transport');
    },
  });
};

// Delete transport mutation
const useDeleteTransport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transportAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transports'] });
      toast.success(t('transport.deleted'));
    },
  });
};
```

### Reference Data Hooks

```typescript
// Get all transport types
const useGetAllTransportType = () => {
  return useQuery({
    queryKey: ['transport-types'],
    queryFn: () => truckAPI.getAllTransportType(),
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });
};

// Get all loading types
const useGetAllLoadingTypes = () => {
  return useQuery({
    queryKey: ['loading-types'],
    queryFn: () => truckAPI.getAllLoadingType(),
    staleTime: 1000 * 60 * 60,
  });
};

// Get all permits
const useGetAllPermit = () => {
  return useQuery({
    queryKey: ['permits'],
    queryFn: () => truckAPI.getAllPermits(),
    staleTime: 1000 * 60 * 60,
  });
};

// Get all ADR classes
const useGetAllADRClasses = () => {
  return useQuery({
    queryKey: ['adr-classes'],
    queryFn: () => truckAPI.getAllADRClasses(),
    staleTime: 1000 * 60 * 60,
  });
};
```

---

## Reference Data Models

### TransportType

```typescript
{
  _id: ObjectId,
  name: {
    en: string,
    ru: string,
    uz: string,
  },
  description: {
    en: string,
    ru: string,
    uz: string,
  },
  is_active: boolean,
}

// Examples: Tent Truck, Refrigerator, Tanker, Flatbed, Container
```

### TransportLoadingType

```typescript
{
  _id: ObjectId,
  name: {
    en: string,
    ru: string,
    uz: string,
  },
  description: {
    en: string,
    ru: string,
    uz: string,
  },
  is_active: boolean,
}

// Examples: Rear Loading, Side Loading, Top Loading, Ramp
```

### Permit

```typescript
{
  _id: ObjectId,
  name: {
    en: string,
    ru: string,
    uz: string,
  },
  description: {
    en: string,
    ru: string,
    uz: string,
  },
  is_active: boolean,
}

// Examples: TIR Carnet, CMR, EKMT, Bilateral Permit
```

### ADR (Dangerous Goods)

```typescript
{
  _id: ObjectId,
  name: {
    en: string,
    ru: string,
    uz: string,
  },
  description: {
    en: string,
    ru: string,
    uz: string,
  },
  is_active: boolean,
}

// ADR Classes:
// 1 - Explosives
// 2 - Gases
// 3 - Flammable Liquids
// 4 - Flammable Solids
// 5 - Oxidizing Substances
// 6 - Toxic Substances
// 7 - Radioactive Materials
// 8 - Corrosive Substances
// 9 - Miscellaneous Dangerous Goods
```

---

## Key Business Logic

### 1. Transport Validation

```typescript
// Backend validation rules
const transportValidation = {
  name: { required: true, minLength: 2, maxLength: 100 },
  transport_type: { required: true, mustExist: true },
  loading_capacity: { required: true, min: 0.1, max: 100 },
  capacity: { min: 0 },
  transport_length: { min: 0, max: 30 },
  transport_width: { min: 0, max: 5 },
  transport_height: { min: 0, max: 5 },
};
```

### 2. Transport Usage in Bids

When a carrier bids on a load, they attach their transport(s):

```typescript
// Bid creation with transport
const bid = await Bid.create({
  post: loadId,
  post_type: 'Load',
  bidder: carrierId,
  transport: [transportId1, transportId2], // Multiple transports allowed
  proposed_price: 5000,
  currency: currencyId,
});

// Load owner can view offered transports
const transportDetails = await Transport.find({
  _id: { $in: bid.transport },
}).populate('transport_type permits adr_classes');
```

### 3. Transport Embedding in Trips

When creating a trip, transport data is embedded (copied):

```typescript
// Trip creation with embedded transport
const transport = await Transport.findById(transportId);

const trip = await Trip.create({
  owner: userId,
  transport: {
    name: transport.name,
    transport_type: transport.transport_type,
    transport_type_feature: transport.transport_type_feature,
    // ... all transport fields embedded
  },
  loading_point: locationId,
  // ... other trip fields
});

// This allows trip to maintain consistent transport info
// even if carrier updates the original transport later
```

### 4. Transport Filtering for Loads

When viewing a load, filter compatible transports:

```typescript
// Find transports that match load requirements
const compatibleTransports = await Transport.find({
  owner: carrierId,
  is_active: true,
  transport_type: load.transport_type,
  loading_capacity: { $gte: load.totalWeight },
  // Match required permits
  permits: { $all: load.features.permits },
  // Match required ADR classes
  adr_classes: { $all: load.features.adr_classes },
});
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `TransportList.tsx` | Grid of user's transports |
| `TransportCard.tsx` | Transport preview card |
| `TransportCreatePage.tsx` | Create/edit transport form |
| `TransportTypeSelect.tsx` | Dropdown for transport types |
| `LoadingTypeMultiSelect.tsx` | Multi-select for loading types |
| `PermitMultiSelect.tsx` | Multi-select for permits |
| `AdrClassMultiSelect.tsx` | Multi-select for ADR classes |
| `DimensionsInput.tsx` | Length/width/height inputs |
| `CapacityInput.tsx` | Capacity with unit selector |
| `SelectTransportDialog.tsx` | Dialog to select transports for bid |

---

## Form Validation (Frontend)

```typescript
// Zod schema for transport creation
const transportSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  transport_type: z.string().min(1, 'Transport type is required'),
  transport_type_feature: z.enum(['coupling', 'truck', 'trailer']),
  transport_loading_type: z.array(z.string()).min(1, 'Select at least one loading type'),
  transport_loading_feature: z.enum(['top', 'side', 'rear', 'all']).optional(),
  loading_capacity: z.number().min(0.1, 'Capacity must be positive').max(100),
  capacity: z.number().min(0).optional(),
  capacity_unit: z.enum(['m3', 'L', 'mL']).optional(),
  transport_length: z.number().min(0).max(30).optional(),
  transport_width: z.number().min(0).max(5).optional(),
  transport_height: z.number().min(0).max(5).optional(),
  permits: z.array(z.string()).optional(),
  adr_classes: z.array(z.string()).optional(),
});

type TransportFormData = z.infer<typeof transportSchema>;
```

---

## Integration Points

### 1. Transport → Bid

```typescript
// When bidding on a load
{
  post: loadId,
  post_type: 'Load',
  transport: [transport1Id, transport2Id],
  // ...
}
```

### 2. Transport → Trip

```typescript
// When creating a trip, transport is embedded
{
  transport: {
    // Full transport data copied
  },
  loading_point: locationId,
  // ...
}
```

### 3. Load Requirements → Transport Matching

```typescript
// Load specifies requirements
{
  transport_type: tentTruckId,
  features: {
    permits: [tirPermitId],
    adr_classes: [class3Id],
  }
}

// Carrier's transport must match
{
  transport_type: tentTruckId,  // Must match
  permits: [tirPermitId, cmrId], // Must include required
  adr_classes: [class3Id, class5Id], // Must include required
}
```
