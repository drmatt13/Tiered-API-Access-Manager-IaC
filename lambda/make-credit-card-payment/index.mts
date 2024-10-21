import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// types
import { JwtHeaderPayload } from "../../types/requestPayloads";
import { MakeCreditCardPaymentResponse } from "../../types/lambdaFunctionResponses";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const snsClient = new SNSClient({});

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

    // get credit card
    const { Item } = await dynamoClient.send(
      new GetItemCommand({
        TableName: process.env.CREDITCARDSTABLE_TABLE_NAME || "CreditCards",
        Key: {
          user_id: { S: payload.sub },
        },
      })
    );

    // If Credit Card is not found, return 404
    if (!Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            name: "ItemNotFound",
            message: "Item not found",
          },
        } as MakeCreditCardPaymentResponse),
      };
    }

    // If Credit Card is invalid
    if (!Item.valid.BOOL) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            name: "InvalidCreditCard",
            message: "Invalid credit card",
          },
        } as MakeCreditCardPaymentResponse),
      };
    }

    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.PAYMENTSUCCESSTOPIC_TOPIC_ARN,
        Message: JSON.stringify({ user_id: payload.sub, amount: 20 }),
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
      } as MakeCreditCardPaymentResponse),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error,
      } as MakeCreditCardPaymentResponse),
    };
  }
};
