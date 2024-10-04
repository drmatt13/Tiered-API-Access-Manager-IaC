import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

// types
import { JwtHeaderPayload } from "../../types/requestPayloads";
import { ResetAccountApiKeyResponse } from "../../types/lambdaFunctionResponses";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
  "Access-Control-Allow-Methods": "POST",
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

    const newApiKey = uuidv4();

    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: process.env.APIKEYSTABLE_TABLE_NAME || "ApiKeys",
        Key: {
          user_id: { S: payload.sub },
        },
        UpdateExpression: "SET apiKey = :apiKey",
        ExpressionAttributeValues: {
          ":apiKey": { S: newApiKey },
        },
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        apiKey: newApiKey,
      } as ResetAccountApiKeyResponse),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error,
      } as ResetAccountApiKeyResponse),
    };
  }
};
