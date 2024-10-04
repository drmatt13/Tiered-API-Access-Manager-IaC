export interface DynamoDBError {
  name:
    | "AccessDeniedException"
    | "ConditionalCheckFailedException"
    | "IncompleteSignatureException"
    | "ItemCollectionSizeLimitExceededException"
    | "LimitExceededException"
    | "MissingAuthenticationTokenException"
    | "ProvisionedThroughputExceeded"
    | "ProvisionedThroughputExceededException"
    | "RequestLimitExceeded"
    | "ResourceInUseException"
    | "ResourceNotFoundException"
    | "ThrottlingException"
    | "UnrecognizedClientException"
    | "ValidationException"
    | "Internal Server Error"
    | "ItemNotFound"
    | "ItemAlreadyExists";
  message: string;
  status: number; // Like 400 or 500
  retryable: boolean; // A derived field that indicates if the error can be retried or not
}

// Dynamically create an array of the allowed error names
const allowedErrorNames: DynamoDBError["name"][] = [
  "AccessDeniedException",
  "ConditionalCheckFailedException",
  "IncompleteSignatureException",
  "ItemCollectionSizeLimitExceededException",
  "LimitExceededException",
  "MissingAuthenticationTokenException",
  "ProvisionedThroughputExceeded",
  "ProvisionedThroughputExceededException",
  "RequestLimitExceeded",
  "ResourceInUseException",
  "ResourceNotFoundException",
  "ThrottlingException",
  "UnrecognizedClientException",
  "ValidationException",
  "Internal Server Error",
  "ItemNotFound",
  "ItemAlreadyExists",
];

// Type guard to check if the error matches the DynamoDBError interface
export function isDynamoDBError(error: any): error is DynamoDBError {
  return (
    typeof error === "object" &&
    typeof error.name === "string" &&
    typeof error.message === "string" &&
    typeof error.status === "number" &&
    typeof error.retryable === "boolean" &&
    allowedErrorNames.includes(error.name)
  );
}
