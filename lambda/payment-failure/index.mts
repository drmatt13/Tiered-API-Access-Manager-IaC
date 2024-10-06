import { SQSEvent, SQSRecord } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

// types
import { PaymentTableItem } from "../../types/tableItems";

const extractSnsDataFromSqsRecord = (
  record: SQSRecord
): {
  TopicArn: string;
  user_id: string | undefined;
  amount: string | undefined;
  noCard: boolean | undefined;
  recurring: boolean | undefined;
} => {
  const parseBoolean = (
    value: boolean | string | undefined
  ): boolean | undefined => {
    if (value === "true") {
      return true;
    } else if (value === "false") {
      return false;
    } else if (typeof value === "boolean") {
      return value;
    }
    return undefined;
  };
  const recordBodyObject = JSON.parse(record.body) as {
    TopicArn: string;
    Message?: string;
  };
  const { user_id, amount, noCard, recurring } = recordBodyObject.Message
    ? (JSON.parse(recordBodyObject.Message) as {
        user_id?: string;
        amount?: string;
        noCard?: boolean | string;
        recurring?: boolean | string;
      })
    : {
        user_id: undefined,
        amount: undefined,
        noCard: undefined,
        recurring: undefined,
      };
  return {
    TopicArn: recordBodyObject.TopicArn,
    user_id,
    amount,
    recurring: parseBoolean(recurring),
    noCard: parseBoolean(noCard),
  };
};

const formatDate = (date: Date) => {
  const [year, month, day] = date.toISOString().split("T")[0].split("-");
  return `${month}-${day}-${year}`;
};

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

export const handler = async (event: SQSEvent) => {
  // Process each message in the SQS event
  for (const record of event.Records) {
    console.log("Processing record: ", record);

    // Parse the message body, which contains the EventBridge event
    const { user_id, noCard, recurring } = extractSnsDataFromSqsRecord(record);

    try {
      if (noCard || !recurring) {
        console.log("API KEY HAS EXPIRED for user_id: ", user_id);
      } else {
        console.log("PAYMENT FAILURE for user_id: ", user_id);
      }
    } catch (error) {
      throw new Error("Failed to handle payment failure");
    }
  }
};
