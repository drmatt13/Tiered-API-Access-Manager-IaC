export type CreditCardsTableItem = {
  user_id: {
    S: string;
  };
  valid: {
    BOOL: boolean;
  };
  recurring: {
    BOOL: boolean;
  };
};

export type PaymentTableItem = {
  user_id: {
    S: string;
  };
  amount: {
    S: string;
  };
  date: {
    S: string;
  };
};

export type APIKeysTableItem = {
  user_id: {
    S: string;
  };
  apiKey: {
    S: string;
  };
  tier: {
    S: "free" | "paid";
  };
  nextPayment: {
    S: string;
  };
};
