import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminDeleteUserCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  BatchWriteItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

import type { JwtHeaderPayload } from "../../types/requestPayloads";
import type { DeleteAccountResponse } from "../../types/lambdaFunctionResponses";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
  "Access-Control-Allow-Methods": "GET",
};

// Initialize the Cognito client
const cognitoClient = new CognitoIdentityProviderClient({});

// Initialize the DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authorizationHeader = event.headers["Authorization"] || "";

    const decodedPayloadString = Buffer.from(
      authorizationHeader.split(".")[1],
      "base64"
    ).toString();

    const payload: JwtHeaderPayload = JSON.parse(decodedPayloadString); // { sub: "1234567890", name: "John Doe", iat: 1516239022 }

    const { email, sub: user_id } = payload; // Extract user_id from token

    if (!email) {
      throw new Error("Email not found in token payload");
    }

    // delete the user
    const params: AdminDeleteUserCommandInput = {
      UserPoolId: process.env.USERPOOL_USER_POOL_ID || "",
      Username: email,
    };

    const command = new AdminDeleteUserCommand(params);

    await cognitoClient.send(command);

    // Delete user's credit card entry
    await dynamoClient.send(
      new DeleteItemCommand({
        TableName: process.env.CREDITCARDSTABLE_TABLE_NAME || "",
        Key: { user_id: { S: user_id } },
      })
    );

    // Delete user's API key
    await dynamoClient.send(
      new DeleteItemCommand({
        TableName: process.env.APIKEYSTABLE_TABLE_NAME || "",
        Key: { user_id: { S: user_id } },
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
      } as DeleteAccountResponse),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error,
      } as DeleteAccountResponse),
    };
  }
};
