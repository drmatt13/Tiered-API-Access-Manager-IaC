import { createContext } from "react";
import {
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

import SessionData from "../../../types/SessionData";
import type {
  ServiceResponseMap,
  ServicePayloadMap,
} from "../../../types/BackendRequest";
import type { PaymentTableItem } from "../../../types/tableItems";

interface ContextInterface {
  loadingSession: boolean;
  handleBackendServiceError: (error: any) => void;
  cachedSession: CognitoUserSession | null;
  setCachedSession: React.Dispatch<
    React.SetStateAction<CognitoUserSession | null>
  >;
  logout: () => void;
  sessionData: SessionData;
  setSessionData: React.Dispatch<React.SetStateAction<SessionData>>;
  userPool: CognitoUserPool;
  invokeBackendService: <T extends keyof ServiceResponseMap>(
    service: T,
    payload?: ServicePayloadMap[T],
    refreshed?: boolean
  ) => Promise<ServiceResponseMap[T]>;
  emailRef: React.MutableRefObject<string | undefined>;
  allPayments: PaymentTableItem[] | undefined;
  setAllPayments: React.Dispatch<
    React.SetStateAction<PaymentTableItem[] | undefined>
  >;
}

const Context = createContext<ContextInterface>({
  loadingSession: true,
  handleBackendServiceError: () => {},
  cachedSession: null,
  setCachedSession: () => {},
  logout: () => {},
  sessionData: { sessionLogs: [] },
  setSessionData: () => {},
  userPool: null as unknown as CognitoUserPool,
  invokeBackendService: async () => ({} as never),
  emailRef: { current: undefined },
  allPayments: undefined,
  setAllPayments: () => {},
});

export default Context;
