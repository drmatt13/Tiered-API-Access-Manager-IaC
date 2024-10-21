import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  APIGatewayClient,
  CreateApiKeyCommand,
  CreateUsagePlanKeyCommand,
  DeleteApiKeyCommand,
} from "@aws-sdk/client-api-gateway";
import {
  DynamoDBClient,
  UpdateItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";

// types
import type { JwtHeaderPayload } from "../../types/requestPayloads";
import type { ResetInvocationQuotaResponse } from "../../types/lambdaFunctionResponses";
import type {
  APIKeysTableItem,
  ApiKeyIdMapTableItem,
} from "../../types/tableItems";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
  "Access-Control-Allow-Methods": "GET",
};

const apiGatewayClient = new APIGatewayClient({
  region: process.env.AWS_REGION,
});
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

    const payload: JwtHeaderPayload = JSON.parse(decodedPayloadString);

    const { sub: userId } = payload; // Extract user_id from token

    // get tier from APIKeysTableItem using user_id
    const getAPIKeysTableItemCommand = new GetItemCommand({
      TableName: process.env.APIKEYSTABLE_TABLE_NAME,
      Key: {
        user_id: { S: userId },
      },
    });
    let { Item: apiKeysTableItem } = await dynamoClient.send(
      getAPIKeysTableItemCommand
    );
    let tier = (apiKeysTableItem as APIKeysTableItem)?.tier?.S;

    if (!tier) {
      throw new Error(`Tier not found for user_id: ${userId}`);
    }

    const usagePlanId =
      tier === "free"
        ? process.env.USAGE_PLAN_FREE_ID
        : process.env.USAGE_PLAN_PAID_ID;

    // reset api key
    const newApiKey = uuidv4();

    const updatedApiKeyItem = await dynamoClient.send(
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

    if (!updatedApiKeyItem) {
      throw new Error("API key not updated");
    }

    // Get the API key ID from DynamoDB (ApiKeyIdMapTable) using the user_id
    const getApiKeyIdMapTableItemCommand = new GetItemCommand({
      TableName: process.env.APIKEYIDMAPTABLE_TABLE_NAME,
      Key: {
        user_id: { S: userId },
      },
    });

    let { Item: apiKeyIdMapTableItem } = await dynamoClient.send(
      getApiKeyIdMapTableItemCommand
    );
    let apiKeyId = (apiKeyIdMapTableItem as ApiKeyIdMapTableItem)?.apiKey_id?.S;

    // If the user does not have an API key ID, return an error
    if (!apiKeyId) {
      throw new Error(`API Key ID not found for user_id: ${userId}`);
    }

    // Delete the API key from the API Gateway
    const deleteCommand = new DeleteApiKeyCommand({ apiKey: apiKeyId });
    await apiGatewayClient.send(deleteCommand);

    // Create a new API key
    const createApiKeyCommand = new CreateApiKeyCommand({
      name: userId,
      enabled: true,
      value: newApiKey,
    });

    const createdApiKey = await apiGatewayClient.send(createApiKeyCommand);
    console.log(`New API Key ${createdApiKey.id} created successfully.`);

    const createUsagePlanKeyCommand = new CreateUsagePlanKeyCommand({
      usagePlanId,
      keyId: createdApiKey.id,
      keyType: "API_KEY",
    });

    await apiGatewayClient.send(createUsagePlanKeyCommand);
    console.log(
      `New API Key ${createdApiKey.id} associated with usage plan ${usagePlanId}.`
    );

    if (!createdApiKey.id) {
      throw new Error("API Key ID not found in response.");
    }

    // add the new API key ID to the ApiKeyIdMapTable
    const updateItemCommand = new UpdateItemCommand({
      TableName: process.env.APIKEYIDMAPTABLE_TABLE_NAME,
      Key: {
        user_id: {
          S: (apiKeyIdMapTableItem as ApiKeyIdMapTableItem).user_id.S,
        },
      },
      UpdateExpression: "SET apiKey_id = :newApiKeyId",
      ExpressionAttributeValues: {
        ":newApiKeyId": { S: createdApiKey.id },
      },
    });

    await dynamoClient.send(updateItemCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        apiKey: newApiKey,
      } as ResetInvocationQuotaResponse),
    };
  } catch (error) {
    console.error("Error resetting user data: ", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      } as ResetInvocationQuotaResponse),
    };
  }
};
