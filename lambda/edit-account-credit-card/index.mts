import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

// types
import { JwtHeaderPayload } from "../../types/requestPayloads";
import { CreditCardsTableItem } from "../../types/tableItems";
import { EditAccountCreditCardResponse } from "../../types/lambdaFunctionResponses";
import { DynamoDBError } from "../../types/errors";
import { ServicePayloadMap } from "../../types/BackendRequest";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

function returnResult(statusCode: number, body: string) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Allow-Methods": "POST, PUT, DELETE",
    },
    body,
  };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authorizationHeader = event.headers["Authorization"] || "";

    const decodedPayloadString = Buffer.from(
      authorizationHeader.split(".")[1],
      "base64"
    ).toString();

    const payload: JwtHeaderPayload = JSON.parse(decodedPayloadString);

    const httpMethod = event.httpMethod;

    switch (httpMethod as string) {
      case "POST":
        const { Item: existingItem } = await dynamoClient.send(
          new GetItemCommand({
            TableName: process.env.CREDITCARDSTABLE_TABLE_NAME || "CreditCards",
            Key: { user_id: { S: payload.sub } },
          })
        );

        if (existingItem) {
          return returnResult(
            200,
            JSON.stringify({
              success: false,
              error: {
                name: "ItemAlreadyExists",
                message: "Item already exists",
                retryable: false,
                status: 400,
              } as DynamoDBError,
            } as EditAccountCreditCardResponse)
          );
        }

        await dynamoClient.send(
          new PutItemCommand({
            TableName: process.env.CREDITCARDSTABLE_TABLE_NAME || "CreditCards",
            Item: {
              user_id: { S: payload.sub },
              valid: { BOOL: true },
              recurring: { BOOL: false },
            } as CreditCardsTableItem,
          })
        );

        return returnResult(
          200,
          JSON.stringify({
            success: true,
            tableItem: {
              user_id: { S: payload.sub },
              valid: { BOOL: true },
              recurring: { BOOL: false },
            },
          } as EditAccountCreditCardResponse)
        );

      case "PUT":
        const body = JSON.parse(event.body || "{}");
        const { valid, recurring } =
          body as ServicePayloadMap["EditAccountCreditCard"];
        // Start building the update expression and attribute values dynamically
        let updateExpression: string = "set ";
        let expressionAttributeValues: { [key: string]: any } = {};
        let expressionAttributeNames: { [key: string]: string } = {};
        let hasAttributesToUpdate: boolean = false;

        if (body.hasOwnProperty("valid")) {
          updateExpression += "#v = :v, ";
          expressionAttributeValues[":v"] = { BOOL: valid };
          expressionAttributeNames["#v"] = "valid";
          hasAttributesToUpdate = true;
        }

        if (body.hasOwnProperty("recurring")) {
          updateExpression += "#r = :r, ";
          expressionAttributeValues[":r"] = { BOOL: recurring };
          expressionAttributeNames["#r"] = "recurring";
          hasAttributesToUpdate = true;
        }

        // Remove the trailing comma
        updateExpression = updateExpression.slice(0, -2);

        // Only proceed if there are attributes to update
        if (hasAttributesToUpdate) {
          await dynamoClient.send(
            new UpdateItemCommand({
              TableName:
                process.env.CREDITCARDSTABLE_TABLE_NAME || "CreditCards",
              Key: { user_id: { S: payload.sub } },
              UpdateExpression: updateExpression,
              ExpressionAttributeValues: expressionAttributeValues,
              ExpressionAttributeNames: expressionAttributeNames,
              ReturnValues: "UPDATED_NEW",
            })
          );

          return returnResult(
            200,
            JSON.stringify({
              success: true,
            } as EditAccountCreditCardResponse)
          );
        } else {
          // Handle case where no known attributes were provided to update
          return returnResult(
            200,
            JSON.stringify({
              success: false,
              error: {
                retryable: false,
                status: 400,
                name: "ValidationException",
                message: "No known attributes provided to update",
              } as DynamoDBError,
            } as EditAccountCreditCardResponse)
          );
        }

      case "DELETE":
        await dynamoClient.send(
          new DeleteItemCommand({
            TableName: process.env.CREDITCARDSTABLE_TABLE_NAME || "CreditCards",
            Key: {
              user_id: { S: payload.sub },
            },
          })
        );

        return returnResult(
          200,
          JSON.stringify({
            success: true,
          } as EditAccountCreditCardResponse)
        );

      default:
        throw {
          name: "MethodNotAllowed",
          message: "Method not allowed",
          status: 405,
          retryable: false,
        };
    }
  } catch (error) {
    return {
      statusCode: ((error as any)?.status as number) || 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify({
        success: false,
        error,
      } as EditAccountCreditCardResponse),
    };
  }
};
