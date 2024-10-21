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

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: SQSEvent) => {
  // Process each message in the SQS event
  for (const record of event.Records) {
    console.log("Processing record: ", record);

    // Parse the message body, which contains the EventBridge event
    const { TopicArn, user_id, amount, noCard, recurring } =
      extractSnsDataFromSqsRecord(record);

    try {
      // Log before attempting the insert to understand the state
      console.log(
        `Processing payment for user ${user_id} with amount ${amount}`
      );

      // Ensure that amount is a valid number
      if (!amount || isNaN(+amount)) {
        throw new Error(`Invalid amount: ${amount}`);
      }

      const today = formatDate(new Date());

      await dynamoClient.send(
        new PutItemCommand({
          TableName: process.env.PAYMENTSTABLE_TABLE_NAME || "Payments",
          Item: {
            user_id: { S: user_id },
            amount: { S: (+amount).toString() },
            date: { S: today },
          } as PaymentTableItem,
        })
      );

      // OPTIONALLY SEND SES EMAIL FOR PAYMENT SUCCESS HERE TO USER

      // ^^^^^^
    } catch (error) {
      throw new Error("Failed to insert payment record");
    }
  }
};
