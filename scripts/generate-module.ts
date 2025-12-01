import fs from 'fs';
import path from 'path';

// Define capitalize function inline
const capitalize = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const modelName = process.argv[2];

if (!modelName) {
  console.error('Please provide a model name!');
  process.exit(1);
}

// const baseDir = path.join(__dirname, '..', 'modules', modelName.toLowerCase());
const baseDir = path.join(__dirname, '..', 'src', 'app', 'modules', modelName.toLowerCase());
// const prismaSchemaPath = path.join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma');
const prismaSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// Create the module directory
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

// Interface template
const interfaceTemplate = `
export type I${capitalize(modelName)} = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type IFilters = {
  searchTerm?: string;
  page?: number;
  limit?: number;
};
`;

// Controller template
const controllerTemplate = `
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ${capitalize(modelName)}Service } from './${modelName}.service';

const create = catchAsync(async (req, res) => {
  const result = await ${capitalize(modelName)}Service.create(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: '${capitalize(modelName)} created successfully',
    data: result,
  });
});

const getAll = catchAsync(async (req, res) => {
  const result = await ${capitalize(modelName)}Service.getAll(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: '${capitalize(modelName)}s retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getOne = catchAsync(async (req, res) => {
  const result = await ${capitalize(modelName)}Service.getOne(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: '${capitalize(modelName)} retrieved successfully',
    data: result,
  });
});

const update = catchAsync(async (req, res) => {
  const result = await ${capitalize(modelName)}Service.update(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: '${capitalize(modelName)} updated successfully',
    data: result,
  });
});

const remove = catchAsync(async (req, res) => {
  const result = await ${capitalize(modelName)}Service.remove(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: '${capitalize(modelName)} deleted successfully',
    data: result,
  });
});

export const ${capitalize(modelName)}Controller = {
  create,
  getAll,
  getOne,
  update,
  remove,
};
`;

// Service template using QueryBuilder
const serviceTemplate = `
import prisma from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import { ${modelName}SearchableFields } from './${modelName}.constant';

const create = async (data: any) => {
  const result = await prisma.${modelName.toLowerCase()}.create({
    data,
  });
  return result;
};

const getAll = async (query: Record<string, unknown>) => {
  const ${modelName.toLowerCase()}Query = new QueryBuilder(prisma.${modelName.toLowerCase()}, query);
  
  const result = await ${modelName.toLowerCase()}Query
    .search(${modelName}SearchableFields)
    .filter()
    .sort()
    .paginate()
    .execute();
  
  const meta = await ${modelName.toLowerCase()}Query.countTotal();

  return {
    meta,
    data: result,
  };
};

const getOne = async (id: string) => {
  const result = await prisma.${modelName.toLowerCase()}.findUnique({
    where: {
      id,
    },
  });
  return result;
};

const update = async (id: string, payload: Partial<any>) => {
  const result = await prisma.${modelName.toLowerCase()}.update({
    where: {
      id,
    },
    data: payload,
  });
  return result;
};

const remove = async (id: string) => {
  const result = await prisma.${modelName.toLowerCase()}.delete({
    where: {
      id,
    },
  });
  return result;
};

export const ${capitalize(modelName)}Service = {
  create,
  getAll,
  getOne,
  update,
  remove,
};
`;

// Routes template
const routesTemplate = `
import express from 'express';
import { ${capitalize(modelName)}Controller } from './${modelName}.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ${capitalize(modelName)}Validation } from './${modelName}.validation';

const router = express.Router();

router.post(
  '/',
  validateRequest(${capitalize(modelName)}Validation.create),
  ${capitalize(modelName)}Controller.create
);

router.get('/', ${capitalize(modelName)}Controller.getAll);
router.get('/:id', ${capitalize(modelName)}Controller.getOne);

router.patch(
  '/:id',
  validateRequest(${capitalize(modelName)}Validation.update),
  ${capitalize(modelName)}Controller.update
);

router.delete('/:id', ${capitalize(modelName)}Controller.remove);

export const ${modelName}Routes = router;
`;

// Validation template
const validationTemplate = `
import { z } from 'zod';

const create = z.object({
  body: z.object({
    // Add your validation schema here
  }),
});

const update = z.object({
  body: z.object({
    // Add your validation schema here
  }),
});

export const ${capitalize(modelName)}Validation = {
  create,
  update,
};
`;

// Constants template
const constantTemplate = `
export const ${modelName}SearchableFields = [
  'id',
  'name'
  // Add other searchable fields here
];

export const ${modelName}FilterableFields = [
  'searchTerm',
  'page',
  'limit',
];

export const ${modelName}ModelFields=[
'id',
'name',
'createdAt',
'updatedAt',
]
`;

// Prisma schema template for the new model
const prismaModelTemplate = `
model ${capitalize(modelName)} {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("${modelName.toLowerCase()}s")
}
`;

// Write files
fs.writeFileSync(path.join(baseDir, `${modelName}.interface.ts`), interfaceTemplate);
fs.writeFileSync(path.join(baseDir, `${modelName}.controller.ts`), controllerTemplate);
fs.writeFileSync(path.join(baseDir, `${modelName}.service.ts`), serviceTemplate);
fs.writeFileSync(path.join(baseDir, `${modelName}.routes.ts`), routesTemplate);
fs.writeFileSync(path.join(baseDir, `${modelName}.validation.ts`), validationTemplate);
fs.writeFileSync(path.join(baseDir, `${modelName}.constant.ts`), constantTemplate);

// Add Prisma model to schema.prisma
if (fs.existsSync(prismaSchemaPath)) {
  const prismaSchemaContent = fs.readFileSync(prismaSchemaPath, 'utf-8');
  
  // Check if model already exists
  const modelRegex = new RegExp(`model\\s+${capitalize(modelName)}\\s*\\{`, 'i');
  if (!modelRegex.test(prismaSchemaContent)) {
    fs.appendFileSync(prismaSchemaPath, prismaModelTemplate);
    console.log(`✅ Added ${capitalize(modelName)} model to prisma/schema.prisma`);
  } else {
    console.log(`⚠️ Model ${capitalize(modelName)} already exists in prisma/schema.prisma`);
  }
} else {
  console.log(`⚠️ prisma/schema.prisma not found. Please add the model manually.`);
}

// Add route to index.ts
// const routesIndexPath = path.join(__dirname, '..', 'routes', 'index.ts');
const routesIndexPath = path.join(__dirname, '..','src','app', 'routes', 'index.ts');
const routesIndexContent = fs.readFileSync(routesIndexPath, 'utf-8');

// Import statement to add
const importStatement = `import { ${modelName}Routes } from '../modules/${modelName.toLowerCase()}/${modelName}.routes';`;

// Route configuration to add
const routeConfig = `  {
    path: '/${modelName.toLowerCase()}',
    route: ${modelName}Routes,
  },`;

// Split content into lines
const lines = routesIndexContent.split('\n');

// Find the last import statement
let lastImportIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('import ')) {
    lastImportIndex = i;
  }
}

// Insert new import after the last import
lines.splice(lastImportIndex + 1, 0, importStatement);

// Find the moduleRoutes array
let moduleRoutesIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const moduleRoutes')) {
    moduleRoutesIndex = i;
    break;
  }
}

// Find the closing bracket of moduleRoutes array
let closingBracketIndex = -1;
for (let i = moduleRoutesIndex; i < lines.length; i++) {
  if (lines[i].trim() === '];') {
    closingBracketIndex = i;
    break;
  }
}

// Add new route config before the closing bracket
lines.splice(closingBracketIndex, 0, routeConfig);

// Write back to file
fs.writeFileSync(routesIndexPath, lines.join('\n'));

console.log(`✨ Module ${modelName} generated successfully!`);