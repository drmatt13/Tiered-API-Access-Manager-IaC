import { SQSEvent, SQSRecord } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

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
const sesClient = new SESClient({ region: process.env.AWS_REGION });
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const getUserEmail = async (user_id: string): Promise<string | null> => {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: process.env.USERPOOL_USER_POOL_ID!, // User Pool ID from environment variable
      Username: user_id,
    });

    const response = await cognitoClient.send(command);
    const email = response.UserAttributes?.find(
      (attr) => attr.Name === "email"
    )?.Value;

    if (!email) {
      throw new Error(`Email not found for user: ${user_id}`);
    }

    return email;
  } catch (error) {
    console.error(`Failed to get user email for user ID ${user_id}:`, error);
    return null;
  }
};

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    console.log("Processing record: ", record);

    const { TopicArn, user_id, amount, noCard, recurring } =
      extractSnsDataFromSqsRecord(record);

    try {
      if (!user_id || !amount || isNaN(+amount)) {
        throw new Error(`Invalid data: user_id: ${user_id}, amount: ${amount}`);
      }

      console.log(
        `Processing payment for user ${user_id} with amount ${amount}`
      );

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

      const email = await getUserEmail(user_id);
      if (email && process.env.SESConfigurationSet) {
        await sesClient.send(
          new SendEmailCommand({
            Destination: {
              ToAddresses: [email],
            },
            Message: {
              Body: {
                Text: {
                  Charset: "UTF-8",
                  Data: `Dear User,\n\nYour monthly payment of $${amount} was successfully processed on ${today}.\n\nThank you for your business.`,
                },
              },
              Subject: {
                Charset: "UTF-8",
                Data: "Payment Success Notification",
              },
            },
            Source: process.env.SES_SENDER_EMAIL || "no-reply@example.com",
            ConfigurationSetName: process.env.SESConfigurationSet,
          })
        );

        console.log(`Email sent successfully to ${email}`);
      } else {
        console.warn(
          `No email found for user ${user_id} or SESConfigurationSet is missing.`
        );
      }
    } catch (error) {
      console.error(`Failed to process record for user ${user_id}:`, error);
      throw new Error("Failed to process payment record");
    }
  }
};
