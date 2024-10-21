import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  BatchWriteItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

// types
import { JwtHeaderPayload } from "../../types/requestPayloads";
import { FormatAccountResponse } from "../../types/lambdaFunctionResponses";

import {
  APIKeysTableItem,
  CreditCardsTableItem,
  PaymentTableItem,
} from "../../types/tableItems";

function getAdjustedDate(date: Date, monthsToAdjust: number): Date {
  // Adjust the date by the specified number of months
  const adjustedDate = new Date(date);
  adjustedDate.setMonth(adjustedDate.getMonth() + monthsToAdjust);

  // Check if the adjusted date overflowed (e.g., February 30th)
  if (adjustedDate.getDate() !== date.getDate()) {
    adjustedDate.setDate(0); // Set to the last day of the previous month
  }

  return adjustedDate;
}

function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

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

    const { sub, sub: userId } = payload; // Extract user_id from token

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
        UpdateExpression: "SET #tier = :tier, apiKey = :apiKey",
        ExpressionAttributeNames: {
          "#tier": "tier",
        },
        ExpressionAttributeValues: {
          ":tier": { S: "free" },
          ":apiKey": { S: newApiKey },
        },
      })
    );

    // assume account has been reset and is in a clean state
    // update ApiKeysTable, set tier to "paid" and nextPayment to today

    const today = new Date();
    const apiKeysTableItem = await dynamoClient.send(
      new UpdateItemCommand({
        TableName: process.env.APIKEYSTABLE_TABLE_NAME || "ApiKeys",
        Key: {
          user_id: { S: sub },
        },
        UpdateExpression: "SET tier = :tier, nextPayment = :nextPayment", // Update both tier and nextPayment
        ExpressionAttributeValues: {
          ":tier": { S: "paid" },
          ":nextPayment": {
            S: formatDate(today),
          },
        },
      })
    );

    // check if user has a credit card then...
    // create Item in  CreditCardsTable, set valid to true and recurring to true

    const creditCardsTableItem = await dynamoClient.send(
      new PutItemCommand({
        TableName: process.env.CREDITCARDSTABLE_TABLE_NAME || "CreditCards",
        Item: {
          user_id: { S: sub },
          valid: { BOOL: true },
          recurring: { BOOL: true },
        } as CreditCardsTableItem,
      })
    );

    // insert records into PaymentTable, each with a date 1 month apart in the past using the batchWriteItem operation
    const paymentTableItems: PaymentTableItem[] = [];

    for (let i = 1; i < 24; i++) {
      const adjustedDate = getAdjustedDate(today, -i); // Adjusting months backwards from the current month
      const formattedDate = formatDate(adjustedDate);

      paymentTableItems.push({
        user_id: { S: sub },
        amount: { S: "20" },
        date: { S: formattedDate },
      });
    }

    const paymentTableItemsBatch = paymentTableItems.map((item) => ({
      PutRequest: {
        Item: item,
      },
    }));

    await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [process.env.PAYMENTSTABLE_TABLE_NAME]: paymentTableItemsBatch,
        },
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tableItems: {
          apiKeysTableItem: {
            apiKey: { S: newApiKey },
            tier: { S: "paid" },
            nextPayment: { S: formatDate(today) },
            user_id: { S: sub },
          } as APIKeysTableItem,
          creditCardsTableItem: {
            user_id: { S: sub },
            valid: { BOOL: true },
            recurring: { BOOL: true },
          } as CreditCardsTableItem,
          paymentTableItems,
        },
      } as FormatAccountResponse),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error,
      } as FormatAccountResponse),
    };
  }
};
