import { SQSEvent, SQSRecord } from "aws-lambda";
import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

// types
import { APIKeysTableItem } from "../../types/tableItems";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const extractSnsDataFromSqsRecord = (
  record: SQSRecord
): { TopicArn: string; user_id: string | undefined } => {
  const recordBodyObject = JSON.parse(record.body) as {
    TopicArn: string;
    Message?: string;
  };
  const { user_id } = recordBodyObject.Message
    ? (JSON.parse(recordBodyObject.Message) as {
        user_id?: string;
      })
    : { user_id: undefined };
  return { user_id, TopicArn: recordBodyObject.TopicArn };
};

const formatDate = (date: Date) => {
  const [year, month, day] = date.toISOString().split("T")[0].split("-");
  return `${month}-${day}-${year}`;
};

function getAdjustedDate(dateStr: string, direction: "forward" | "backward") {
  const [month, day, year] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (direction === "forward") date.setMonth(date.getMonth() + 1);
  else if (direction === "backward") date.setMonth(date.getMonth() - 1);
  return formatDate(date);
}

export const handler = async (event: SQSEvent) => {
  // Process each message in the SQS event
  for (const record of event.Records) {
    const { TopicArn, user_id } = extractSnsDataFromSqsRecord(record);

    switch (TopicArn) {
      case process.env.ACCOUNTCREATEDTOPIC_TOPIC_ARN:
        try {
          await dynamoClient.send(
            new PutItemCommand({
              TableName: process.env.APIKEYSTABLE_TABLE_NAME || "ApiKeys",
              Item: {
                user_id: { S: user_id },
                nextPayment: { S: "none" }, // Add the new attribute for GSI
                apiKey: { S: uuidv4() }, // Use apiKey instead of api_key
                tier: { S: "free" },
              } as APIKeysTableItem,
            })
          );
          console.log(`API key created for user ${user_id}`);
        } catch (error) {
          throw new Error(
            `Failed to create API key: ${(error as Error).message || ""}`
          );
        }
        break;

      case process.env.PAYMENTSUCCESSTOPIC_TOPIC_ARN:
        try {
          const today = new Date();
          await dynamoClient.send(
            new UpdateItemCommand({
              TableName: process.env.APIKEYSTABLE_TABLE_NAME || "ApiKeys",
              Key: {
                user_id: { S: user_id || "" },
              },
              UpdateExpression: "SET tier = :tier, nextPayment = :nextPayment",
              ExpressionAttributeValues: {
                ":tier": { S: "paid" },
                ":nextPayment": {
                  S: getAdjustedDate(formatDate(today), "forward"),
                }, // Provide the next payment date here
              },
            })
          );
          console.log(
            `User ${user_id} tier updated to 'paid' and nextPayment updated`
          );
        } catch (error) {
          throw new Error("Failed to update tier and nextPayment");
        }
        break;

      case process.env.PAYMENTFAILURETOPIC_TOPIC_ARN:
        try {
          // Downgrade the user's tier back to "free" on failed payment
          await dynamoClient.send(
            new UpdateItemCommand({
              TableName: process.env.APIKEYSTABLE_TABLE_NAME || "ApiKeys",
              Key: {
                user_id: { S: user_id || "" }, // No need for nextPayment in the key
              },
              UpdateExpression: "SET tier = :tier, nextPayment = :nextPayment",
              ExpressionAttributeValues: {
                ":tier": { S: "free" },
                ":nextPayment": { S: "none" },
              },
            })
          );
          console.log(
            `User ${user_id} tier downgraded to 'free' due to failed payment`
          );
        } catch (error) {
          throw new Error("Failed to downgrade tier to 'free'");
        }
        break;

      default:
        throw new Error(`Unknown topic: ${TopicArn}`);
    }
  }
};
