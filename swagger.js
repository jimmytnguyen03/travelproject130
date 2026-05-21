module.exports = {
  openapi: "3.0.0",
  info: {
    title: "Phase 2 Travel Agent SaaS API",
    version: "1.0.0",
    description:
      "Search APIs (flights, accommodations, activities, trip recommendations), tenant branding, JWT authentication, and multi-tenant booking persistence.",
  },
  servers: [
    {
      url: "http://localhost:3000",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "JWT obtained from POST /api/auth/login. Send as 'Authorization: Bearer <token>'.",
      },
    },
  },
  paths: {
    "/api/flights/search": {
      get: {
        summary: "Search flights",
        parameters: [
          { name: "destination", in: "query", required: true, schema: { type: "string" } },
          { name: "departDate", in: "query", required: true, schema: { type: "string", format: "date" } },
          { name: "returnDate", in: "query", required: true, schema: { type: "string", format: "date" } },
          { name: "travelers", in: "query", required: true, schema: { type: "integer" } },
          { name: "budget", in: "query", required: false, schema: { type: "number" } }
        ],
        responses: {
          200: { description: "Flights found" },
          400: { description: "Invalid request" },
          500: { description: "Server error" }
        }
      }
    },
    "/api/accommodations/search": {
      get: {
        summary: "Search accommodations",
        parameters: [
          { name: "destination", in: "query", required: true, schema: { type: "string" } },
          { name: "checkIn", in: "query", required: true, schema: { type: "string", format: "date" } },
          { name: "checkOut", in: "query", required: true, schema: { type: "string", format: "date" } },
          { name: "guests", in: "query", required: true, schema: { type: "integer" } },
          { name: "budget", in: "query", required: false, schema: { type: "number" } }
        ],
        responses: {
          200: { description: "Accommodations found" },
          400: { description: "Invalid request" },
          500: { description: "Server error" }
        }
      }
    },
    "/api/activities/search": {
      get: {
        summary: "Search activities",
        parameters: [
          { name: "destination", in: "query", required: true, schema: { type: "string" } },
          {
            name: "priceFilter",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["free", "under25", "25to75", "75plus"]
            }
          }
        ],
        responses: {
          200: { description: "Activities found" },
          400: { description: "Invalid request" },
          500: { description: "Server error" }
        }
      }
    },

    "/api/tenants/{domain}/branding": {
      get: {
        summary: "Get tenant branding",
        description: "Returns the logoUrl and themeColor for a tenant identified by domain.",
        parameters: [
          {
            name: "domain",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "acme.travel"
          }
        ],
        responses: {
          200: {
            description: "Tenant branding found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    logoUrl: { type: "string", nullable: true },
                    themeColor: { type: "string", nullable: true }
                  }
                }
              }
            }
          },
          404: { description: "Tenant not found" },
          500: { description: "Server error" }
        }
      }
    },

    "/api/trips/recommendations": {
      get: {
        summary: "Get budget-based trip recommendations",
        description:
          "Combines available flight and accommodation options, calculates total trip cost, and returns only combinations within the user's budget.",
        parameters: [
          {
            name: "destination",
            in: "query",
            required: true,
            schema: { type: "string" },
            example: "LON"
          },
          {
            name: "departDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
            example: "2026-06-10"
          },
          {
            name: "returnDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
            example: "2026-06-17"
          },
          {
            name: "travelers",
            in: "query",
            required: true,
            schema: { type: "integer" },
            example: 1
          },
          {
            name: "guests",
            in: "query",
            required: true,
            schema: { type: "integer" },
            example: 1
          },
          {
            name: "budget",
            in: "query",
            required: true,
            schema: { type: "number" },
            example: 1500
          }
        ],
        responses: {
          200: {
            description: "Trip recommendations found or no trips found within budget"
          },
          400: {
            description: "Invalid request parameters"
          },
          500: {
            description: "Server error"
          }
        }
      }
    },

    "/api/auth/signup": {
      post: {
        summary: "Register a new user under a tenant",
        description:
          "Creates a user scoped to the given tenantDomain. Returns a JWT containing { userId, tenantId } that authorizes booking endpoints.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name", "tenantDomain"],
                properties: {
                  email: { type: "string", format: "email", example: "new@agency-a.com" },
                  password: { type: "string", example: "test123" },
                  name: { type: "string", example: "Test User" },
                  tenantDomain: { type: "string", example: "agency-a.com" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "User created; returns token + user" },
          400: { description: "Missing fields or unknown tenantDomain" },
          409: { description: "Email already registered for this tenant" },
          500: { description: "Server error" }
        }
      }
    },

    "/api/auth/login": {
      post: {
        summary: "Log in and receive a JWT",
        description:
          "Verifies email + password under the given tenantDomain. Returns 401 with a generic 'Invalid credentials' message on any failure (does not disclose whether the email exists).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "tenantDomain"],
                properties: {
                  email: { type: "string", format: "email", example: "violet@agency-a.com" },
                  password: { type: "string", example: "password123" },
                  tenantDomain: { type: "string", example: "agency-a.com" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Login successful; returns token + user" },
          400: { description: "Missing fields or unknown tenantDomain" },
          401: { description: "Invalid credentials" },
          500: { description: "Server error" }
        }
      }
    },

    "/api/bookings": {
      post: {
        summary: "Create a booking",
        description:
          "Creates a booking under the caller's tenant (tenantId is sourced from the JWT, never from the request body). Server computes totalAmount from cached flight.price + accommodation.pricePerNight × nights.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["startDate", "endDate"],
                properties: {
                  flightId: { type: "string", example: "FL001" },
                  accommodationId: { type: "string", example: "AC001" },
                  startDate: { type: "string", format: "date", example: "2026-06-10" },
                  endDate: { type: "string", format: "date", example: "2026-06-17" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Booking created; status: Pending" },
          400: { description: "Invalid input or unknown flight/accommodation ID" },
          401: { description: "Missing or invalid JWT" },
          500: { description: "Server error" }
        }
      },
      get: {
        summary: "List my bookings",
        description:
          "Returns bookings belonging to the authenticated user within their tenant. Other tenants' bookings are never returned (TC-07).",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Returns { results, count }" },
          401: { description: "Missing or invalid JWT" },
          500: { description: "Server error" }
        }
      }
    },

    "/api/bookings/{id}": {
      get: {
        summary: "Get a booking by ID",
        description:
          "Returns the booking only if it belongs to the caller's tenant. Cross-tenant access returns 404 (not 403) to avoid leaking row existence — matches TC-07.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, example: 1 }
        ],
        responses: {
          200: { description: "Returns the booking" },
          401: { description: "Missing or invalid JWT" },
          404: { description: "Booking not found (or not in caller's tenant)" },
          500: { description: "Server error" }
        }
      }
    },

    "/api/bookings/{id}/cancel": {
      patch: {
        summary: "Cancel a booking",
        description:
          "Sets status to Cancelled. Only the owning tenant can cancel; cross-tenant attempts return 404.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, example: 1 }
        ],
        responses: {
          200: { description: "Booking cancelled" },
          401: { description: "Missing or invalid JWT" },
          404: { description: "Booking not found (or not in caller's tenant)" },
          500: { description: "Server error" }
        }
      }
    }
  }
};