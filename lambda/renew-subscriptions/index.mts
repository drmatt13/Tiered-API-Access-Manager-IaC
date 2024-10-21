import { SQSEvent } from "aws-lambda";
import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// types
import {
  APIKeysTableItem,
  CreditCardsTableItem,
  PaymentTableItem,
} from "../../types/tableItems";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const snsClient = new SNSClient({});

// Function to format date as MM-DD-YYYY
const formatDate = (date: Date) => {
  const [year, month, day] = date.toISOString().split("T")[0].split("-");
  return `${month}-${day}-${year}`;
};

export const handler = async (event: SQSEvent) => {
  // Get today's date in MM-DD-YYYY format
  const todayDate = formatDate(new Date());

  try {
    // Query the ApiKeysTable using the GSI (NextPaymentIndex) to get all items due today
    const queryCommand = new QueryCommand({
      TableName: process.env.APIKEYSTABLE_TABLE_NAME,
      IndexName: "NextPaymentIndex", // Use the GSI name
      KeyConditionExpression: "nextPayment = :todayDate",
      ExpressionAttributeValues: {
        ":todayDate": { S: todayDate }, // Today's date in MM-DD-YYYY format
      },
    });

    const { Items: ApiKeyItems } = await dynamoClient.send(queryCommand);

    // If there are items due today, process them further
    if (!ApiKeyItems || ApiKeyItems.length === 0) {
      console.log("No ApiKeyItems found for today's date:", todayDate);
      return;
    }

    for (let ApiKeyItem of ApiKeyItems) {
      console.log("Processing ApiKeyItem:", ApiKeyItem);

      // check if payment has already been made for today
      const { Item: PaymentItem } = await dynamoClient.send(
        new GetItemCommand({
          TableName: process.env.PAYMENTSTABLE_TABLE_NAME || "Payments",
          Key: {
            user_id: { S: (ApiKeyItem as APIKeysTableItem).user_id.S },
            date: { S: todayDate },
          },
        })
      );

      // if payment has already been made for today, skip this user
      if (PaymentItem) {
        console.log("Payment already made for today for user:", PaymentItem);
        continue;
      }

      // get creditcard for the user
      const { Item: CreditCardItem } = await dynamoClient.send(
        new GetItemCommand({
          TableName: process.env.CREDITCARDSTABLE_TABLE_NAME || "CreditCards",
          Key: {
            user_id: { S: (ApiKeyItem as APIKeysTableItem).user_id.S },
          },
        })
      );

      console.log("CreditCardItem:", CreditCardItem);

      // if (No card) for user then invoke -> (payment failed topic) with (no card flag)
      if (!CreditCardItem) {
        await snsClient.send(
          new PublishCommand({
            TopicArn: process.env.PAYMENTFAILURETOPIC_TOPIC_ARN,
            Message: JSON.stringify({
              user_id: (ApiKeyItem as APIKeysTableItem).user_id.S,
              noCard: true,
              recurring: false,
            }),
          })
        );
        return;
      }

      // if (!recurring) invoke -> (payment failed topic) with (recurring === false)
      if (!(CreditCardItem as CreditCardsTableItem).recurring.BOOL) {
        await snsClient.send(
          new PublishCommand({
            TopicArn: process.env.PAYMENTFAILURETOPIC_TOPIC_ARN,
            Message: JSON.stringify({
              user_id: (ApiKeyItem as APIKeysTableItem).user_id.S,
              noCard: false,
              recurring: false,
            }),
          })
        );
        return;
      }

      // if (recurring && !valid) invoke -> (payment failed topic) with (failedPayment === true)
      if (
        (CreditCardItem as CreditCardsTableItem).recurring.BOOL &&
        !(CreditCardItem as CreditCardsTableItem).valid.BOOL
      ) {
        await snsClient.send(
          new PublishCommand({
            TopicArn: process.env.PAYMENTFAILURETOPIC_TOPIC_ARN,
            Message: JSON.stringify({
              user_id: (ApiKeyItem as APIKeysTableItem).user_id.S,
              noCard: false,
              recurring: true,
            }),
          })
        );
        // ^ set recurring as false in (CreditCardTable) for this user using updateItem
        await dynamoClient.send(
          new UpdateItemCommand({
            TableName: process.env.CREDITCARDSTABLE_TABLE_NAME || "CreditCards",
            Key: {
              user_id: { S: (ApiKeyItem as APIKeysTableItem).user_id.S },
            },
            UpdateExpression: "SET recurring = :recurring",
            ExpressionAttributeValues: {
              ":recurring": { BOOL: false },
            },
          })
        );
        return;
      }

      // if (recurring && valid) invoke -> (payment failed topic) with (amount = 20)
      if (
        (CreditCardItem as CreditCardsTableItem).recurring.BOOL &&
        (CreditCardItem as CreditCardsTableItem).valid.BOOL
      ) {
        const res = await snsClient.send(
          new PublishCommand({
            TopicArn: process.env.PAYMENTSUCCESSTOPIC_TOPIC_ARN,
            Message: JSON.stringify({
              user_id: (ApiKeyItem as APIKeysTableItem).user_id.S,
              amount: 20,
            }),
          })
        );
        console.log("Payment successful for user:", res);
        return;
      }
    }
  } catch (error) {
    console.error(error);
    throw new Error("Error processing daily billing");
  }
};
