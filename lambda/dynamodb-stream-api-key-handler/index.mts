import { DynamoDBStreamEvent } from "aws-lambda";
import {
  APIGatewayClient,
  CreateApiKeyCommand,
  CreateUsagePlanKeyCommand,
  DeleteApiKeyCommand,
  DeleteUsagePlanKeyCommand,
  GetUsagePlanKeysCommand,
  GetUsagePlanKeysCommandInput,
} from "@aws-sdk/client-api-gateway";
import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";

import type { ApiKeyIdMapTableItem } from "../../types/tableItems";

const apiGatewayClient = new APIGatewayClient({
  region: process.env.AWS_REGION,
});
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    const newImage = record.dynamodb?.NewImage;
    const oldImage = record.dynamodb?.OldImage;

    switch (record.eventName) {
      case "INSERT":
        if (!newImage) {
          console.error("Missing NewImage in record.");
          return;
        }

        try {
          // Step 1: Create the API key directly
          const createApiKeyCommand = new CreateApiKeyCommand({
            name: newImage.user_id.S, // Use user_id as the name
            enabled: true,
            value: newImage.apiKey.S, // Use the apiKey as the value
          });

          const newApiKey = await apiGatewayClient.send(createApiKeyCommand);

          if (!newApiKey.id) {
            throw new Error("API Key ID not found in response.");
          }

          // Step 2: Associate the API key with the UsagePlanFree
          const createUsagePlanKeyCommand = new CreateUsagePlanKeyCommand({
            usagePlanId: process.env.USAGE_PLAN_FREE_ID, // Free usage plan ID from environment
            keyId: newApiKey.id,
            keyType: "API_KEY",
          });

          await apiGatewayClient.send(createUsagePlanKeyCommand);
          console.log(
            `API Key ${newApiKey.id} created and associated successfully.`
          );

          // Step 3: Store the API key ID in the mapping table
          const putItemCommand = new PutItemCommand({
            TableName: process.env.APIKEYIDMAPTABLE_TABLE_NAME,
            Item: {
              user_id: { S: (newImage as ApiKeyIdMapTableItem).user_id.S },
              apiKey_id: { S: newApiKey.id },
            },
          });

          await dynamoClient.send(putItemCommand);
          console.log(`API Key ${newApiKey.id} stored in ApiKeyIdMapTable.`);
        } catch (error) {
          console.error(
            "Error creating API key or associating with usage plan:",
            error
          );
        }
        break;

      case "MODIFY":
        if (!newImage || !oldImage) {
          console.error("Missing NewImage or OldImage in record.");
          return;
        }

        // Check if the tier has changed
        if (newImage?.tier.S !== oldImage.tier.S) {
          console.log(
            "API KEY TIER HAS CHANGED, UPDATE API KEY TIER IN APIGATEWAY"
          );

          try {
            // Step 1: Get the API key ID from DynamoDB (ApiKeyIdMapTable) using the user_id
            const getItemCommand = new GetItemCommand({
              TableName: process.env.APIKEYIDMAPTABLE_TABLE_NAME,
              Key: {
                user_id: { S: (newImage as ApiKeyIdMapTableItem).user_id.S },
              },
            });

            const { Item } = await dynamoClient.send(getItemCommand);
            const apiKeyId = (Item as ApiKeyIdMapTableItem)?.apiKey_id?.S;

            if (!apiKeyId) {
              throw new Error(
                `API Key ID not found for user_id: ${newImage.user_id.S}`
              );
            }

            // Step 2: Get usage plans that this API key is part of and remove the old association
            const usagePlans = [
              process.env.USAGE_PLAN_FREE_ID,
              process.env.USAGE_PLAN_PAID_ID,
            ]; // Add more if necessary

            for (const usagePlanId of usagePlans) {
              const getUsagePlanKeysCommandInput: GetUsagePlanKeysCommandInput =
                {
                  usagePlanId, // Usage plan ID (free or paid)
                  limit: 500,
                };

              const usagePlanKeysResponse = await apiGatewayClient.send(
                new GetUsagePlanKeysCommand(getUsagePlanKeysCommandInput)
              );

              // Step 3: Loop through the keys in each usage plan and check if the API key exists
              const apiKeys = usagePlanKeysResponse.items || [];

              for (const key of apiKeys) {
                if (key.id === apiKeyId) {
                  // Step 4: Remove the existing API key from the usage plan
                  const deleteUsagePlanKeyCommand =
                    new DeleteUsagePlanKeyCommand({
                      usagePlanId,
                      keyId: apiKeyId,
                    });

                  await apiGatewayClient.send(deleteUsagePlanKeyCommand);
                  console.log(
                    `Removed API Key ${apiKeyId} from Usage Plan ${usagePlanId}`
                  );
                }
              }
            }

            // Step 5: Determine the new usage plan based on the tier
            const usagePlanId =
              newImage.tier.S === "free"
                ? process.env.USAGE_PLAN_FREE_ID
                : process.env.USAGE_PLAN_PAID_ID;

            // Step 6: Associate the existing API key with the new usage plan
            const createUsagePlanKeyCommand = new CreateUsagePlanKeyCommand({
              usagePlanId,
              keyId: apiKeyId,
              keyType: "API_KEY",
            });

            await apiGatewayClient.send(createUsagePlanKeyCommand);
            console.log(
              `API Key ${apiKeyId} updated to ${newImage.tier.S} tier and associated with usage plan ${usagePlanId}.`
            );
          } catch (error) {
            console.error("Error updating API key tier:", error);
          }
        }

        // Check if the API key itself has changed (reset)
        if (newImage.apiKey.S !== oldImage.apiKey.S) {
          console.log(
            "API KEY HAS BEEN RESET, UPDATE API KEY IN APIGATEWAY BUT KEEP THE INVOCATIONS THE SAME"
          );

          try {
            // Step 1: Get the old API key ID from DynamoDB (ApiKeyIdMapTable) using the user_id
            const getItemCommand = new GetItemCommand({
              TableName: process.env.APIKEYIDMAPTABLE_TABLE_NAME,
              Key: {
                user_id: { S: (oldImage as ApiKeyIdMapTableItem).user_id.S },
              },
            });

            const { Item } = await dynamoClient.send(getItemCommand);
            const apiKeyId = (Item as ApiKeyIdMapTableItem)?.apiKey_id?.S;

            if (!apiKeyId) {
              throw new Error(
                `API Key ID not found for user_id: ${oldImage.user_id.S}`
              );
            }

            // Step 2: Remove the old API key from the usage plan
            const deleteApiKeyCommand = new DeleteApiKeyCommand({
              apiKey: apiKeyId,
            });

            await apiGatewayClient.send(deleteApiKeyCommand);
            console.log(`Old API Key ${apiKeyId} deleted.`);

            // Step 3: Create a new API key and associate it with the same usage plan
            const usagePlanId =
              newImage.tier.S === "free"
                ? process.env.USAGE_PLAN_FREE_ID
                : process.env.USAGE_PLAN_PAID_ID;

            const createApiKeyCommand = new CreateApiKeyCommand({
              name: newImage.user_id.S,
              enabled: true,
              value: newImage.apiKey.S,
            });

            const createdApiKey = await apiGatewayClient.send(
              createApiKeyCommand
            );
            console.log(
              `New API Key ${createdApiKey.id} created successfully.`
            );

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

            // Step 4: Update the API key ID in the mapping table
            const updateItemCommand = new UpdateItemCommand({
              TableName: process.env.APIKEYIDMAPTABLE_TABLE_NAME,
              Key: {
                user_id: { S: (newImage as ApiKeyIdMapTableItem).user_id.S },
              },
              UpdateExpression: "SET apiKey_id = :newApiKeyId",
              ExpressionAttributeValues: {
                ":newApiKeyId": { S: createdApiKey.id },
              },
            });

            await dynamoClient.send(updateItemCommand);
            console.log(
              `API Key ID updated in ApiKeyIdMapTable for user_id: ${newImage.user_id.S}`
            );
          } catch (error) {
            console.error("Error handling API key reset:", error);
          }
        }
        break;

      case "REMOVE":
        console.log("USER DELETED, DELETE API KEY ENTRY IN APIGATEWAY");

        if (oldImage && oldImage.apiKey) {
          try {
            // Step 1: Get the API key ID from DynamoDB (ApiKeyIdMapTable) using the user_id
            const getItemCommand = new GetItemCommand({
              TableName: process.env.APIKEYIDMAPTABLE_TABLE_NAME,
              Key: {
                user_id: { S: (oldImage as ApiKeyIdMapTableItem).user_id.S },
              },
            });

            const { Item } = await dynamoClient.send(getItemCommand);
            const apiKeyId = (Item as ApiKeyIdMapTableItem)?.apiKey_id?.S;

            if (!apiKeyId) {
              throw new Error(
                `API Key ID not found for user_id: ${oldImage.user_id.S}`
              );
            }

            // Step 2: Delete the API key from API Gateway
            const deleteApiKeyCommand = new DeleteApiKeyCommand({
              apiKey: apiKeyId,
            });

            await apiGatewayClient.send(deleteApiKeyCommand);
            console.log(`API Key ${apiKeyId} deleted successfully.`);

            // Step 3: Remove the entry from ApiKeyIdMapTable
            const deleteItemCommand = new DeleteItemCommand({
              TableName: process.env.APIKEYIDMAPTABLE_TABLE_NAME,
              Key: {
                user_id: { S: (oldImage as ApiKeyIdMapTableItem).user_id.S },
              },
            });

            await dynamoClient.send(deleteItemCommand);
            console.log(
              `API Key entry removed from ApiKeyIdMapTable for user_id: ${oldImage.user_id.S}`
            );
          } catch (error) {
            console.error("Error deleting API key:", error);
          }
        } else {
          console.error("OldImage or apiKey is missing in the stream record.");
        }
        break;

      default:
        console.error("Unknown event name:", record.eventName);
    }
  }
};
