import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

// types
import { JwtHeaderPayload } from "../../types/requestPayloads";
import { PaymentTableItem } from "../../types/tableItems";
import { GetAccountPaymentHistoryResponse } from "../../types/lambdaFunctionResponses";
import { DynamoDBError } from "../../types/errors";

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

    // Execute the scan command to fetch all payments
    const { Items } = await dynamoClient.send(
      new ScanCommand({
        TableName: process.env.PAYMENTSTABLE_TABLE_NAME || "Payments",
      })
    );

    if (!Items || Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            name: "ItemNotFound",
            message: "No payments found for this user",
            status: 404,
            retryable: false,
          } as DynamoDBError,
        } as GetAccountPaymentHistoryResponse),
      };
    }

    const tableItems = Items.map((item: any) => ({
      user_id: { S: item.user_id.S },
      amount: { S: item.amount.S },
      date: { S: item.date.S },
    })) as PaymentTableItem[];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tableItems,
      } as GetAccountPaymentHistoryResponse),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error,
      } as GetAccountPaymentHistoryResponse),
    };
  }
};
