import { SQSEvent, SQSRecord } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const extractSnsDataFromSqsRecord = (
  record: SQSRecord
): {
  TopicArn: string;
  user_id: string | undefined;
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
  const { user_id, noCard, recurring } = recordBodyObject.Message
    ? (JSON.parse(recordBodyObject.Message) as {
        user_id?: string;
        noCard?: boolean | string;
        recurring?: boolean | string;
      })
    : {
        user_id: undefined,
        noCard: undefined,
        recurring: undefined,
      };
  return {
    TopicArn: recordBodyObject.TopicArn,
    user_id,
    noCard: parseBoolean(noCard),
    recurring: parseBoolean(recurring),
  };
};

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

const sendFailureEmail = async (
  email: string,
  user_id: string,
  reason: string
) => {
  try {
    const emailContent =
      reason === "noCard"
        ? `Dear User,\n\nYour payment failed because your payment card is not available. Please update your card information to ensure uninterrupted service.\n\nThank you.`
        : `Dear User,\n\nYour payment failed because your recurring payment option is disabled. Please enable recurring payments to avoid service interruptions.\n\nThank you.`;

    await sesClient.send(
      new SendEmailCommand({
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Body: {
            Text: {
              Charset: "UTF-8",
              Data: emailContent,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "Payment Failure Notification",
          },
        },
        Source: process.env.SES_SENDER_EMAIL || "no-reply@example.com",
        ConfigurationSetName: process.env.SESConfigurationSet,
      })
    );

    console.log(`Failed payment email sent successfully to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    throw new Error("Failed to send payment failure email");
  }
};

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    console.log("Processing record: ", record);

    const { user_id, noCard, recurring } = extractSnsDataFromSqsRecord(record);

    const email = await getUserEmail(user_id || "");
    if (email && process.env.SESConfigurationSet !== "None") {
      try {
        if (noCard) {
          console.log("API KEY HAS EXPIRED for user_id: ", user_id);
          await sendFailureEmail(email, user_id || "", "noCard");
        } else if (!recurring) {
          console.log("PAYMENT FAILURE for user_id: ", user_id);
          await sendFailureEmail(email, user_id || "", "notRecurring");
        }
      } catch (error) {
        console.error(
          `Failed to process payment failure for user ${user_id}:`,
          error
        );
        throw new Error("Failed to handle payment failure");
      }
    } else {
      console.warn(
        `No email found for user ${user_id} or SESConfigurationSet is missing.`
      );
    }
  }
};
