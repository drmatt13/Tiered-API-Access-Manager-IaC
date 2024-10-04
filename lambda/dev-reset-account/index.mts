import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  DynamoDBClient,
  DeleteItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

// types
import type { JwtHeaderPayload } from "../../types/requestPayloads";
import type { ResetAccountResponse } from "../../types/lambdaFunctionResponses";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

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

    const { sub: userId } = payload; // Extract user_id from token

    // Delete user's credit card entry
    await dynamoClient.send(
      new DeleteItemCommand({
        TableName: process.env.CREDITCARDSTABLE_TABLE_NAME || "",
        Key: { user_id: { S: userId } },
      })
    );

    // Query all payments for the user
    const paymentsQuery = await dynamoClient.send(
      new QueryCommand({
        TableName: process.env.PAYMENTSTABLE_TABLE_NAME || "",
        KeyConditionExpression: "user_id = :user_id",
        ExpressionAttributeValues: {
          ":user_id": { S: userId },
        },
      })
    );

    // Delete all payments for the user
    if (paymentsQuery.Items && paymentsQuery.Items.length > 0) {
      for (const item of paymentsQuery.Items) {
        await dynamoClient.send(
          new DeleteItemCommand({
            TableName: process.env.PAYMENTSTABLE_TABLE_NAME || "",
            Key: {
              user_id: { S: userId },
              date: { S: item.date.S },
            },
          })
        );
      }
    }

    // Update API key tier to "free" and randomize the API key
    const newApiKey = uuidv4();

    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: process.env.APIKEYSTABLE_TABLE_NAME || "",
        Key: { user_id: { S: userId } },
        UpdateExpression: "SET #tier = :tier, api_key = :apiKey",
        ExpressionAttributeNames: {
          "#tier": "tier",
        },
        ExpressionAttributeValues: {
          ":tier": { S: "free" },
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
      } as ResetAccountResponse),
    };
  } catch (error) {
    console.error("Error resetting user data: ", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      } as ResetAccountResponse),
    };
  }
};
