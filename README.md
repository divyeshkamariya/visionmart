# VisionMart — MERN Stack E-commerce Portfolio Project

VisionMart is a learning/portfolio e-commerce application built with React, Vite, Node.js, Express, MongoDB and Mongoose. It includes product browsing/search/filtering, a persistent database product catalogue, JWT authentication, protected checkout/order history, order cancellation, inventory validation, server-side pagination/search, and an admin product-management interface.

> **Scope:** Checkout is currently cash-on-delivery/demo order creation only. No payment provider is connected. Run the full setup and test the flows before describing the app as deployed or production-ready.

## Tech stack

- **Frontend:** React, React Router, Vite, CSS
- **Backend:** Node.js, Express REST API
- **Database:** MongoDB + Mongoose
- **Authentication:** bcrypt password hashing + JWT bearer tokens
- **Security:** helmet, rate limiting on auth routes, CORS allow-list
- **Quality checks:** ESLint, Vite production build and API tests (Node test runner + Supertest)

## Requirements

- Node.js 20.19+ (or a version supported by the installed Vite version)
- npm
- Local MongoDB or a MongoDB Atlas database

## 1. Configure the backend

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env` and configure:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/visionmart
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Use a long random secret and never commit `.env` files or real credentials.

Seed sample products (safe to run more than once; it keeps products with matching names):

```bash
npm run seed:products
```

Start the API:

```bash
npm run dev
```

Health check: `http://localhost:5000/api/health`

## 2. Configure and start the frontend

From the project root:

```bash
npm install
```

Copy `.env.example` to `.env` if your API is not at the default local address. Example:

```env
VITE_API_URL=http://localhost:5000/api
```

Start Vite:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## 3. Admin setup for local development

New registrations receive the `user` role by default. To promote a trusted local test account, use MongoDB Shell after registering the account (replace the email):

```javascript
db.users.updateOne(
  { email: "your-test-account@example.com" },
  { $set: { role: "admin" } }
)
```

Log out and log in again so the frontend receives the updated role. Never expose an admin account or use this manual process as a public admin-provisioning feature.

## Main API routes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | API health check |
| POST | `/api/auth/register` | Public | Register and hash password (rate limited) |
| POST | `/api/auth/login` | Public | Verify credentials and return JWT (rate limited) |
| GET | `/api/auth/me` | Signed in | Verify current session |
| GET | `/api/products` | Public | List active products. Query: `page`, `limit` (max 100), `search`, `category`, `sort` (`newest`, `price-asc`, `price-desc`) |
| GET | `/api/products/categories` | Public | Distinct categories of active products |
| GET | `/api/products/:id` | Public | Product details |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Soft-delete product |
| GET | `/api/orders` | Signed in | Current user's orders (`page`, `limit`) |
| POST | `/api/orders` | Signed in | Create order after server-side price/stock checks |
| PATCH | `/api/orders/:orderId/cancel` | Signed in | Cancel own order while it is still `placed`; stock is returned |
| GET | `/api/orders/admin/all` | Admin | List all orders (`page`, `limit`) |
| PATCH | `/api/orders/:orderId/status` | Admin | Advance order status one step at a time |

List endpoints return `{ total, page, limit, pages, ... }` alongside the data.

## Quality checks

Run from the root folder:

```bash
npm run lint
npm run build
```

Run from `backend/`:

```bash
npm test
```

The API tests mock the database layer, so they run without MongoDB. They cover auth checks, role checks, pagination limits, server-side price calculation, stock reservation/rollback, and order cancellation.

## Before public deployment

- Configure production `MONGODB_URI`, a unique `JWT_SECRET`, and comma-separated allowed `CLIENT_URL` origins in the host's environment settings.
- Deploy frontend and backend over HTTPS; set `VITE_API_URL` to the deployed API URL and rebuild the frontend.
- Add UI tests and an integration test suite that runs against a real test database.
- Consider moving JWTs from local storage to secure, HttpOnly cookies with CSRF protections for a stronger browser security model.
- Add a payment provider only if real online payments are required. Current checkout does not collect payment.
- Verify product images/licensing, error monitoring, backups, and mobile layouts before presenting a production deployment.

## Security and repository hygiene

`.env`, local environment overrides, `node_modules`, and build output are excluded from the repository. Commit `.env.example` files only, with placeholders and no secrets.
