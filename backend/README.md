# SKULL Backend

Single-file Express + MongoDB backend for the SKULL storefront.

## What It Includes

- JWT authentication
- bcrypt password hashing
- profile update with password change support
- address management
- product catalog endpoints
- order creation and tracking
- UPI preview and payment confirmation
- COD order flow
- tax and shipping calculation
- MongoDB Atlas or local MongoDB support
- admin summary, users, and order status endpoints

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

Use your hosting provider or terminal environment to set:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<db>?retryWrites=true&w=majority
MONGODB_DB=skull_store
JWT_SECRET=replace-this-in-production
JWT_EXPIRES_IN=7d
DEFAULT_UPI_ID=joelvini2007@okicici
ADMIN_EMAIL=admin@skull.store
PORT=5000
```

If `MONGODB_URI` is not set, the server falls back to `mongodb://127.0.0.1:27017`.

### 3. Start the server

```bash
npm start
```

For development:

```bash
npm run dev
```

Quick syntax check:

```bash
npm run check
```

## Main Endpoints

### Health

- `GET /`
- `GET /health`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- Legacy compatibility:
  - `POST /api/register`
  - `POST /api/login`

### Profile

- `GET /api/profile`
- `PATCH /api/profile`

### Products

- `GET /api/products`
- `GET /api/products/:id`

### Addresses

- `GET /api/addresses`
- `POST /api/addresses`
- `PATCH /api/addresses/:addressId`
- `DELETE /api/addresses/:addressId`
- Legacy compatibility:
  - `POST /api/address`

### Orders and Payments

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:orderId`
- `POST /api/orders/:orderId/cancel`
- `POST /api/payment/preview`
- `POST /api/payment/confirm`
- Legacy compatibility:
  - `POST /api/order`

### Admin

- `GET /api/admin/summary`
- `GET /api/admin/orders`
- `GET /api/admin/users`
- `PATCH /api/admin/orders/:orderId/status`

## Example Payloads

### Register

```json
{
  "name": "Joel V",
  "email": "joel@example.com",
  "password": "secret123",
  "phone": "9876543210"
}
```

### Create Address

```json
{
  "label": "shipping",
  "fullName": "Joel V",
  "phone": "9876543210",
  "line1": "12 Street Name",
  "line2": "Near City Mall",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "country": "India",
  "isDefault": true
}
```

### Create Order

```json
{
  "items": [
    {
      "id": 1,
      "name": "Skull Oversized Tee",
      "category": "TOPS",
      "price": 799,
      "quantity": 2
    }
  ],
  "paymentMethod": "UPI",
  "upiId": "joelvini2007@okicici",
  "shippingAddress": {
    "fullName": "Joel V",
    "phone": "9876543210",
    "line1": "12 Street Name",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

### Confirm UPI Payment

```json
{
  "orderId": "<order-id>",
  "transactionId": "TXN123456789"
}
```

## Notes

- All protected routes require `Authorization: Bearer <token>`.
- The backend computes subtotal, shipping, tax, and total on the server.
- UPI handling here is a practical app flow for development, not a live bank gateway integration.
- An account becomes admin automatically when its email matches `ADMIN_EMAIL`.
