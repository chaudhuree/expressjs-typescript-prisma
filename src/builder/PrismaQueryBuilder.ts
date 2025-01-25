import { PrismaClient, Prisma } from '@prisma/client'

type WhereClause = {
  [key: string]: any
}

type IncludeClause = {
  [key: string]: boolean | {
    select?: Record<string, boolean>
  }
}

type OrderByClause = {
  [key: string]: Prisma.SortOrder
}

class PrismaQueryBuilder<T extends Record<string, any>> {
  private prisma: PrismaClient
  private model: any
  private query: Record<string, unknown>
  private whereClause: WhereClause = {}
  private selectClause: Record<string, boolean> = {}
  private includeClause: IncludeClause = {}
  private orderByClause: OrderByClause = {}
  private skip: number = 0
  private take: number = 10

  constructor(
    prisma: PrismaClient,
    model: string,
    query: Record<string, unknown>
  ) {
    this.prisma = prisma
    this.model = this.prisma[model as keyof PrismaClient]
    this.query = query
  }

  search(searchableFields: string[]) {
    const searchTerm = this.query?.searchTerm as string
    if (searchTerm) {
      const searchConditions = searchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode }
      }))
      
      // Merge with existing where clause
      this.whereClause = {
        ...this.whereClause,
        OR: searchConditions
      }
    }
    return this
  }

  filter() {
    const queryObj = { ...this.query }
    const excludeFields = ['searchTerm', 'sort', 'limit', 'page', 'fields']
    excludeFields.forEach((el) => delete queryObj[el])

    // Handle operators and regular fields
    Object.entries(queryObj).forEach(([key, value]) => {
      if (value === undefined || value === '') return

      if (typeof value === 'object' && value !== null) {
        // Handle operator cases like field[operator]
        const operatorMatch = key.match(/(.+)\[(.+)\]/)
        if (operatorMatch) {
          const [, field, operator] = operatorMatch
          this.whereClause[field] = {
            ...this.whereClause[field],
            [operator]: this.parseValue(value)
          }
        } else {
          // Handle nested objects and relations
          this.whereClause[key] = this.parseValue(value)
        }
      } else {
        this.whereClause[key] = this.parseValue(value)
      }
    })

    return this
  }

  private parseValue(value: any): any {
    if (value === undefined || value === '') return undefined

    // Handle boolean strings
    if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) {
      return value.toLowerCase() === 'true'
    }

    // Handle numeric strings
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return Number(value)
    }

    // Handle date strings
    if (typeof value === 'string' && !isNaN(Date.parse(value))) {
      const date = new Date(value)
      // Check if it's actually a date string and not just a number
      if (date.toISOString().includes('T')) {
        return date
      }
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(v => this.parseValue(v))
    }

    // Handle nested objects
    if (typeof value === 'object' && value !== null) {
      const parsed: Record<string, any> = {}
      Object.entries(value).forEach(([k, v]) => {
        parsed[k] = this.parseValue(v)
      })
      return parsed
    }

    return value
  }

  sort() {
    const sort = (this.query?.sort as string)?.split(',') || ['-createdAt']
    const orderBy: OrderByClause = {}

    sort.forEach((item) => {
      const order = item.startsWith('-') ? 'desc' : 'asc'
      const field = item.replace(/^-/, '')
      orderBy[field] = order as Prisma.SortOrder
    })

    this.orderByClause = orderBy
    return this
  }

  paginate() {
    const page = Number(this.query?.page) || 1
    const limit = Number(this.query?.limit) || 10
    this.skip = (page - 1) * limit
    this.take = limit
    return this
  }

  fields() {
    const fieldsStr = this.query?.fields as string
    if (fieldsStr) {
      const fields = fieldsStr.split(',')
      const select: Record<string, boolean> = {}
      
      fields.forEach((field) => {
        // Handle excluded fields (prefixed with -)
        if (field.startsWith('-')) {
          select[field.substring(1)] = false
        } else {
          select[field] = true
        }
      })
      
      this.selectClause = select
    }
    return this
  }

  withRelations(relations: IncludeClause) {
    this.includeClause = relations
    return this
  }

  async execute() {
    try {
      const [result, total] = await Promise.all([
        this.model.findMany({
          where: this.whereClause,
          select: Object.keys(this.selectClause).length ? this.selectClause : undefined,
          include: Object.keys(this.includeClause).length ? this.includeClause : undefined,
          orderBy: this.orderByClause,
          skip: this.skip,
          take: this.take,
        }),
        this.model.count({ where: this.whereClause }),
      ])

      const page = Number(this.query?.page) || 1
      const limit = Number(this.query?.limit) || 10
      const totalPage = Math.ceil(total / limit)

      return {
        meta: {
          page,
          limit,
          total,
          totalPage,
        },
        result,
      }
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Additional utility methods
  getWhereClause() {
    return this.whereClause
  }

  getSelectClause() {
    return this.selectClause
  }

  getIncludeClause() {
    return this.includeClause
  }

  getOrderByClause() {
    return this.orderByClause
  }

  getPaginationValues() {
    return {
      skip: this.skip,
      take: this.take,
    }
  }
}

export default PrismaQueryBuilder