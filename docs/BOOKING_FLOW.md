# Booking Feature Documentation

## Overview

The Booking feature handles the finalization of accepted bids into orders. It tracks the delivery lifecycle and manages the bidirectional rating system for completed deliveries.

---

## Data Model

### Booking Schema (MongoDB)

```typescript
{
  _id: ObjectId,

  // Parties
  customer: ObjectId,           // ref: User - Who booked (load/trip owner)
  owner: ObjectId,              // ref: User - Service provider (transport/cargo owner)
  company: ObjectId,            // ref: Company - Associated company

  // Source
  post: ObjectId,               // ref: Load OR Trip (via refPath)
  post_type: 'Load' | 'Trip',
  bid: ObjectId,                // ref: Bid - The accepted bid

  // Pricing
  final_price: number,          // Agreed price from negotiation
  currency: ObjectId,           // ref: Currency

  // Status
  status: BookingStatus,        // See enum below

  // Ratings (Bidirectional)
  customers_rate: number,       // 1-5 stars
  customers_comment: string,    // Customer review text
  owners_rate: number,          // 1-5 stars
  owners_comment: string,       // Provider review text

  // Timestamps
  created_at: Date,
  updated_at: Date,
}
```

### BookingStatus Enum

```typescript
enum BookingStatus {
  PENDING = 'pending',      // Booking created, waiting for pickup
  BOOKED = 'booked',        // Confirmed and active
  CANCELLED = 'cancelled',  // Cancelled by either party
  COMPLETED = 'completed',  // Delivery completed
}
```

### Frontend Type Definition

```typescript
interface IBooking {
  _id: string;
  customer: {
    _id: string;
    fio: string;
    phone_number: string;
    avatar?: string;
  };
  owner: {
    _id: string;
    fio: string;
    phone_number: string;
    avatar?: string;
  };
  company?: {
    _id: string;
    company_name: string;
  };
  post: ILoads | TripList;
  post_type: 'Load' | 'Trip';
  bid: IBids;
  final_price: number;
  currency: ICurrency;
  status: BookingStatus;
  customers_rate?: number;
  customers_comment?: string;
  owners_rate?: number;
  owners_comment?: string;
  created_at: string;
  updated_at: string;
}

interface CreateBookingRequest {
  bid: string;              // Accepted bid ID
  final_price: number;
  currency: string;
}

interface RateBidRequest {
  post_id: string;
  rating: number;           // 1-5
  comment?: string;
}
```

---

## REST API Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/bookings` | Create booking from accepted bid | Yes |
| GET | `/bookings/my` | Get my bookings (as customer) | Yes |
| GET | `/bookings/:id` | Get booking details | Yes |
| PATCH | `/bookings/:id/status` | Update booking status | Yes |
| POST | `/bookings/rating` | Submit rating for completed booking | Yes |
| GET | `/bookings/rating-status/:postId` | Check if user has rated | Yes |

---

## API Request/Response Examples

### POST /bookings

**Request:**
```json
{
  "bid": "bid_id",
  "final_price": 4200,
  "currency": "currency_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "booking_id",
    "customer": {
      "_id": "user_id",
      "fio": "John Shipper"
    },
    "owner": {
      "_id": "user_id_2",
      "fio": "Mike Carrier"
    },
    "post": {
      "_id": "load_id",
      "from": { "city": "Tashkent" },
      "to": { "city": "Moscow" }
    },
    "post_type": "Load",
    "bid": "bid_id",
    "final_price": 4200,
    "currency": { "code": "USD", "symbol": "$" },
    "status": "pending",
    "created_at": "2024-03-15T10:00:00Z"
  }
}
```

### GET /bookings/my

**Query Parameters:**
```
page=1
limit=20
status=completed
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "booking_id",
        "customer": {
          "_id": "user_id",
          "fio": "John Shipper"
        },
        "owner": {
          "_id": "user_id_2",
          "fio": "Mike Carrier"
        },
        "post": {
          "_id": "load_id",
          "from": { "city": "Tashkent" },
          "to": { "city": "Moscow" },
          "price": 5000
        },
        "post_type": "Load",
        "final_price": 4200,
        "currency": { "code": "USD" },
        "status": "completed",
        "customers_rate": 5,
        "customers_comment": "Excellent service!",
        "owners_rate": 5,
        "owners_comment": "Great cargo, on time",
        "created_at": "2024-03-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

### PATCH /bookings/:id/status

**Request:**
```json
{
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "booking_id",
    "status": "completed",
    "updated_at": "2024-03-20T14:00:00Z"
  }
}
```

### POST /bookings/rating

**Request:**
```json
{
  "post_id": "load_id",
  "rating": 5,
  "comment": "Excellent service, delivered on time!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Rating submitted successfully"
  }
}
```

### GET /bookings/rating-status/:postId

**Response:**
```json
{
  "success": true,
  "data": {
    "has_rated": false,
    "can_rate": true
  }
}
```

---

## Booking Lifecycle Flow

### Complete Flow Diagram

```
                         Bid Accepted
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BOOKING CREATED                              │
│                     Status: PENDING                              │
│  - Bid status → BOOKED                                          │
│  - Post status → IN_CONTRACT                                    │
│  - Chat room available                                          │
└────────────────────────────┬─────────────────────────────────────┘
                              │
                    Carrier picks up cargo
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Status: BOOKED                               │
│  - Actively in transit                                          │
│  - Post status → IN_TRANSIT                                     │
│  - Both parties can communicate via chat                        │
└────────────────────────────┬─────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    Delivery Complete    Problem Occurs      User Cancels
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    COMPLETED    │   │   Dispute via   │   │   CANCELLED     │
│                 │   │     Support     │   │                 │
│ - Post → DELIVERED │ └─────────────────┘   │ - Post → OPEN   │
│ - Ratings enabled│                         │ - Reason logged │
└────────┬────────┘                         └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RATING PHASE                                 │
│  - Customer rates provider                                      │
│  - Provider rates customer                                      │
│  - Both ratings contribute to company/user score                │
└─────────────────────────────────────────────────────────────────┘
```

### Status Transitions

```
PENDING ──► BOOKED ──► COMPLETED
    │           │
    │           └──► CANCELLED
    │
    └──► CANCELLED
```

---

## Frontend-Backend Communication

### 1. Booking Creation (After Bid Accepted)

```
Frontend                              Backend
   │                                     │
   │   [Bid is accepted]                 │
   ├─POST /bids/:bidId/respond──────────►│
   │   action: "accept"                  │
   │◄────────────bid accepted────────────┤
   │                                     │
   │   [Backend auto-creates booking]    │
   │                                     │
   │   OR Manual booking creation:       │
   ├─POST /bookings────────────────────►│
   │   {bid, final_price, currency}      │
   │◄────────────booking created─────────┤
```

### 2. View My Bookings

```
Frontend                              Backend
   │                                     │
   ├─GET /bookings/my?status=pending────►│
   │◄────────────my bookings─────────────┤
   │                                     │
   │   [View specific booking]           │
   ├─GET /bookings/:id─────────────────►│
   │◄────────────booking details─────────┤
```

### 3. Update Booking Status

```
Frontend                              Backend
   │                                     │
   │   [Carrier marks pickup]            │
   ├─PATCH /bookings/:id/status────────►│
   │   {status: "booked"}                │
   │◄────────────status updated──────────┤
   │                                     │
   │   [Also update load/trip status]    │
   ├─PUT /loads/:id/status─────────────►│
   │   {status: "in_transit"}            │
   │◄────────────status updated──────────┤
   │                                     │
   │   [Delivery completed]              │
   ├─PATCH /bookings/:id/status────────►│
   │   {status: "completed"}             │
   │◄────────────status updated──────────┤
   │                                     │
   ├─PUT /loads/:id/status─────────────►│
   │   {status: "delivered"}             │
   │◄────────────status updated──────────┤
```

### 4. Rating Flow

```
Frontend                              Backend
   │                                     │
   │   [Check if can rate]               │
   ├─GET /bookings/rating-status/:postId►│
   │◄────────{has_rated: false}──────────┤
   │                                     │
   │   [Show rating dialog]              │
   │   User selects 1-5 stars            │
   │   User enters comment               │
   │                                     │
   ├─POST /bookings/rating─────────────►│
   │   {post_id, rating: 5, comment}     │
   │◄────────────rating saved────────────┤
   │                                     │
   │   [Company/user rating updated]     │
```

---

## State Management (Frontend)

### React Query Hooks

```typescript
// Get my bookings
const useGetMyBookings = (params?: { status?: BookingStatus }) => {
  return useQuery({
    queryKey: ['bookings', 'my', params],
    queryFn: () => bookingAPI.getMyBookings(params),
  });
};

// Get booking by ID
const useGetBooking = (id: string) => {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingAPI.getBookingById(id),
    enabled: !!id,
  });
};

// Update booking status
const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      bookingAPI.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

// Check rating status
const useCheckRatingStatus = (postId: string) => {
  return useQuery({
    queryKey: ['rating-status', postId],
    queryFn: () => bidAPI.checkPostRating(postId),
    enabled: !!postId,
  });
};

// Submit rating
const useRateBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RateBidRequest) => bidAPI.rateBid(data),
    onSuccess: (_, { post_id }) => {
      queryClient.invalidateQueries({ queryKey: ['rating-status', post_id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success(t('rating.submitted'));
    },
  });
};
```

---

## Key Business Logic

### 1. Booking Creation from Bid

When a bid is accepted, a booking is created:

```typescript
// Backend: Create booking from bid
async function createBookingFromBid(bidId: string) {
  const bid = await Bid.findById(bidId)
    .populate('bidder')
    .populate('owner')
    .populate('post');

  // Determine customer and owner based on post type
  let customer, owner;
  if (bid.post_type === 'Load') {
    // Load bid: Load owner is customer, bidder is carrier (owner)
    customer = bid.owner;  // Load owner
    owner = bid.bidder;    // Carrier who bid
  } else {
    // Trip bid: Trip owner is carrier (owner), bidder is customer
    customer = bid.bidder; // Shipper who bid
    owner = bid.owner;     // Trip owner (carrier)
  }

  const booking = await Booking.create({
    customer: customer._id,
    owner: owner._id,
    company: bid.post.company,
    post: bid.post._id,
    post_type: bid.post_type,
    bid: bid._id,
    final_price: bid.proposed_price,
    currency: bid.currency,
    status: 'pending',
  });

  // Update bid status
  bid.status = 'booked';
  await bid.save();

  // Update post status
  await updatePostStatus(bid.post._id, bid.post_type, 'in_contract');

  return booking;
}
```

### 2. Bidirectional Rating System

Both parties can rate each other after completion:

```typescript
// Backend: Submit rating
async function submitRating(userId: string, postId: string, rating: number, comment: string) {
  const booking = await Booking.findOne({ post: postId });

  if (!booking || booking.status !== 'completed') {
    throw new Error('Cannot rate incomplete booking');
  }

  // Determine which rating field to update
  if (booking.customer.toString() === userId) {
    // Customer rating the owner (carrier)
    booking.customers_rate = rating;
    booking.customers_comment = comment;

    // Update owner's company rating
    await updateCompanyRating(booking.owner, rating);
  } else if (booking.owner.toString() === userId) {
    // Owner rating the customer (shipper)
    booking.owners_rate = rating;
    booking.owners_comment = comment;

    // Update customer's company rating
    await updateCompanyRating(booking.customer, rating);
  }

  await booking.save();
}

// Update company aggregate rating
async function updateCompanyRating(userId: string, newRating: number) {
  const user = await User.findById(userId).populate('active_company_id');
  const company = user.active_company_id;

  if (company) {
    // Recalculate average rating
    const newCount = company.count_ratings + 1;
    const newAverage = ((company.rating * company.count_ratings) + newRating) / newCount;

    company.rating = newAverage;
    company.count_ratings = newCount;
    await company.save();
  }
}
```

### 3. Status Sync with Post

Booking status should sync with the associated load/trip:

```typescript
// Status mapping
const statusMapping = {
  'pending': 'in_contract',
  'booked': 'in_transit',
  'completed': 'delivered',
  'cancelled': 'open',
};

async function syncPostStatus(bookingId: string, newStatus: BookingStatus) {
  const booking = await Booking.findById(bookingId);
  const postStatus = statusMapping[newStatus];

  if (booking.post_type === 'Load') {
    await Load.findByIdAndUpdate(booking.post, { status: postStatus });
  } else {
    await Trip.findByIdAndUpdate(booking.post, { status: postStatus });
  }
}
```

### 4. Company Booking History

Get all bookings associated with a company:

```typescript
// GET /company/:id/bookings
async function getCompanyBookings(companyId: string, status?: BookingStatus) {
  return Booking.find({
    company: companyId,
    ...(status && { status }),
  })
    .populate('customer', 'fio phone_number avatar')
    .populate('owner', 'fio phone_number avatar')
    .populate('post')
    .sort({ created_at: -1 });
}
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `BookingsList.tsx` | List of user's bookings |
| `BookingCard.tsx` | Booking preview card |
| `BookingDetail.tsx` | Full booking details |
| `BookingStatusBadge.tsx` | Status indicator |
| `RateBidDialog.tsx` | Rating submission modal |
| `RatingStars.tsx` | Star rating input |
| `BookingActions.tsx` | Status update buttons |

---

## Rating Statistics

### Company Rating Calculation

```typescript
interface CompanyRatingStats {
  averageRating: number;      // 1-5 scale
  totalRatings: number;
  ratingDistribution: {
    5: number;  // Count of 5-star ratings
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recentReviews: {
    rating: number;
    comment: string;
    author: string;
    date: Date;
  }[];
}

// GET /company/:id/ratings
async function getCompanyRatings(companyId: string) {
  const bookings = await Booking.find({
    company: companyId,
    status: 'completed',
    $or: [
      { customers_rate: { $exists: true } },
      { owners_rate: { $exists: true } },
    ],
  });

  // Calculate statistics
  const ratings = bookings.flatMap(b => [b.customers_rate, b.owners_rate].filter(Boolean));

  return {
    averageRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    totalRatings: ratings.length,
    ratingDistribution: calculateDistribution(ratings),
    recentReviews: getRecentReviews(bookings),
  };
}
```

---

## Integration Points

### 1. Bid Service → Booking Service

```typescript
// When bid is accepted
bidService.on('bid:accepted', async (bid) => {
  await bookingService.createFromBid(bid);
});
```

### 2. Booking Service → Post Service

```typescript
// When booking status changes
bookingService.on('status:changed', async (booking, newStatus) => {
  await postService.updateStatus(booking.post, booking.post_type, newStatus);
});
```

### 3. Booking Service → Chat Service

```typescript
// Booking status messages in chat
bookingService.on('status:changed', async (booking, newStatus) => {
  await chatService.sendSystemMessage(booking.chat_room, {
    type: 'STATUS',
    content: `Booking ${newStatus}`,
    metadata: { bookingId: booking._id, status: newStatus },
  });
});
```

### 4. Booking Service → Notification Service

```typescript
// Notify parties of status changes
bookingService.on('status:changed', async (booking, newStatus) => {
  await notificationService.send({
    users: [booking.customer, booking.owner],
    title: t('booking.status_changed'),
    body: t(`booking.status.${newStatus}`),
    data: { bookingId: booking._id },
  });
});
```
