import * as fs from 'fs';
import * as path from 'path';

interface PostmanHeader {
  key: string;
  value: string;
  type: string;
}

interface PostmanBody {
  mode: string;
  raw?: string;
  options?: {
    raw: {
      language: string;
    };
  };
  formdata?: Array<{
    key: string;
    type: string;
    src?: string;
    value?: string;
  }>;
}

interface PostmanRequest {
  method: string;
  header: PostmanHeader[];
  body?: PostmanBody;
  url: {
    raw: string;
    host: string[];
    path: string[];
    variable?: Array<{
      key: string;
      value: string;
      description: string;
    }>;
  };
  auth?: {
    type: string;
    bearer: Array<{
      key: string;
      value: string;
      type: string;
    }>;
  };
}

interface PostmanItem {
  name: string;
  request: PostmanRequest;
  response: never[];
}

interface PostmanFolder {
  name: string;
  item: PostmanItem[];
}

interface PostmanCollection {
  info: {
    _postman_id: string;
    name: string;
    description: string;
    schema: string;
  };
  item: PostmanFolder[];
  variable: Array<{
    key: string;
    value: string;
    type: string;
  }>;
}

interface RouteInfo {
  method: string;
  path: string;
  hasAuth: boolean;
  authRoles: string[];
  hasValidation: boolean;
  validationName: string;
  controllerMethod: string;
}

interface ModuleRouteConfig {
  moduleName: string;
  basePath: string;
  routes: RouteInfo[];
}

// Generate a UUID for Postman collection
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Parse route file and extract route information
function parseRouteFile(filePath: string): RouteInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const routes: RouteInfo[] = [];

  // Match route definitions with various patterns
  const routePatterns = [
    // Pattern: router.method('/path', ...handlers)
    /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,([^;]+)\)/gi,
  ];

  for (const pattern of routePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const handlers = match[3];

      // Check for auth middleware
      const authMatch = handlers.match(/auth\s*\(\s*([^)]*)\s*\)/);
      const hasAuth = !!authMatch;
      let authRoles: string[] = [];
      if (authMatch && authMatch[1]) {
        authRoles = authMatch[1]
          .split(',')
          .map((role) => role.trim().replace(/['"]/g, ''))
          .filter((role) => role.length > 0);
      }

      // Check for validation
      const validationMatch = handlers.match(/validateRequest\s*\(\s*([^)]+)\s*\)/);
      const hasValidation = !!validationMatch;
      const validationName = validationMatch ? validationMatch[1].trim() : '';

      // Extract controller method
      const controllerMatch = handlers.match(/(\w+Controller[s]?\.\w+|\w+\.\w+)(?:\s*,?\s*\))?$/);
      const controllerMethod = controllerMatch ? controllerMatch[1] : '';

      routes.push({
        method,
        path: routePath,
        hasAuth,
        authRoles,
        hasValidation,
        validationName,
        controllerMethod,
      });
    }
  }

  return routes;
}

// Parse validation file to extract request body schema
function parseValidationFile(filePath: string, validationName: string): Record<string, unknown> {
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract the validation schema name (e.g., "authValidation.loginUser" -> "loginUser")
    const schemaName = validationName.split('.').pop() || '';
    
    // Find the schema definition - handle various formats
    // Look for: const schemaName = z.object({ body: z.object({ ... }) })
    const schemaStartRegex = new RegExp(`const\\s+${schemaName}\\s*=\\s*z\\.object\\s*\\(\\s*\\{`, 'i');
    const schemaStartMatch = content.match(schemaStartRegex);
    
    if (!schemaStartMatch) {
      return {};
    }

    // Find the matching closing brace by counting braces
    const startIndex = schemaStartMatch.index! + schemaStartMatch[0].length;
    let braceCount = 1;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < content.length && braceCount > 0; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      endIndex = i;
    }
    
    const schemaContent = content.substring(startIndex, endIndex);
    
    // Check if it has a body property - find body: z.object({ ... })
    const bodyStartMatch = schemaContent.match(/body:\s*z\.object\s*\(\s*\{/);
    if (!bodyStartMatch) {
      return {};
    }

    const bodyStartIndex = bodyStartMatch.index! + bodyStartMatch[0].length;
    let bodyBraceCount = 1;
    let bodyEndIndex = bodyStartIndex;
    
    for (let i = bodyStartIndex; i < schemaContent.length && bodyBraceCount > 0; i++) {
      if (schemaContent[i] === '{') bodyBraceCount++;
      if (schemaContent[i] === '}') bodyBraceCount--;
      bodyEndIndex = i;
    }
    
    const bodyContent = schemaContent.substring(bodyStartIndex, bodyEndIndex);
    const fields: Record<string, unknown> = {};

    // Extract field definitions - improved regex to catch all patterns
    // Matches: fieldName: z.string(), fieldName: z.number(), etc.
    const fieldRegex = /(\w+):\s*z\s*(?:\.\s*)?(string|number|boolean|array|object|enum|date|any)/gi;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(bodyContent)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2].toLowerCase();
      
      switch (fieldType) {
        case 'string':
        case 'date':
        case 'any':
          fields[fieldName] = '';
          break;
        case 'number':
          fields[fieldName] = 0;
          break;
        case 'boolean':
          fields[fieldName] = false;
          break;
        case 'array':
          fields[fieldName] = [];
          break;
        case 'object':
          fields[fieldName] = {};
          break;
        case 'enum':
          fields[fieldName] = '';
          break;
        default:
          fields[fieldName] = '';
      }
    }

    return fields;
  } catch (error) {
    console.error(`Error parsing validation file: ${filePath}`, error);
    return {};
  }
}

// Get base path for a module from routes/index.ts
function getModuleBasePaths(routesIndexPath: string): Map<string, string> {
  const basePaths = new Map<string, string>();
  
  try {
    const content = fs.readFileSync(routesIndexPath, 'utf-8');
    
    // Match moduleRoutes array entries - handle multiline format
    const moduleRoutesMatch = content.match(/moduleRoutes[\s\S]*?=\s*\[([\s\S]*?)\];/);
    if (moduleRoutesMatch) {
      const entriesContent = moduleRoutesMatch[1];
      // Match each object in the array with flexible whitespace
      const entryRegex = /\{\s*path:\s*['"`]([^'"`]+)['"`]\s*,\s*route:\s*(\w+)\s*,?\s*\}/g;
      
      let match;
      while ((match = entryRegex.exec(entriesContent)) !== null) {
        const basePath = match[1];
        const routeName = match[2];
        basePaths.set(routeName, basePath);
        console.log(`   Mapped: ${routeName} -> ${basePath}`);
      }
    }
  } catch (error) {
    console.error('Error reading routes index:', error);
  }
  
  return basePaths;
}

// Scan modules directory for route files
function scanModulesDirectory(modulesDir: string): string[] {
  const routeFiles: string[] = [];
  
  const modules = fs.readdirSync(modulesDir, { withFileTypes: true });
  
  for (const module of modules) {
    if (module.isDirectory()) {
      const moduleDir = path.join(modulesDir, module.name);
      const files = fs.readdirSync(moduleDir);
      
      for (const file of files) {
        if (file.endsWith('.routes.ts') || file.endsWith('.route.ts')) {
          routeFiles.push(path.join(moduleDir, file));
        }
      }
    }
  }
  
  return routeFiles;
}

// Create Postman request item
function createPostmanItem(
  route: RouteInfo,
  basePath: string,
  moduleName: string,
  validationFilePath: string
): PostmanItem {
  const fullPath = `${basePath}${route.path}`;
  const pathSegments = fullPath.split('/').filter((seg) => seg.length > 0);
  
  // Handle path parameters
  const pathVariables: Array<{ key: string; value: string; description: string }> = [];
  const processedSegments = pathSegments.map((seg) => {
    if (seg.startsWith(':')) {
      const paramName = seg.substring(1);
      pathVariables.push({
        key: paramName,
        value: `{{${paramName}}}`,
        description: `${paramName} parameter`,
      });
      return `:${paramName}`;
    }
    return seg;
  });

  const headers: PostmanHeader[] = [
    {
      key: 'Content-Type',
      value: 'application/json',
      type: 'text',
    },
  ];

  const request: PostmanRequest = {
    method: route.method,
    header: headers,
    url: {
      raw: `{{baseUrl}}${fullPath}`,
      host: ['{{baseUrl}}'],
      path: processedSegments,
    },
  };

  // Add path variables if any
  if (pathVariables.length > 0) {
    request.url.variable = pathVariables;
  }

  // Add auth header if route requires authentication
  if (route.hasAuth) {
    request.auth = {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{accessToken}}',
          type: 'string',
        },
      ],
    };
  }

  // Add request body for POST, PUT, PATCH methods
  if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
    let bodyContent: Record<string, unknown> = {};
    
    if (route.hasValidation && route.validationName) {
      bodyContent = parseValidationFile(validationFilePath, route.validationName);
    }

    request.body = {
      mode: 'raw',
      raw: JSON.stringify(bodyContent, null, 2),
      options: {
        raw: {
          language: 'json',
        },
      },
    };
  }

  // Generate descriptive name
  const routeName = route.controllerMethod
    ? route.controllerMethod.split('.').pop() || route.path
    : `${route.method} ${route.path}`;

  const authInfo = route.hasAuth ? ` [Auth: ${route.authRoles.join(', ') || 'Required'}]` : '';

  return {
    name: `${routeName}${authInfo}`,
    request,
    response: [],
  };
}

// Main function to generate Postman collection
function generatePostmanCollection(): void {
  const projectRoot = path.resolve(__dirname, '..');
  const modulesDir = path.join(projectRoot, 'src', 'app', 'modules');
  const routesIndexPath = path.join(projectRoot, 'src', 'app', 'routes', 'index.ts');
  const outputPath = path.join(projectRoot, 'postman-collection.json');

  console.log('🔍 Scanning modules directory...');
  
  // Get base paths from routes/index.ts
  const basePaths = getModuleBasePaths(routesIndexPath);
  console.log(`📁 Found ${basePaths.size} module routes in index.ts`);

  // Scan for route files
  const routeFiles = scanModulesDirectory(modulesDir);
  console.log(`📄 Found ${routeFiles.length} route files`);

  const collection: PostmanCollection = {
    info: {
      _postman_id: generateUUID(),
      name: 'API Collection',
      description: 'Auto-generated Postman collection from Express routes',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [],
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:5000/api/v1',
        type: 'string',
      },
      {
        key: 'accessToken',
        value: '',
        type: 'string',
      },
    ],
  };

  // Process each route file
  for (const routeFile of routeFiles) {
    const moduleName = path.basename(path.dirname(routeFile));
    const routes = parseRouteFile(routeFile);
    
    if (routes.length === 0) {
      console.log(`⚠️  No routes found in ${moduleName}`);
      continue;
    }

    console.log(`✅ Processing ${moduleName}: ${routes.length} routes`);

    // Find the base path for this module by matching route export name with module name
    let basePath = '';
    for (const [routeName, routeBasePath] of basePaths) {
      // Match by checking if the route name contains the module name (case insensitive)
      const routeNameLower = routeName.toLowerCase();
      const moduleNameLower = moduleName.toLowerCase();
      if (routeNameLower.includes(moduleNameLower) || moduleNameLower.includes(routeNameLower.replace('routes', '').replace('routers', ''))) {
        basePath = routeBasePath;
        break;
      }
    }
    
    // If no match found, try to infer from module name
    if (!basePath) {
      basePath = `/${moduleName}`;
    }

    // Get validation file path
    const validationFilePath = path.join(
      path.dirname(routeFile),
      `${moduleName}.validation.ts`
    );

    // Create folder for this module
    const folder: PostmanFolder = {
      name: moduleName.charAt(0).toUpperCase() + moduleName.slice(1),
      item: [],
    };

    // Create items for each route
    for (const route of routes) {
      const item = createPostmanItem(route, basePath, moduleName, validationFilePath);
      folder.item.push(item);
    }

    collection.item.push(folder);
  }

  // Add upload route from routes/index.ts
  const uploadFolder: PostmanFolder = {
    name: 'Upload',
    item: [
      {
        name: 'Upload Image',
        request: {
          method: 'POST',
          header: [],
          body: {
            mode: 'formdata',
            formdata: [
              {
                key: 'image',
                type: 'file',
                src: '',
              },
            ],
          },
          url: {
            raw: '{{baseUrl}}/upload',
            host: ['{{baseUrl}}'],
            path: ['upload'],
          },
        },
        response: [],
      },
    ],
  };
  collection.item.push(uploadFolder);

  // Write collection to file
  fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));
  console.log(`\n🎉 Postman collection generated successfully!`);
  console.log(`📍 Output: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Total folders: ${collection.item.length}`);
  console.log(`   - Total requests: ${collection.item.reduce((acc, folder) => acc + folder.item.length, 0)}`);
}

// Run the generator
generatePostmanCollection();
