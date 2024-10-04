import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  DynamoDBClient,
  PutItemCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";

// types
import { JwtHeaderPayload } from "../../types/requestPayloads";
import { CreateTestUserResponse } from "../../types/lambdaFunctionResponses";

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

    // const { sub, sub: userId } = payload; // Extract user_id from token

    const newUserId = uuidv4();
    const newApiKey = uuidv4();
    const today = new Date();

    // create a new user with a free tier
    await dynamoClient.send(
      new PutItemCommand({
        TableName: process.env.APIKEYSTABLE_TABLE_NAME || "ApiKeys",
        Item: {
          user_id: { S: newUserId },
          nextPayment: { S: formatDate(today) },
          apiKey: { S: newApiKey },
          tier: { S: "paid" },
        } as APIKeysTableItem,
      })
    );

    // create a credit card entry for the new user
    const creditCardsTableItem = await dynamoClient.send(
      new PutItemCommand({
        TableName: process.env.CREDITCARDSTABLE_TABLE_NAME || "CreditCards",
        Item: {
          user_id: { S: newUserId },
          valid: { BOOL: true },
          recurring: { BOOL: true },
        } as CreditCardsTableItem,
      })
    );

    // create a random amount of previous payments for the new user
    // insert records into PaymentTable, each with a date 1 month apart in the past using the batchWriteItem operation
    const paymentTableItems: PaymentTableItem[] = [];

    for (let i = 1; i <= Math.floor(Math.random() * 12) + 1; i++) {
      const adjustedDate = getAdjustedDate(today, -i); // Adjusting months backwards from the current month
      const formattedDate = formatDate(adjustedDate);

      paymentTableItems.push({
        user_id: { S: newUserId },
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
      } as CreateTestUserResponse),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error,
      } as CreateTestUserResponse),
    };
  }
};
