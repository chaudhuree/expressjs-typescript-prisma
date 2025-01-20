import { ZodError, ZodIssue } from "zod";
import { TErrorDetails, TGenericErrorResponse } from "../interface/error";

const handleZodError = (err: ZodError): TGenericErrorResponse => {
  let message = "";
  const errorDetails: TErrorDetails = {
    issues: err.issues.map((issue: ZodIssue) => {
      message =
        message + issue.message == "Expected number, received string"
          ? issue?.path[issue.path.length - 1] + " " + issue.message
          : message + ". " + issue.message;
      return {
        path: issue?.path[issue.path.length - 1],
        message: issue.message,
      };
    }),
  };

  const statusCode = 400;

  return {
    statusCode,
    message,
    errorDetails,
  };
};

export default handleZodError;
