import { DynamoDBStreamEvent } from "aws-lambda";

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    // Handle each record's eventName (INSERT, MODIFY, REMOVE)
    switch (record.eventName) {
      case "INSERT":
        console.log("USER CREATED, CREATE API KEY ENTRY IN APIGATEWAY");
        console.log("Insert record:", record.dynamodb);
        break;
      case "MODIFY":
        // if tier changes, console.log("Update API KEY TIER IN APIGATEWAY");
        if (
          record.dynamodb?.NewImage?.tier.S !==
          record.dynamodb?.OldImage?.tier.S
        ) {
          console.log(
            "API KEY TIER HAS CHANGED, UPDATE API KEY TIER IN APIGATEWAY"
          );
        }
        if (
          record.dynamodb?.NewImage?.apiKey.S !==
          record.dynamodb?.OldImage?.apiKey.S
        ) {
          console.log(
            "API KEY HAS BEEN RESET, UPDATE API KEY IN APIGATEWAY BUT KEEP THE INVOCATIONS THE SAME"
          );
        }
        console.log("Modify record:", record.dynamodb);
        break;
      case "REMOVE":
        // Handle remove logic
        console.log("USER DELETED, DELETE API KEY ENTRY IN APIGATEWAY");
        console.log("Remove record:", record.dynamodb);
        // ^ only OldImage is available
        break;
      default:
        console.error("Unknown event name:", record.eventName);
    }
  }
};
