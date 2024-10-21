import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

// types
import { JwtHeaderPayload } from "../../types/requestPayloads";
import { APIKeysTableItem } from "../../types/tableItems";
import { GetAccountApiKeyResponse } from "../../types/lambdaFunctionResponses";
import { DynamoDBError } from "../../types/errors";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
  "Access-Control-Allow-Methods": "GET",
};

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

    console.log("SUB: ", payload.sub);

    const { Item } = await dynamoClient.send(
      new GetItemCommand({
        TableName: process.env.APIKEYSTABLE_TABLE_NAME || "ApiKeys",
        Key: {
          user_id: { S: payload.sub },
        },
      })
    );

    const tableItem = Item as unknown as APIKeysTableItem;

    if (!tableItem) {
      console.log("Item not found");
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            name: "ItemNotFound",
            message: "Item not found",
            status: 404,
            retryable: false,
          } as DynamoDBError,
        } as GetAccountApiKeyResponse),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tableItem,
      } as GetAccountApiKeyResponse),
    };
  } catch (error) {
    console.error("Error: ", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error,
      } as GetAccountApiKeyResponse),
    };
  }
};
