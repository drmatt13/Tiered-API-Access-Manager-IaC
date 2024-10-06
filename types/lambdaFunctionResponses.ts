import {
  APIKeysTableItem,
  CreditCardsTableItem,
  PaymentTableItem,
} from "./tableItems";
import { DynamoDBError } from "./errors";

export type MakeCreditCardPaymentResponse = {
  success: boolean;
  error?: DynamoDBError | Error;
};

export type GetAccountCreditCardResponse = {
  success: boolean;
  tableItem?: CreditCardsTableItem;
  error?: DynamoDBError | Error;
};

export type EditAccountCreditCardResponse = {
  success: boolean;
  tableItem?: CreditCardsTableItem;
  error?: DynamoDBError | Error;
};

export type GetAccountPaymentHistoryResponse = {
  success: boolean;
  tableItems?: PaymentTableItem[];
  error?: DynamoDBError | Error;
};

export type DeleteAccountResponse = {
  success: boolean;
  error?: DynamoDBError | Error;
};

export type GetAccountApiKeyResponse = {
  success: boolean;
  tableItem?: APIKeysTableItem;
  error?: DynamoDBError | Error;
};

export type ResetAccountApiKeyResponse = {
  success: boolean;
  apiKey?: string;
  error?: DynamoDBError | Error;
};

// development services
export type CreateTestUserResponse = {
  success: boolean;
  error?: DynamoDBError | Error;
};

export type FormatAccountResponse = {
  tableItems?: {
    apiKeysTableItem: APIKeysTableItem;
    creditCardsTableItem: CreditCardsTableItem;
    paymentTableItems: PaymentTableItem[];
  };
  success: boolean;
  error?: DynamoDBError | Error;
};

export type InvokeRenewSubscriptionsResponse = {
  success: boolean;
  error?: DynamoDBError | Error;
};

export type ResetAccountResponse = {
  success: boolean;
  apiKey?: string;
  error?: DynamoDBError | Error;
};

export type PollAllPaymentsResponse = {
  success: boolean;
  tableItems?: PaymentTableItem[];
  error?: DynamoDBError | Error;
};
