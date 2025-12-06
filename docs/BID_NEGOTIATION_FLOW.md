# Bid & Negotiation Feature Documentation

## Overview

The Bid feature enables price negotiation between shippers and carriers. Users can submit bids on loads or trips, and owners can accept, reject, or counter-offer. Multi-round negotiation is supported through the negotiation steps system.

---

## Data Models

### Bid Schema (MongoDB)

```typescript
{
  _id: ObjectId,

  // Parties
  bidder: ObjectId,             // ref: User - Person making the bid
  owner: ObjectId,              // ref: User - Load/Trip owner

  // Target Post (Polymorphic)
  post: ObjectId,               // ref: Load OR Trip (via refPath)
  post_type: 'Load' | 'Trip',   // Determines which collection to reference

  // Attached Resources
  transport: ObjectId[],        // ref: Transport[] - For Load bids (carrier offers trucks)
  load: ObjectId,               // ref: Load - For Trip bids (shipper offers cargo)

  // Pricing
  proposed_price: number,
  currency: ObjectId,           // ref: Currency

  // Status
  status: BidStatus,            // See enum below

  // Additional Info
  note: string,                 // Bidder's message
  date: Date,                   // Transport/cargo ready date

  // Negotiation
  negotiation_round: number,    // Counter-offer count (starts at 0)

  // Chat Integration
  is_chat_created: boolean,
  chat_room: ObjectId,          // ref: ChatRoom

  // Timestamps
  responded_at: Date,           // When owner responded
  created_at: Date,
  updated_at: Date,
}
```

### BidStatus Enum

```typescript
enum BidStatus {
  FIXED = 'fixed',                    // Initial bid with fixed price
  PRICE_REQUESTED = 'price_requested', // Owner asked for price
  NEGOTIATION = 'negotiation',        // Counter-offer in progress
  ACCEPTED = 'accepted',              // Bid accepted
  REJECTED = 'rejected',              // Bid rejected
  BOOKED = 'booked',                  // Booking created
  CANCELLED = 'cancelled',            // Bid cancelled
}
```

### NegotiationStep Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  bid: ObjectId,                // ref: Bid
  author: ObjectId,             // ref: User - Who made this offer

  // Offer Details
  price_offer: number,
  currency: ObjectId,           // ref: Currency
  comment: string,              // Optional message

  // Status
  status: string,
  step_number: number,          // Sequential: 1, 2, 3...
  accepted: boolean,
  rejected: boolean,

  created_at: Date,
  updated_at: Date,
}
```

### Frontend Type Definitions

```typescript
interface IBids {
  _id: string;
  bidder: {
    _id: string;
    fio: string;
    phone_number: string;
    avatar?: string;
  };
  owner: {
    _id: string;
    fio: string;
    phone_number: string;
  };
  post: ILoads | TripList;
  post_type: 'Load' | 'Trip';
  transport?: ITransport[];
  load?: ILoads;
  proposed_price: number;
  currency: ICurrency;
  status: BidStatus;
  note?: string;
  date?: string;
  negotiation_round: number;
  negotiation_steps: NegotiationStepsItem[];
  is_chat_created: boolean;
  chat_room?: string;
  rating?: number;
  created_at: string;
  updated_at: string;
}

interface NegotiationStepsItem {
  _id: string;
  bid: string;
  author: {
    _id: string;
    fio: string;
  };
  price_offer: number;
  currency: ICurrency;
  comment?: string;
  status: string;
  step_number: number;
  accepted: boolean;
  rejected: boolean;
  created_at: string;
}

interface IBidsCreate {
  post: string;           // Load or Trip ID
  post_type: 'Load' | 'Trip';
  proposed_price: number;
  currency: string;
  transport?: string[];   // For Load bids
  load?: string;          // For Trip bids
  note?: string;
  date?: string;
}
```

---

## REST API Endpoints

### Bid Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/bids` | Create new bid | Yes |
| GET | `/bids/:postId/bids` | Get all bids on a post | Yes |
| GET | `/bids/:bidId` | Get bid details with negotiation steps | Yes |
| GET | `/bids/:bidId/transports` | Get transports attached to bid | Yes |
| POST | `/bids/:bidId/respond` | Accept, reject, or counter-offer | Yes |
| PUT | `/bids/:bidId` | Update bid (transport/load) | Yes |
| DELETE | `/bids/:bidId` | Delete pending bid | Yes |

### Negotiation Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/negotiation/step` | Add counter-offer step | Yes |
| POST | `/negotiation/respond` | Accept/reject negotiation step | Yes |
| GET | `/negotiation/bid/:bidId` | Get all negotiation steps for bid | Yes |

### Rating Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/bookings/rating-status/:postId` | Check if user rated | Yes |
| POST | `/bookings/rating` | Submit rating | Yes |

---

## API Request/Response Examples

### POST /bids (Create Bid)

**Request - Bid on Load (Carrier):**
```json
{
  "post": "load_id",
  "post_type": "Load",
  "proposed_price": 4500,
  "currency": "currency_id",
  "transport": ["transport_id_1", "transport_id_2"],
  "note": "Available for pickup on March 15th",
  "date": "2024-03-15"
}
```

**Request - Bid on Trip (Shipper):**
```json
{
  "post": "trip_id",
  "post_type": "Trip",
  "proposed_price": 2000,
  "currency": "currency_id",
  "load": "load_id",
  "note": "Need delivery by March 20th"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "bid_id",
    "status": "fixed",
    "negotiation_round": 0,
    "is_chat_created": false,
    "created_at": "2024-03-10T10:00:00Z"
  }
}
```

### GET /bids/:postId/bids

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "bid_id_1",
      "bidder": {
        "_id": "user_id",
        "fio": "John Carrier",
        "phone_number": "+998901234567",
        "avatar": "url"
      },
      "proposed_price": 4500,
      "currency": { "code": "USD", "symbol": "$" },
      "status": "fixed",
      "transport": [
        {
          "_id": "transport_id",
          "name": "DAF XF 480",
          "transport_type": { "name": "Tent Truck" }
        }
      ],
      "note": "Available immediately",
      "negotiation_round": 0,
      "created_at": "2024-03-10T10:00:00Z"
    },
    {
      "_id": "bid_id_2",
      "bidder": {
        "_id": "user_id_2",
        "fio": "Mike Transport",
        "phone_number": "+998907654321"
      },
      "proposed_price": 4200,
      "currency": { "code": "USD", "symbol": "$" },
      "status": "negotiation",
      "negotiation_round": 2,
      "created_at": "2024-03-10T11:00:00Z"
    }
  ]
}
```

### POST /bids/:bidId/respond

**Accept Bid:**
```json
{
  "action": "accept"
}
```

**Reject Bid:**
```json
{
  "action": "reject"
}
```

**Counter-Offer:**
```json
{
  "action": "counter",
  "counter_price": 4000,
  "currency": "currency_id",
  "comment": "Can you do it for less?"
}
```

**Response (Accept):**
```json
{
  "success": true,
  "data": {
    "_id": "bid_id",
    "status": "accepted",
    "is_chat_created": true,
    "chat_room": "chat_room_id"
  }
}
```

### POST /negotiation/step

**Request:**
```json
{
  "bid": "bid_id",
  "price_offer": 4300,
  "currency": "currency_id",
  "comment": "This is my best offer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "step_id",
    "bid": "bid_id",
    "step_number": 3,
    "price_offer": 4300,
    "currency": { "code": "USD" },
    "status": "pending",
    "created_at": "2024-03-10T14:00:00Z"
  }
}
```

### POST /negotiation/respond

**Request:**
```json
{
  "step_id": "step_id",
  "action": "accept"
}
```

---

## Negotiation Flow Diagrams

### Simple Flow (Accept/Reject)

```
Shipper                               Carrier
   │                                     │
   │◄───────POST /bids───────────────────┤
   │        (carrier bids on load)       │
   │                                     │
   ├───POST /bids/:id/respond───────────►│
   │   action: "accept"                  │
   │                                     │
   │   [Bid status → ACCEPTED]           │
   │   [Chat room created]               │
   │   [Load status → IN_CONTRACT]       │
```

### Multi-Round Negotiation Flow

```
Shipper (Load Owner)                  Carrier (Bidder)
   │                                     │
   │◄───────POST /bids───────────────────┤
   │        proposed_price: $5000        │
   │                                     │
   ├───POST /bids/:id/respond───────────►│
   │   action: "counter"                 │
   │   counter_price: $4000              │
   │   [Creates NegotiationStep #1]      │
   │   [Bid status → NEGOTIATION]        │
   │                                     │
   │◄──POST /negotiation/step────────────┤
   │   price_offer: $4500                │
   │   [Creates NegotiationStep #2]      │
   │                                     │
   ├───POST /negotiation/step───────────►│
   │   price_offer: $4200                │
   │   [Creates NegotiationStep #3]      │
   │                                     │
   │◄──POST /negotiation/respond─────────┤
   │   step_id: step_3, action: "accept" │
   │   [Bid status → ACCEPTED]           │
   │   [Chat room created]               │
```

### Complete Bid Lifecycle

```
┌─────────┐
│  FIXED  │ ─── Initial bid submitted
└────┬────┘
     │
     ▼
┌────────────────┐     Owner counter-offers     ┌─────────────┐
│ PRICE_REQUESTED│ ────────────────────────────►│ NEGOTIATION │
└────────────────┘                              └──────┬──────┘
                                                       │
                    ┌──────────────────────────────────┤
                    │                                  │
                    ▼                                  ▼
              ┌──────────┐                      ┌──────────┐
              │ ACCEPTED │                      │ REJECTED │
              └────┬─────┘                      └──────────┘
                   │
                   ▼ Booking created
              ┌─────────┐
              │ BOOKED  │
              └─────────┘
```

---

## Frontend-Backend Communication

### 1. View Bids on My Post

```
Frontend                              Backend
   │                                     │
   │   [Load owner views their load]     │
   ├─GET /loads/:id─────────────────────►│
   │◄────────────load details────────────┤
   │                                     │
   │   [View bids]                       │
   ├─GET /bids/:loadId/bids────────────►│
   │◄────────────bids list───────────────┤
   │                                     │
   │   [View specific bid detail]        │
   ├─GET /bids/:bidId──────────────────►│
   │◄────bid with negotiation steps──────┤
```

### 2. Create Bid on Load

```
Frontend                              Backend
   │                                     │
   │   [Carrier views load]              │
   ├─GET /loads/:id─────────────────────►│
   │◄────────────load details────────────┤
   │                                     │
   │   [Open booking dialog]             │
   │   [If negotiable: enter price]      │
   │   [Select transport]                │
   │   [Select date]                     │
   │                                     │
   ├─POST /bids────────────────────────►│
   │   {post, post_type, proposed_price, │
   │    currency, transport[], date}     │
   │◄────────────bid created─────────────┤
   │                                     │
   │   [Navigate to my bids]             │
```

### 3. Respond to Bid

```
Frontend                              Backend
   │                                     │
   │   [View bid detail]                 │
   ├─GET /bids/:bidId──────────────────►│
   │◄────────────bid details─────────────┤
   │                                     │
   │   [Option A: Accept]                │
   ├─POST /bids/:bidId/respond──────────►│
   │   action: "accept"                  │
   │◄────────────accepted────────────────┤
   │                                     │
   │   [Chat room auto-created]          │
   │   [Navigate to chat]                │
   │                                     │
   │   ─────── OR ───────                │
   │                                     │
   │   [Option B: Counter-offer]         │
   ├─POST /bids/:bidId/respond──────────►│
   │   action: "counter",                │
   │   counter_price: 4000               │
   │◄────────────negotiation started─────┤
```

### 4. Multi-Round Negotiation

```
Frontend                              Backend
   │                                     │
   │   [View negotiation steps]          │
   ├─GET /bids/:bidId──────────────────►│
   │◄────bid + negotiation_steps─────────┤
   │                                     │
   │   [Add counter-offer]               │
   ├─POST /negotiation/step────────────►│
   │   {bid, price_offer, currency}      │
   │◄────────────step created────────────┤
   │                                     │
   │   [Other party responds]            │
   │   [... steps repeat ...]            │
   │                                     │
   │   [Accept final step]               │
   ├─POST /negotiation/respond─────────►│
   │   {step_id, action: "accept"}       │
   │◄────────────deal closed─────────────┤
```

### 5. Post-Completion Rating

```
Frontend                              Backend
   │                                     │
   │   [After delivery completed]        │
   ├─GET /bookings/rating-status/:postId─►│
   │◄────────{has_rated: false}──────────┤
   │                                     │
   │   [Show rating dialog]              │
   ├─POST /bookings/rating─────────────►│
   │   {post_id, rating: 5,              │
   │    comment: "Great service"}        │
   │◄────────────rating saved────────────┤
```

---

## State Management (Frontend)

### React Query Hooks

```typescript
// Get bids on a post
const useGetBids = (postId: string) => {
  return useQuery({
    queryKey: ['bids', postId],
    queryFn: () => bidAPI.getBids(postId),
    enabled: !!postId,
  });
};

// Get single bid detail
const useGetBidById = (bidId: string) => {
  return useQuery({
    queryKey: ['bid', bidId],
    queryFn: () => bidAPI.getBidById(bidId),
    enabled: !!bidId,
  });
};

// Create bid mutation
const useCreateBids = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IBidsCreate) => bidAPI.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bids', variables.post] });
      toast.success(t('bid.created_success'));
    },
  });
};

// Respond to bid (accept/reject/counter)
const useRespondBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bidId, action, counterPrice, currency }: RespondBidParams) =>
      bidAPI.respondBid({ bidId, action, counterPrice, currency }),
    onSuccess: (_, { bidId }) => {
      queryClient.invalidateQueries({ queryKey: ['bid', bidId] });
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
  });
};

// Add negotiation step
const useAddNegotiationStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { bid: string; price_offer: number; currency: string; comment?: string }) =>
      bidAPI.negotiationStepsCreate(data),
    onSuccess: (_, { bid }) => {
      queryClient.invalidateQueries({ queryKey: ['bid', bid] });
    },
  });
};

// Accept negotiation step
const useAcceptNegotiationStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stepId, action }: { stepId: string; action: 'accept' | 'reject' }) =>
      bidAPI.respondNegotiationStep({ stepId, action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
  });
};

// Rate completed booking
const useRateBid = () => {
  return useMutation({
    mutationFn: (data: RateBidReq) => bidAPI.rateBid(data),
    onSuccess: () => {
      toast.success(t('rating.submitted'));
    },
  });
};
```

---

## Key Business Logic

### 1. Chat Room Creation

When a bid is accepted, a chat room is automatically created:

```typescript
// Backend: On bid accept
async function acceptBid(bidId: string) {
  const bid = await Bid.findById(bidId);

  // Create chat room
  const chatRoom = await ChatRoom.create({
    participants: [bid.bidder, bid.owner],
    identifierId: bidId,
    identifierType: 'BID',
  });

  // Update bid
  bid.status = 'accepted';
  bid.is_chat_created = true;
  bid.chat_room = chatRoom._id;
  await bid.save();

  // Update post status
  await updatePostStatus(bid.post, bid.post_type, 'in_contract');
}
```

### 2. Post Status Update

When bid is accepted, the load/trip status changes:

```typescript
// Load status: open → in_contract
// Trip status: open → in_contract
```

### 3. Polymorphic References

Bids can reference either Load or Trip using Mongoose's `refPath`:

```typescript
// Schema definition
{
  post: {
    type: Schema.Types.ObjectId,
    refPath: 'post_type',  // Dynamically determines collection
  },
  post_type: {
    type: String,
    enum: ['Load', 'Trip'],
  }
}

// Usage
const bid = await Bid.findById(id).populate('post');
// bid.post will be a Load or Trip document based on post_type
```

### 4. Bid Attachments

- **Load bids**: Carrier attaches their transport(s)
- **Trip bids**: Shipper can attach their load

```typescript
// Carrier bidding on load
{
  post: loadId,
  post_type: 'Load',
  transport: [transport1Id, transport2Id],  // Carrier's trucks
}

// Shipper bidding on trip
{
  post: tripId,
  post_type: 'Trip',
  load: loadId,  // Shipper's cargo
}
```

### 5. Updating Bid Attachments

Bidder can update attached resources before acceptance:

```typescript
// PUT /bids/:bidId
{
  transport: [newTransportId],  // Change offered trucks
  load: newLoadId,              // Change offered cargo
}
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `LoadBids.tsx` | List of bids on a load |
| `TripBids.tsx` | List of bids on a trip |
| `LoadBidDetail.tsx` | Bid detail with negotiation UI |
| `TripBidDetail.tsx` | Bid detail for trip |
| `MakeOfferDialog.tsx` | Initial bid creation dialog |
| `CounterOfferDialog.tsx` | Counter-offer input |
| `NegotiationSteps.tsx` | Display negotiation history |
| `SelectTransportDialog.tsx` | Attach transports to bid |
| `SelectLoadDialog.tsx` | Attach load to bid |
| `RateBidDialog.tsx` | Post-completion rating |
| `BidStatusBadge.tsx` | Status indicator |

---

## WebSocket Integration

When a bid is created or updated, real-time notifications are sent:

```typescript
// Events emitted to chat room participants
socket.emit('bid:created', {
  bidId,
  chatRoomId,
  bidderId,
  ownerId,
  price,
  currency,
  postType,
});

socket.emit('bid:updated', {
  bidId,
  chatRoomId,
  action,  // 'counter', 'accept', 'reject'
  price,
  currency,
  userId,
});
```

Frontend listens for these events:

```typescript
// In ChatWebSocketContext
socket.on('bid:created', (data) => {
  queryClient.invalidateQueries({ queryKey: ['bids'] });
  // Show notification
});

socket.on('bid:updated', (data) => {
  queryClient.invalidateQueries({ queryKey: ['bid', data.bidId] });
  // Update UI
});
```
