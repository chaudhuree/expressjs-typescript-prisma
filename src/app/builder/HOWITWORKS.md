# QueryBuilder Documentation

A chainable query builder for Prisma that provides search, filter, sort, pagination, and field selection.

---

## Setup Example

### 1. Prisma Schema

```prisma
model Product {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  description String
  price       Int
  category    String
  stock       Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("products")
}
```

### 2. Constants File

```typescript
// product.constant.ts
export const productSearchableFields = ['name', 'description'];
export const productModelFields = ['id', 'name', 'description', 'price', 'category', 'stock', 'createdAt', 'updatedAt'];
```

### 3. Service File

```typescript
// product.service.ts
import prisma from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import { productSearchableFields, productModelFields } from './product.constant';

const getAll = async (query: Record<string, unknown>) => {
  const productQuery = new QueryBuilder(prisma.product, query);

  const result = await productQuery
    .search(productSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields(productModelFields)  // Pass model fields for exclusion support
    .execute();

  const meta = await productQuery.countTotal();

  return { meta, data: result };
};
```

---

## Query Parameters

### 1. Search (`searchTerm`)

Partial text match across specified fields (case-insensitive).

| API Call | Result |
|----------|--------|
| `?searchTerm=phone` | Products where `name` OR `description` contains "phone" |

### 2. Filter (Exact Match & Operators)

**Exact match:**
| API Call | Result |
|----------|--------|
| `?category=electronics` | Products where `category === "electronics"` |

**Numeric operators:**
| API Call | Result |
|----------|--------|
| `?price[gte]=100` | Products with `price >= 100` |
| `?price[lte]=500` | Products with `price <= 500` |
| `?price[gt]=50&price[lt]=200` | Products with `50 < price < 200` |
| `?stock[equals]=0` | Products with `stock === 0` |

**Supported operators:** `gt`, `gte`, `lt`, `lte`, `equals`

### 3. Sort

| API Call | Result |
|----------|--------|
| `?sort=price` | Sort by price **ascending** |
| `?sort=-price` | Sort by price **descending** (prefix `-`) |
| `?sort=-price,name` | Sort by price DESC, then name ASC |
| *(no sort param)* | Default: `-createdAt` (newest first) |

### 4. Pagination

| API Call | Result |
|----------|--------|
| `?page=1&limit=10` | First 10 products |
| `?page=2&limit=10` | Products 11-20 |
| *(no params)* | Default: `page=1`, `limit=10` |

**Response meta:**
```json
{
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPage": 5
  }
}
```

### 5. Fields Selection

**Include specific fields:**
| API Call | Result |
|----------|--------|
| `?fields=name,price` | Returns only `name` and `price` |

**Exclude specific fields (requires `modelFields` parameter):**
| API Call | Result |
|----------|--------|
| `?fields=-description,-stock` | Returns all fields EXCEPT `description` and `stock` |

> **Note:** For exclusion mode, all fields must start with `-` and you must pass `modelFields` to `.fields()`.

---

## Complete Example

### Request
```
GET /products?searchTerm=laptop&category=electronics&price[gte]=500&sort=-price&page=1&limit=5&fields=name,price,category
```

### Generated Prisma Query
```typescript
{
  where: {
    OR: [
      { name: { contains: "laptop", mode: "insensitive" } },
      { description: { contains: "laptop", mode: "insensitive" } }
    ],
    category: "electronics",
    price: { gte: 500 }
  },
  orderBy: [{ price: "desc" }],
  skip: 0,
  take: 5,
  select: {
    name: true,
    price: true,
    category: true
  }
}
```

### Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Products retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 5,
    "total": 12,
    "totalPage": 3
  },
  "data": [
    { "name": "Gaming Laptop Pro", "price": 1500, "category": "electronics" },
    { "name": "Business Laptop", "price": 1200, "category": "electronics" }
  ]
}
```

---

## Method Chain Order

```typescript
new QueryBuilder(prisma.model, query)
  .search(searchableFields)    // 1. Text search
  .filter()                     // 2. Exact filters & operators
  .sort()                       // 3. Sorting
  .paginate()                   // 4. Pagination
  .fields(modelFields)          // 5. Field selection (optional)
  .execute();                   // 6. Execute query
```

---

## Options: Include Relations

```typescript
const productQuery = new QueryBuilder(
  prisma.product,
  query,
  { include: { category: true, reviews: true } }  // Include relations
);
```
