import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { InvokeDailyBillingResponse } from "../../types/lambdaFunctionResponses";
import {
  SQSClient,
  SendMessageCommand,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({ region: "us-east-1" });

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
    console.log(`Queue URL:`, process.env.RENEWSUBSCRIPTIONSQUEUE_QUEUE_URL);

    const params: SendMessageCommandInput = {
      QueueUrl: process.env.RENEWSUBSCRIPTIONSQUEUE_QUEUE_URL || "",
      MessageBody: JSON.stringify({
        message: "Daily billing process initiated.",
      }),
    };

    const command = new SendMessageCommand(params);
    await sqsClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
      } as InvokeDailyBillingResponse),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error,
      } as InvokeDailyBillingResponse),
    };
  }
};
