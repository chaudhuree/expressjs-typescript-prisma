# PrismaQueryBuilder Documentation

The `PrismaQueryBuilder` is a flexible and generic utility class that provides a fluent interface for building complex Prisma queries. It works with any Prisma model and supports dynamic filtering, searching, sorting, and pagination.

## Features

- Generic implementation that works with any Prisma model
- Smart type parsing for query values
- Dynamic field filtering with operators
- Multi-field search capability
- Flexible sorting on any field
- Pagination
- Field selection with inclusion/exclusion
- Relation handling
- Error handling and debugging utilities

## Usage Example

Here's a generic example that works with any model:

```typescript
import { PrismaClient } from '@prisma/client'
import PrismaQueryBuilder from '../builder/PrismaQueryBuilder'

const prisma = new PrismaClient()

const getModelData = async <T extends Record<string, any>>(
  modelName: string,
  query: Record<string, unknown>,
  searchableFields: string[] = [],
  relations: Record<string, any> = {}
) => {
  const queryBuilder = new PrismaQueryBuilder<T>(prisma, modelName, query)
    .search(searchableFields)
    .withRelations(relations)
    .paginate()
    .sort()
    .fields()
    .filter()

  return await queryBuilder.execute()
}

// Example usage for any model:
const getUsers = (query: Record<string, unknown>) => 
  getModelData('user', query, ['name', 'email'], {
    posts: {
      select: {
        id: true,
        title: true
      }
    }
  })

const getProducts = (query: Record<string, unknown>) =>
  getModelData('product', query, ['title', 'description'], {
    category: true,
    brand: true
  })
```

## Query Parameters

The builder accepts any query parameters and intelligently parses them based on their type:

```typescript
{
  // Search
  "searchTerm": "any search text",

  // Pagination
  "page": 1,
  "limit": 10,

  // Field Selection
  "fields": "field1,field2,-excludedField",

  // Filtering - Multiple Formats
  "status": "active",                    // Direct value
  "age": "25",                          // Auto-converted to number
  "isActive": "true",                   // Auto-converted to boolean
  "createdAt": "2023-01-01T00:00:00Z",  // Auto-converted to Date
  "price[gte]": "100",                  // Operator format
  "price[lte]": "1000",
  "tags": ["tag1", "tag2"],             // Array values
  
  // Nested Objects
  "profile": {
    "verified": "true",
    "score[gt]": "80"
  },

  // Sorting
  "sort": "-createdAt,name"             // Prefix with - for DESC
}
```

## Value Parsing

The builder automatically handles different types of values:

1. **Booleans**: Strings "true"/"false" are converted to boolean values
2. **Numbers**: Numeric strings are converted to numbers
3. **Dates**: Valid date strings are converted to Date objects
4. **Arrays**: Array values are preserved and each element is parsed
5. **Nested Objects**: Objects are recursively parsed
6. **Empty Values**: undefined or empty strings are excluded from the query

## Filter Operators

You can use operators in field names:

```typescript
{
  "field[gt]": value    // Greater than
  "field[gte]": value   // Greater than or equal
  "field[lt]": value    // Less than
  "field[lte]": value   // Less than or equal
  "field[contains]": value     // Contains (for strings)
  "field[startsWith]": value   // Starts with
  "field[endsWith]": value     // Ends with
  "field[in]": [value1, value2] // In array
}
```

## Response Format

```typescript
{
  meta: {
    page: number,
    limit: number,
    total: number,
    totalPage: number
  },
  result: T[]  // Generic type array
}
```

## Utility Methods

The builder provides utility methods for debugging and custom implementations:

```typescript
const builder = new PrismaQueryBuilder(prisma, 'model', query)

// Get current state
const whereClause = builder.getWhereClause()
const selectClause = builder.getSelectClause()
const includeClause = builder.getIncludeClause()
const orderByClause = builder.getOrderByClause()
const pagination = builder.getPaginationValues()
```

## Error Handling

The builder includes built-in error handling:
- Invalid queries throw descriptive errors
- Database errors are caught and wrapped with context
- Empty or undefined values are safely handled
- Type conversion errors are prevented with validation
