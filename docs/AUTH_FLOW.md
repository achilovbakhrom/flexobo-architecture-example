# Authentication Flow Documentation

## Overview

The Authentication feature handles user registration, login, password management, and session management. It supports multiple authentication methods including phone number, email, and Telegram.

---

## Data Model

### User Schema (MongoDB)

```typescript
{
  _id: ObjectId,

  // Identification
  user_unique_id: string,           // Unique user identifier
  telegram_id: string,              // Telegram user ID (if linked)

  // Contact
  phone_number: string,             // Primary phone
  email: string,                    // Email address

  // Profile
  fio: string,                      // Full name
  avatar: string,                   // Profile picture URL
  password: string,                 // Hashed password

  // Location
  country: ObjectId,                // ref: Country
  city: string,

  // Preferences
  user_lang: 'uz' | 'ru' | 'en',    // Language preference
  translation_enabled: boolean,     // Auto-translation feature

  // Role & Status
  role: 'user' | 'admin' | 'superadmin',
  status: UserStatus,
  status_history: [{
    status: UserStatus,
    reason: string,
    changedBy: ObjectId,
    changedAt: Date,
  }],

  // Verification
  verify_status: VerifyStatus,
  auth_method: AuthMethod,

  // Company
  active_company_id: ObjectId,      // ref: Company - Currently active

  // Legal
  is_subscribed_newsletter: boolean,
  is_privacy_policy_accepted: boolean,

  // Platform
  platform: 'web' | 'mobile' | 'telegram',

  // Timestamps
  created_at: Date,
  updated_at: Date,
}
```

### OTP Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  identifier: string,               // Phone or email
  code: string,                     // OTP code (hashed)
  type: 'phone' | 'email',
  purpose: 'registration' | 'login' | 'password_reset',
  attempts: number,                 // Failed attempts
  expires_at: Date,
  created_at: Date,
}
```

### Enums

```typescript
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

enum VerifyStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

enum AuthMethod {
  PHONE_NUMBER = 'phone-number',
  EMAIL = 'email',
  TELEGRAM = 'telegram',
}

enum AuthPlatform {
  WEB = 'web',
  MOBILE = 'mobile',
  TELEGRAM = 'telegram',
}
```

### Frontend Type Definitions

```typescript
interface User {
  _id: string;
  user_unique_id: string;
  phone_number: string;
  email?: string;
  fio: string;
  avatar?: string;
  country?: ICountry;
  city?: string;
  user_lang: 'uz' | 'ru' | 'en';
  translation_enabled: boolean;
  role: 'user' | 'admin' | 'superadmin';
  status: UserStatus;
  verify_status: VerifyStatus;
  active_company_id?: string;
  platform: AuthPlatform;
  created_at: string;
}

interface SignUpRequest {
  phone_number?: string;
  email?: string;
  fio: string;
  password: string;
  otp: string;
  country?: string;
  user_lang?: string;
  is_privacy_policy_accepted: boolean;
}

interface SignInRequest {
  phone_number?: string;
  email?: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  user: User;
}
```

---

## REST API Endpoints

### Authentication

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/auth/otp/email` | Send OTP to email | No |
| POST | `/auth/otp-bot/phone-number` | Send OTP to phone (via Telegram bot) | No |
| POST | `/auth/verify-otp` | Verify OTP code | No |
| POST | `/auth/signup` | Register new user | No |
| POST | `/auth/signin` | Login user | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with OTP | No |
| POST | `/auth/token-generate` | Generate token (Telegram auth) | No |
| POST | `/auth/logout` | Logout user | Yes |

### User Profile

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/user/me` | Get current user | Yes |
| PUT | `/user/:id` | Update user profile | Yes |
| PUT | `/user/change-password` | Change password | Yes |
| PUT | `/user/:id/lang` | Update language | Yes |

---

## API Request/Response Examples

### POST /auth/otp/email

**Request:**
```json
{
  "email": "user@example.com",
  "for_registration": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent to email",
    "expires_in": 300
  }
}
```

### POST /auth/otp-bot/phone-number

**Request:**
```json
{
  "phone_number": "+998901234567",
  "for_registration": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent via Telegram bot",
    "expires_in": 300
  }
}
```

### POST /auth/verify-otp

**Request:**
```json
{
  "identifier": "+998901234567",
  "code": "123456",
  "type": "phone"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "token": "verification_token"
  }
}
```

### POST /auth/signup

**Request:**
```json
{
  "phone_number": "+998901234567",
  "fio": "John Doe",
  "password": "SecurePass123!",
  "otp": "123456",
  "country": "country_id",
  "user_lang": "en",
  "is_privacy_policy_accepted": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "user_id",
      "user_unique_id": "USR-2024-001",
      "phone_number": "+998901234567",
      "fio": "John Doe",
      "role": "user",
      "status": "active",
      "verify_status": "pending",
      "created_at": "2024-03-01T10:00:00Z"
    }
  }
}
```

### POST /auth/signin

**Request:**
```json
{
  "phone_number": "+998901234567",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "user_id",
      "fio": "John Doe",
      "phone_number": "+998901234567",
      "role": "user",
      "status": "active"
    }
  }
}
```

### POST /auth/forgot-password

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset OTP sent",
    "expires_in": 300
  }
}
```

### POST /auth/reset-password

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

---

## Authentication Flows

### 1. Phone Registration Flow

```
Frontend                              Backend
   │                                     │
   │   [User enters phone number]        │
   │                                     │
   ├─POST /auth/otp-bot/phone-number───►│
   │   {phone_number, for_registration}  │
   │◄────────────OTP sent────────────────┤
   │                                     │
   │   [Telegram bot sends OTP]          │
   │   [User enters OTP]                 │
   │                                     │
   ├─POST /auth/verify-otp─────────────►│
   │   {identifier, code, type: 'phone'} │
   │◄────────────verified────────────────┤
   │                                     │
   │   [User fills registration form]    │
   │                                     │
   ├─POST /auth/signup─────────────────►│
   │   {phone, fio, password, otp, ...}  │
   │◄────────{access_token, user}────────┤
   │                                     │
   │   [Store token in localStorage]     │
   │   [Redirect to dashboard]           │
```

### 2. Email Registration Flow

```
Frontend                              Backend
   │                                     │
   │   [User enters email]               │
   │                                     │
   ├─POST /auth/otp/email──────────────►│
   │   {email, for_registration: true}   │
   │◄────────────OTP sent────────────────┤
   │                                     │
   │   [Email with OTP is sent]          │
   │   [User enters OTP]                 │
   │                                     │
   ├─POST /auth/verify-otp─────────────►│
   │   {identifier, code, type: 'email'} │
   │◄────────────verified────────────────┤
   │                                     │
   │   [User fills registration form]    │
   │                                     │
   ├─POST /auth/signup─────────────────►│
   │   {email, fio, password, otp, ...}  │
   │◄────────{access_token, user}────────┤
```

### 3. Login Flow

```
Frontend                              Backend
   │                                     │
   │   [User enters credentials]         │
   │                                     │
   ├─POST /auth/signin─────────────────►│
   │   {phone_number, password}          │
   │       OR                            │
   │   {email, password}                 │
   │◄────────{access_token, user}────────┤
   │                                     │
   │   [Store token in localStorage]     │
   │   [Set axios header]                │
   │   [Redirect to dashboard]           │
```

### 4. Password Reset Flow

```
Frontend                              Backend
   │                                     │
   │   [User clicks "Forgot Password"]   │
   │                                     │
   ├─POST /auth/forgot-password────────►│
   │   {email}                           │
   │◄────────────OTP sent────────────────┤
   │                                     │
   │   [User receives email with OTP]    │
   │   [User enters OTP + new password]  │
   │                                     │
   ├─POST /auth/reset-password─────────►│
   │   {email, otp, new_password}        │
   │◄────────────success─────────────────┤
   │                                     │
   │   [Redirect to login]               │
```

### 5. Telegram Authentication Flow

```
Frontend                              Telegram Bot                Backend
   │                                     │                           │
   │   [User clicks "Login via Telegram"]│                           │
   │                                     │                           │
   │◄───────────Open Telegram Bot────────┤                           │
   │                                     │                           │
   │                           [User sends /start]                   │
   │                                     ├─Validate user────────────►│
   │                                     │◄─────────user data────────┤
   │                                     │                           │
   │                           [Bot sends auth link/token]           │
   │                                     │                           │
   │◄──────────Click auth link───────────┤                           │
   │                                     │                           │
   ├─POST /auth/token-generate─────────►│◄──────────────────────────┤
   │   {telegram_data}                   │                           │
   │◄────────{access_token, user}────────┤                           │
```

### 6. Logout Flow

```
Frontend                              Backend
   │                                     │
   ├─POST /auth/logout─────────────────►│
   │   Authorization: Bearer {token}     │
   │◄────────────success─────────────────┤
   │                                     │
   │   [Remove token from localStorage]  │
   │   [Clear axios header]              │
   │   [Clear React Query cache]         │
   │   [Redirect to login]               │
```

---

## State Management (Frontend)

### Auth Context

```typescript
// Auth context type
interface AuthContextType {
  user: User | null;
  company: Company | null;
  permissions: IPermission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: SignInRequest) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

// Auth provider
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: SignInRequest) => {
    const response = await authAPI.signIn(credentials);
    localStorage.setItem('token', response.data.access_token);
    setUser(response.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### useGetUserMe Hook

```typescript
// Comprehensive user data hook
const useGetUserMe = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const [userRes, companyRes, permissionsRes] = await Promise.all([
        profileAPI.getUser(),
        profileAPI.getUserCompany(),
        profileAPI.getMyPermissions(),
      ]);

      return {
        user: userRes.data,
        company: companyRes.data,
        permissions: permissionsRes.data?.permissions || [],
      };
    },
    enabled: !!localStorage.getItem('token'),
  });

  useEffect(() => {
    setIsAuthenticated(!!data?.user);
  }, [data]);

  return {
    user: data?.user,
    company: data?.company,
    permissions: data?.permissions,
    isAuthenticated,
    isLoading,
  };
};
```

### Axios Interceptor

```typescript
// HTTP client with auth interceptor
const http = axios.create({
  baseURL: import.meta.env.VITE_HOST_API,
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor - Add auth token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const language = localStorage.getItem('language') || 'uz';
  const currency = localStorage.getItem('currency') || 'USD';

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['x-language-code'] = language;
  config.headers['x-currency-Code'] = currency;

  return config;
});

// Response interceptor - Handle 401
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/sign-in';
    }
    throw error;
  }
);
```

---

## Protected Routes

### Route Guards

```typescript
// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useGetUserMe();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
};

// Auth route wrapper (for login/signup pages)
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useGetUserMe();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Usage in router
<Routes>
  {/* Public routes */}
  <Route path="/sign-in" element={<AuthRoute><SignIn /></AuthRoute>} />
  <Route path="/sign-up" element={<AuthRoute><SignUp /></AuthRoute>} />

  {/* Protected routes */}
  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/loads" element={<ProtectedRoute><Loads /></ProtectedRoute>} />
</Routes>
```

---

## Key Business Logic

### 1. OTP Generation & Validation

```typescript
// Backend: Generate OTP
async function generateOTP(identifier: string, type: 'phone' | 'email', purpose: string) {
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash for storage
  const hashedCode = await bcrypt.hash(code, 10);

  // Store with expiry
  await OTP.create({
    identifier,
    code: hashedCode,
    type,
    purpose,
    attempts: 0,
    expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });

  // Send via appropriate channel
  if (type === 'phone') {
    await telegramBot.sendOTP(identifier, code);
  } else {
    await emailService.sendOTP(identifier, code);
  }

  return { expires_in: 300 };
}

// Backend: Verify OTP
async function verifyOTP(identifier: string, code: string, type: string) {
  const otp = await OTP.findOne({
    identifier,
    type,
    expires_at: { $gt: new Date() },
  });

  if (!otp) {
    throw new Error('OTP expired or not found');
  }

  if (otp.attempts >= 3) {
    throw new Error('Too many attempts');
  }

  const isValid = await bcrypt.compare(code, otp.code);

  if (!isValid) {
    otp.attempts += 1;
    await otp.save();
    throw new Error('Invalid OTP');
  }

  // Mark as used
  await OTP.deleteOne({ _id: otp._id });

  return { verified: true };
}
```

### 2. JWT Token Generation

```typescript
// Backend: Generate JWT
async function generateToken(user: User) {
  const payload = {
    sub: user._id,
    role: user.role,
    company: user.active_company_id,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  return token;
}

// Backend: Verify JWT
async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

### 3. Password Security

```typescript
// Backend: Hash password
async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

// Backend: Verify password
async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Password validation rules
const passwordRules = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
};
```

### 4. User Status Management

```typescript
// Backend: Update user status with history
async function updateUserStatus(userId: string, newStatus: UserStatus, reason: string, changedBy: string) {
  const user = await User.findById(userId);

  user.status_history.push({
    status: newStatus,
    reason,
    changedBy,
    changedAt: new Date(),
  });

  user.status = newStatus;
  await user.save();

  // If suspended, invalidate sessions
  if (newStatus === 'suspended') {
    await invalidateUserSessions(userId);
  }
}
```

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `SignIn.tsx` | Login page |
| `SignUp.tsx` | Registration page |
| `ForgotPassword.tsx` | Password reset request |
| `ResetPassword.tsx` | New password entry |
| `OtpInput.tsx` | 6-digit OTP input |
| `PhoneInput.tsx` | Phone number with country code |
| `PasswordInput.tsx` | Password with visibility toggle |
| `AuthLayout.tsx` | Layout wrapper for auth pages |
| `ProtectedRoute.tsx` | Route guard component |
| `ProfilePage.tsx` | User profile view |
| `UpdateProfilePage.tsx` | Edit profile form |
| `ChangePasswordDialog.tsx` | Password change modal |

---

## Form Validation (Frontend)

```typescript
// Sign up validation schema
const signUpSchema = z.object({
  phone_number: z.string().optional(),
  email: z.string().email().optional(),
  fio: z.string().min(2, 'Name is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
  confirm_password: z.string(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  is_privacy_policy_accepted: z.boolean().refine(val => val, 'Must accept privacy policy'),
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords must match',
  path: ['confirm_password'],
}).refine(data => data.phone_number || data.email, {
  message: 'Phone or email is required',
});

// Sign in validation schema
const signInSchema = z.object({
  phone_number: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(data => data.phone_number || data.email, {
  message: 'Phone or email is required',
});
```

---

## Security Considerations

1. **Token Storage**: JWT stored in localStorage (consider httpOnly cookies for production)
2. **OTP Expiry**: 5-minute expiration with max 3 attempts
3. **Password Hashing**: bcrypt with cost factor 12
4. **Rate Limiting**: Limit OTP requests per identifier
5. **Session Invalidation**: Invalidate on password change or status change
6. **HTTPS Only**: All auth endpoints require HTTPS
7. **CORS**: Configured for specific origins only
