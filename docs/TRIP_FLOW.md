# Trip/Transport Offer Feature Documentation

## Overview

The Trip feature allows carriers to post available transportation capacity. Shippers can browse, filter, and bid on available trips (transport offers).

A Trip is essentially a transport offer - a carrier saying "I have a truck available on this route at this time."

---

## Data Model

### Trip Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  owner: ObjectId,              // ref: User - Trip creator
  company: ObjectId,            // ref: Company - Associated company

  // Transport Information (Embedded, not referenced)
  transport: {
    name: string,
    transport_type: ObjectId,   // ref: TransportType
    transport_type_feature: string,  // 'coupling', 'truck', 'trailer'
    transport_loading_type: ObjectId[],
    transport_loading_feature: string,
    loading_capacity: number,
    capacity: number,
    capacity_unit: string,      // 'm3', 'L', 'mL'
    permits: ObjectId[],
    adr_classes: ObjectId[],
    transport_length: number,
    transport_width: number,
    transport_height: number,
  },

  // Route Information
  loading_point: ObjectId,      // ref: Location - Origin
  unloading_point: ObjectId,    // ref: Location - Destination
  from_location_id: string,
  to_location_id: string,
  from_country_code: string,
  to_country_code: string,
  distance: number,
  toll_distance: number,
  loading_radius: number,       // Pickup flexibility radius (km)
  unloading_radius: number,     // Dropoff flexibility radius (km)

  // Availability
  loading_ready_date: Date,     // Available from
  additional_loading_ready_date: number,  // Flexibility days

  // Pricing
  price: number,
  base_price: number,
  price_per_km: number,
  currency: ObjectId,           // ref: Currency
  is_negotiable: boolean,
  price_mode: string,           // 'fixed', 'per_km', 'negotiable'

  // Payment Terms
  payment_method: string[],     // ['cash', 'credit_card', 'nds', 'bank_transfer']

  // Status & Visibility
  status: 'open' | 'in_contract' | 'in_transit' | 'delivered',
  is_active: boolean,
  boards: ObjectId[],           // ref: Board

  // Attachments
  documents: [{
    type: string,               // 'passport', 'invoice', 'CMR'
    url: string,
  }],
  images: string[],
  note: string,                 // Trip description

  // Metadata
  is_system_trip: boolean,
  created_at: Date,
  updated_at: Date,
}
```

### Frontend Type Definition

```typescript
interface TripList {
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
  };

  // Embedded Transport
  transport: {
    name: string;
    transport_type: ITransportType;
    transport_type_feature: string;
    transport_loading_type: ILoadingType[];
    loading_capacity: number;
    capacity: number;
    capacity_unit: string;
    permits: IPermit[];
    adr_classes: IAdr[];
    transport_length: number;
    transport_width: number;
    transport_height: number;
  };

  // Route
  loading_point: ILocation;
  unloading_point: ILocation;
  from_country_code: string;
  to_country_code: string;
  distance: number;
  loading_radius: number;
  unloading_radius: number;

  // Availability
  loading_ready_date: string;
  additional_loading_ready_date: number;

  // Pricing
  price: number;
  currency: ICurrency;
  is_negotiable: boolean;
  converted_prices: Record<string, number>;

  // Status
  status: LoadStatus;
  is_active: boolean;

  note: string;
  created_at: string;
  updated_at: string;
}
```

---

## REST API Endpoints

### Public Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/trips/public` | Browse all active trips | No |
| GET | `/trips/:id/public` | Get public trip details | No |
| GET | `/trips/filter-data` | Get filter options | No |

### Authenticated Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/trips` | Get all trips with filtering | Yes |
| GET | `/trips/:id` | Get trip details | Yes |
| GET | `/trips/me` | Get user's own trips | Yes |
| GET | `/trips/my-sent-bids` | Get trips where user sent bids | Yes |
| GET | `/trips/my-trips-with-requests` | Get user's trips with received bids | Yes |
| GET | `/trips/invite` | Get trips from invited boards | Yes |
| POST | `/trips` | Create new trip | Yes |
| POST | `/trips/:user_id` | Create trip for another user | Yes |
| POST | `/trips/bulk` | Bulk create trips | Yes |
| POST | `/trips/upload-excel` | Import trips from Excel | Yes |
| PUT | `/trips/:id` | Update trip | Yes |
| PUT | `/trips/:id/status` | Update trip status | Yes |
| DELETE | `/trips/:id` | Soft delete trip | Yes |
| DELETE | `/trips/bulk` | Bulk delete trips | Yes |
| POST | `/trips/:id/reset` | Reset trip to initial state | Yes |

### Request/Response Examples

#### GET /trips/public

**Query Parameters:**
```
page=1
limit=20
from_country_code=UZ
to_country_code=RU
transport_type=64a1b2c3d4e5f6g7h8i9j0k1
min_price=500
max_price=3000
currency=USD
loading_ready_date_from=2024-01-01
loading_ready_date_to=2024-12-31
min_capacity=10
max_capacity=25
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
          "fio": "John Carrier",
          "phone_number": "+998901234567"
        },
        "company": {
          "_id": "company_id",
          "company_name": "Fast Transport LLC",
          "rating": 4.8,
          "count_ratings": 42
        },
        "transport": {
          "name": "DAF XF 480",
          "transport_type": {
            "_id": "type_id",
            "name": "Tent Truck"
          },
          "transport_type_feature": "truck",
          "loading_capacity": 22,
          "capacity": 92,
          "capacity_unit": "m3",
          "transport_length": 13.6,
          "transport_width": 2.45,
          "transport_height": 2.7,
          "permits": [{ "name": "TIR" }],
          "adr_classes": []
        },
        "loading_point": {
          "city": "Tashkent",
          "country_code": "UZ",
          "lat": 41.2995,
          "lon": 69.2401
        },
        "unloading_point": {
          "city": "Moscow",
          "country_code": "RU",
          "lat": 55.7558,
          "lon": 37.6173
        },
        "distance": 3200,
        "loading_radius": 50,
        "unloading_radius": 100,
        "loading_ready_date": "2024-03-15",
        "additional_loading_ready_date": 3,
        "price": 2500,
        "currency": { "code": "USD", "symbol": "$" },
        "is_negotiable": true,
        "status": "open",
        "note": "Ready for any cargo type",
        "created_at": "2024-03-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 85,
      "page": 1,
      "limit": 20,
      "pages": 5
    }
  }
}
```

#### POST /trips

**Request Body:**
```json
{
  "transport": {
    "name": "DAF XF 480",
    "transport_type": "transport_type_id",
    "transport_type_feature": "truck",
    "transport_loading_type": ["loading_type_id1", "loading_type_id2"],
    "transport_loading_feature": "rear",
    "loading_capacity": 22,
    "capacity": 92,
    "capacity_unit": "m3",
    "permits": ["permit_id"],
    "adr_classes": [],
    "transport_length": 13.6,
    "transport_width": 2.45,
    "transport_height": 2.7
  },
  "loading_point": "location_id",
  "unloading_point": "location_id",
  "loading_radius": 50,
  "unloading_radius": 100,
  "loading_ready_date": "2024-03-15",
  "additional_loading_ready_date": 3,
  "price": 2500,
  "currency": "currency_id",
  "is_negotiable": true,
  "price_mode": "fixed",
  "payment_method": ["bank_transfer", "cash"],
  "boards": [],
  "note": "Ready for any cargo type",
  "images": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "new_trip_id",
    "status": "open",
    "created_at": "2024-03-01T10:00:00Z"
  }
}
```

---

## Frontend-Backend Communication Flow

### 1. Browse Trips (Public)

```
Frontend                              Backend
   │                                     │
   ├─GET /trips/public?page=1&limit=20──►│
   │   + filters in query params         │
   │◄────────────paginated trips─────────┤
   │                                     │
   ├─GET /trips/filter-data────────────►│
   │◄────────min/max values for filters──┤
```

### 2. Create Trip

```
Frontend                              Backend
   │                                     │
   │   [Select route]                    │
   ├─POST /location/route───────────────►│
   │   {from, to coordinates}            │
   │◄────────route with distance─────────┤
   │                                     │
   │   [Get reference data]              │
   ├─GET /transport-types/all───────────►│
   ├─GET /transport-loading-type/all────►│
   ├─GET /permit/all────────────────────►│
   ├─GET /adr/all───────────────────────►│
   │◄────────────reference data──────────┤
   │                                     │
   │   [Create trip]                     │
   ├─POST /trips───────────────────────►│
   │   {trip data with embedded transport}│
   │◄────────────created trip────────────┤
```

### 3. View Trip Details & Book

```
Frontend                              Backend
   │                                     │
   ├─GET /trips/:id────────────────────►│
   │◄────────────trip details────────────┤
   │                                     │
   │   [User wants to book]              │
   │   If negotiable:                    │
   │     - Show price input              │
   │     - User enters proposed price    │
   │   If fixed:                         │
   │     - Auto-submit with fixed price  │
   │                                     │
   ├─POST /bids────────────────────────►│
   │   {post: tripId, post_type: 'Trip', │
   │    proposed_price, currency,        │
   │    load: loadId (optional)}         │
   │◄────────────bid created─────────────┤
```

### 4. My Trips Management

```
Frontend                              Backend
   │                                     │
   ├─GET /trips/me?page=1&limit=20─────►│
   │◄────────────my trips────────────────┤
   │                                     │
   │   [View received bids]              │
   ├─GET /trips/my-trips-with-requests──►│
   │◄────────trips with bid counts───────┤
   │                                     │
   │   [View specific trip's bids]       │
   ├─GET /bids/:tripId/bids────────────►│
   │◄────────────bids list───────────────┤
```

---

## State Management (Frontend)

### React Query Hooks

```typescript
// Get all trips
const useGetAllTrips = (params: TripsParams) => {
  return useQuery({
    queryKey: ['trips', params],
    queryFn: () => tripsAPI.getAllPublic(params),
    select: (data) => ({
      trips: tripMapper(data.data.data),
      pagination: data.data.pagination,
    }),
  });
};

// Get single trip
const useGetTrip = (id: string) => {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsAPI.getByIds(id),
    enabled: !!id,
  });
};

// Get user's trips
const useGetTripsMe = (params: TripsParams) => {
  return useQuery({
    queryKey: ['trips-me', params],
    queryFn: () => tripsAPI.getTripsMe(params),
  });
};

// Get trips with received bids
const useGetReceiveTrips = (params: TripsParams) => {
  return useQuery({
    queryKey: ['trips-receive-bids', params],
    queryFn: () => tripsAPI.getReceiveTrips(params),
  });
};

// Create trip mutation
const useCreateTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ITripCreate) => tripsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips-me'] });
    },
  });
};

// Delete trip mutation
const useDeleteTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tripsAPI.deleteTrips(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips-me'] });
    },
  });
};
```

---

## Key Differences: Trip vs Load

| Aspect | Load | Trip |
|--------|------|------|
| **Creator** | Shipper (cargo owner) | Carrier (transport owner) |
| **Purpose** | "I need transport for cargo" | "I have transport available" |
| **Transport** | References required type | Embeds actual transport data |
| **Cargo** | Contains cargo details | No cargo (waiting for shipper) |
| **Bidder** | Carriers bid on loads | Shippers bid on trips |
| **Bid Attachment** | Carrier attaches transport | Shipper can attach load |

---

## Key Business Logic

### 1. Trip Expiration

Trips expire based on `loading_ready_date` + `additional_loading_ready_date`:

```typescript
tripSchema.virtual('is_expired').get(function() {
  const expirationDate = new Date(this.loading_ready_date);
  expirationDate.setDate(expirationDate.getDate() + this.additional_loading_ready_date);
  return new Date() > expirationDate;
});
```

### 2. Transport Data Embedding

Unlike loads that reference a transport type, trips embed the actual transport data:

```typescript
// Trip stores a snapshot of transport at creation time
// This allows the trip to remain consistent even if the carrier
// later updates their transport details
{
  transport: {
    name: "DAF XF 480",
    transport_type: transportTypeId,
    // ... all transport details embedded
  }
}
```

### 3. Radius-Based Flexibility

Trips can specify pickup/dropoff flexibility:

```typescript
{
  loading_point: { city: "Tashkent", lat: 41.2995, lon: 69.2401 },
  loading_radius: 50,  // Can pickup within 50km of Tashkent
  unloading_point: { city: "Moscow", lat: 55.7558, lon: 37.6173 },
  unloading_radius: 100,  // Can deliver within 100km of Moscow
}
```

### 4. Booking Flow Difference

Trip booking is simpler than load booking:

```typescript
// Load booking: 2 steps (price → date)
// Trip booking: 1 step (price only, if negotiable)

// If trip.is_negotiable is false, booking auto-submits immediately
if (!trip.is_negotiable) {
  // Auto-create bid with fixed price
  createBid({
    post: tripId,
    post_type: 'Trip',
    proposed_price: trip.price,
    currency: trip.currency._id,
  });
}
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `TripsList.tsx` | Main trips grid with filters, sort, pagination |
| `TripCard.tsx` | Trip preview card with route, transport, price |
| `TripDetail.tsx` | Full trip details in drawer |
| `TripBooking.tsx` | Simple booking flow (price input) |
| `AllTripFilters.tsx` | Filter panel (location, date, transport type, capacity) |
| `TripsSort.tsx` | Sort dropdown |
| `TripCreatePage.tsx` | Trip creation form |
| `TripBids.tsx` | View bids received on trip |

---

## Reference Data Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /transport-types/all` | Truck types |
| `GET /transport-loading-type/all` | Loading methods |
| `GET /permit/all` | Transport permits |
| `GET /adr/all` | ADR dangerous goods classes |
| `GET /currency/all` | Currencies |
| `GET /country` | Countries |
| `POST /location/route` | Calculate route distance |
