import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import expressLayouts from "express-ejs-layouts";
import httpStatus from "http-status";
import path from "path";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import router from "./app/routes";
import { ViewRoutes } from "./app/routes/view.routes";
import { requestLogger, logError } from "./app/utils/logger";

const app: Application = express();
app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

//parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request/response logging (non-blocking)
app.use(requestLogger);

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API health check route
app.get("/api/health", (req: Request, res: Response) => {
  res.send({
    Message: "The server is running. . .",
  });
});

// View routes
app.use("/", ViewRoutes);

// API routes
app.use("/api/v1", router);

app.use(globalErrorHandler);

app.use((req: Request, res: Response, next: NextFunction) => {
  // Build 404 response
  res.status(httpStatus.NOT_FOUND);

  // Log as error for API paths (logger will filter non-API)
  try {
    logError(new Error('API NOT FOUND'), req, res);
  } catch {}

  return res.json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found!",
    },
  });
});

export default app;
