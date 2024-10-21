import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

// types
import { JwtHeaderPayload } from "../../types/requestPayloads";
import { PaymentTableItem } from "../../types/tableItems";
import { GetAccountPaymentHistoryResponse } from "../../types/lambdaFunctionResponses";
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

    // Query DynamoDB to fetch all payments for the user
    const { Items } = await dynamoClient.send(
      new QueryCommand({
        TableName: process.env.PAYMENTSTABLE_TABLE_NAME || "Payments",
        KeyConditionExpression: "user_id = :userId",
        ExpressionAttributeValues: {
          ":userId": { S: payload.sub },
        },
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
