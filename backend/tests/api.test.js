// API tests. They run without a real database: Mongoose model methods are
// mocked with node:test's `mock`, so only our route logic is tested.
//
// Run with:  npm test

import { test, describe, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-for-automated-tests-only";

const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const { default: Product } = await import("../src/models/Product.js");
const { default: Order } = await import("../src/models/Order.js");

const newId = () => new mongoose.Types.ObjectId().toString();

function tokenFor(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

// Makes requireAuth accept our test token and return a user with the given role.
function mockLoggedInUser(role = "user") {
  const id = newId();

  mock.method(User, "findById", async () => ({
    _id: id,
    role,
    name: "Test User",
    email: "test@example.com",
  }));

  return { id, token: tokenFor(id) };
}

const validDelivery = {
  customerName: "Test User",
  phone: "9876543210",
  shippingAddress: "12 Test Street, Ahmedabad",
};

afterEach(() => {
  mock.restoreAll();
});

describe("basic API behaviour", () => {
  test("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");

    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
  });

  test("security headers are set and x-powered-by is hidden", async () => {
    const res = await request(app).get("/api/health");

    assert.ok(res.headers["x-content-type-options"]);
    assert.equal(res.headers["x-powered-by"], undefined);
  });

  test("unknown API route returns 404", async () => {
    const res = await request(app).get("/api/does-not-exist");

    assert.equal(res.status, 404);
  });

  test("malformed JSON returns 400 instead of 500", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{ not valid json");

    assert.equal(res.status, 400);
  });

  test("request from a disallowed origin is rejected with 403", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", "https://evil.example.com");

    assert.equal(res.status, 403);
  });
});

describe("auth", () => {
  test("register rejects a short password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "test@example.com",
      password: "short",
    });

    assert.equal(res.status, 400);
  });

  test("register rejects an invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "not-an-email",
      password: "long-enough-password",
    });

    assert.equal(res.status, 400);
  });

  test("login with unknown user returns 401", async () => {
    mock.method(User, "findOne", () => ({ select: async () => null }));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "whatever123" });

    assert.equal(res.status, 401);
  });

  test("GET /api/auth/me without a token returns 401", async () => {
    const res = await request(app).get("/api/auth/me");

    assert.equal(res.status, 401);
  });

  test("a token signed with a different secret is rejected", async () => {
    const forged = jwt.sign({ sub: newId() }, "some-other-secret");

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${forged}`);

    assert.equal(res.status, 401);
  });
});

describe("products", () => {
  test("list is paginated and clamps limit to 100", async () => {
    let capturedLimit;
    let capturedSkip;

    mock.method(Product, "find", () => {
      const query = {
        sort: () => query,
        skip: (value) => {
          capturedSkip = value;
          return query;
        },
        limit: async (value) => {
          capturedLimit = value;
          return [];
        },
      };
      return query;
    });
    mock.method(Product, "countDocuments", async () => 250);

    const res = await request(app).get("/api/products?page=3&limit=9999");

    assert.equal(res.status, 200);
    assert.equal(capturedLimit, 100);
    assert.equal(capturedSkip, 200);
    assert.equal(res.body.total, 250);
    assert.equal(res.body.pages, 3);
    assert.equal(res.body.page, 3);
  });

  test("operator injection in the category query is ignored", async () => {
    let capturedFilter;

    mock.method(Product, "find", (filter) => {
      capturedFilter = filter;
      const query = {
        sort: () => query,
        skip: () => query,
        limit: async () => [],
      };
      return query;
    });
    mock.method(Product, "countDocuments", async () => 0);

    const res = await request(app).get("/api/products?category[$ne]=x");

    assert.equal(res.status, 200);
    assert.equal(capturedFilter.category, undefined);
  });

  test("creating a product without a token returns 401", async () => {
    const res = await request(app).post("/api/products").send({ name: "X" });

    assert.equal(res.status, 401);
  });

  test("a normal user cannot create a product (403)", async () => {
    const { token } = mockLoggedInUser("user");

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "X", description: "Y", category: "Z", price: 10 });

    assert.equal(res.status, 403);
  });

  test("an admin sending invalid product data gets 400", async () => {
    const { token } = mockLoggedInUser("admin");

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "", description: "Y", category: "Z", price: -5 });

    assert.equal(res.status, 400);
  });
});

describe("orders", () => {
  test("creating an order without a token returns 401", async () => {
    const res = await request(app).post("/api/orders").send({});

    assert.equal(res.status, 401);
  });

  test("a normal user cannot list all orders (403)", async () => {
    const { token } = mockLoggedInUser("user");

    const res = await request(app)
      .get("/api/orders/admin/all")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 403);
  });

  test("order is rejected for an invalid phone number", async () => {
    const { token } = mockLoggedInUser();

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...validDelivery,
        phone: "12345",
        items: [{ productId: newId(), quantity: 1 }],
      });

    assert.equal(res.status, 400);
  });

  test("order is rejected for a bad quantity", async () => {
    const { token } = mockLoggedInUser();

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...validDelivery,
        items: [{ productId: newId(), quantity: -2 }],
      });

    assert.equal(res.status, 400);
  });

  test("order total uses the database price, not the client price", async () => {
    const { token } = mockLoggedInUser();
    const productId = newId();

    mock.method(Product, "find", async () => [
      { _id: productId, name: "Watch", price: 500, image: "", stock: 10 },
    ]);
    mock.method(Product, "findOneAndUpdate", async () => ({ _id: productId }));

    let createdWith;
    mock.method(Order, "create", async (data) => {
      createdWith = data;
      return { _id: newId(), ...data };
    });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...validDelivery,
        items: [{ productId, quantity: 2, price: 1 }], // fake client price
      });

    assert.equal(res.status, 201);
    assert.equal(createdWith.total, 1000);
    assert.equal(createdWith.items[0].price, 500);
  });

  test("ordering more than the available stock returns 409", async () => {
    const { token } = mockLoggedInUser();
    const productId = newId();

    mock.method(Product, "find", async () => [
      { _id: productId, name: "Watch", price: 500, image: "", stock: 1 },
    ]);
    // Atomic stock reservation fails because stock < quantity.
    mock.method(Product, "findOneAndUpdate", async () => null);

    const createSpy = mock.method(Order, "create", async () => ({}));

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...validDelivery,
        items: [{ productId, quantity: 5 }],
      });

    assert.equal(res.status, 409);
    assert.equal(createSpy.mock.callCount(), 0);
  });

  test("stock already reserved is returned when a later product fails", async () => {
    const { token } = mockLoggedInUser();
    const firstId = newId();
    const secondId = newId();

    mock.method(Product, "find", async () => [
      { _id: firstId, name: "A", price: 100, image: "", stock: 10 },
      { _id: secondId, name: "B", price: 200, image: "", stock: 0 },
    ]);

    // First reservation succeeds, second one fails.
    let calls = 0;
    mock.method(Product, "findOneAndUpdate", async () => {
      calls += 1;
      return calls === 1 ? { _id: firstId } : null;
    });

    const updateOne = mock.method(Product, "updateOne", async () => ({}));

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...validDelivery,
        items: [
          { productId: firstId, quantity: 2 },
          { productId: secondId, quantity: 1 },
        ],
      });

    assert.equal(res.status, 409);
    assert.equal(updateOne.mock.callCount(), 1);

    const [filter, update] = updateOne.mock.calls[0].arguments;
    assert.equal(String(filter._id), firstId);
    assert.deepEqual(update, { $inc: { stock: 2 } });
  });

  test("cancelling an order returns the stock", async () => {
    const { token, id } = mockLoggedInUser();
    const orderId = newId();
    const productId = newId();

    const findOneAndUpdate = mock.method(Order, "findOneAndUpdate", async () => ({
      _id: orderId,
      user: id,
      status: "cancelled",
      items: [{ productId, quantity: 3 }],
    }));
    const updateOne = mock.method(Product, "updateOne", async () => ({}));

    const res = await request(app)
      .patch(`/api/orders/${orderId}/cancel`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);

    // Only the owner's order in "placed" status may be cancelled.
    const [filter] = findOneAndUpdate.mock.calls[0].arguments;
    assert.equal(filter.status, "placed");
    assert.equal(filter.user, id);

    assert.equal(updateOne.mock.callCount(), 1);
    assert.deepEqual(updateOne.mock.calls[0].arguments[1], { $inc: { stock: 3 } });
  });

  test("an order that is not 'placed' cannot be cancelled", async () => {
    const { token } = mockLoggedInUser();

    mock.method(Order, "findOneAndUpdate", async () => null);
    const updateOne = mock.method(Product, "updateOne", async () => ({}));

    const res = await request(app)
      .patch(`/api/orders/${newId()}/cancel`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 409);
    assert.equal(updateOne.mock.callCount(), 0);
  });

  test("admin cannot skip an order status step", async () => {
    const { token } = mockLoggedInUser("admin");

    mock.method(Order, "findById", async () => ({ status: "placed" }));

    const res = await request(app)
      .patch(`/api/orders/${newId()}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "delivered" });

    assert.equal(res.status, 409);
  });
});
