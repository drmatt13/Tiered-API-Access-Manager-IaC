import { useState, useEffect, useCallback, useRef } from "react";
import {
  CognitoUserSession,
  CognitoUserPool,
} from "amazon-cognito-identity-js";
import axios, { AxiosError } from "axios";
import jwt from "jsonwebtoken";

import { isDynamoDBError } from "../../../types/errors";

// types
import type SessionData from "../../../types/SessionData";
import type {
  Service,
  ServiceResponseMap,
  ServicePayloadMap,
} from "../../../types/BackendRequest";

const API_ENDPOINT = import.meta.env.VITE_ApiKeyManagerBackendUrl as string;

const poolData = {
  UserPoolId: import.meta.env.VITE_CognitoUserPoolId as string,
  ClientId: import.meta.env.VITE_CognitoUserPoolClientId as string,
};

const userPool = new CognitoUserPool(poolData);

const serviceMap: Record<
  Service,
  {
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
  }
> = {
  MakeCrediCardPayment: { method: "POST", path: "/make-credit-card-payment" },
  GetAccountCreditCard: { method: "GET", path: "/get-account-credit-card" },
  CreateAccountCreditCard: {
    method: "POST",
    path: "/edit-account-credit-card",
  },
  EditAccountCreditCard: {
    method: "PUT",
    path: "/edit-account-credit-card",
  },
  DeleteAccountCreditCard: {
    method: "DELETE",
    path: "/edit-account-credit-card",
  },
  GetAccountApiKey: { method: "GET", path: "/get-account-api-key" },
  ResetAccountApiKey: { method: "POST", path: "/reset-account-api-key" },
  DeleteAcount: { method: "DELETE", path: "/delete-account" },
  GetAccountPaymentHistory: {
    method: "GET",
    path: "/get-account-payment-history",
  },
  // Development Services
  CreateTestUser: { method: "GET", path: "/dev-create-test-user" },
  FormatAccount: { method: "GET", path: "/dev-format-account" },
  InvokeRenewSubscriptions: {
    method: "GET",
    path: "/dev-invoke-renew-subscriptions",
  },
  ResetAccount: { method: "GET", path: "/dev-reset-account" },
  PollAllPayments: {
    method: "GET",
    path: "/dev-poll-all-payments",
  },
  ResetInvocationQuota: {
    method: "GET",
    path: "/dev-reset-invocation-quota",
  },
};

const isTokenExpired = (token: string): boolean => {
  const decodedToken = jwt.decode(token) as { exp: number };
  const currentTime = Math.floor(Date.now() / 1000);
  return decodedToken.exp < currentTime;
};

const handleBackendServiceError = (error: any, showAlert: boolean = false) => {
  if (isDynamoDBError(error)) {
    // console.log("DynamoDB error:", error.name);
    if (error.name === "ItemNotFound" && showAlert) {
      alert("Item not found");
    } else if (showAlert) {
      alert(error.name);
    }
  } else if (showAlert) {
    alert("An error occurred");
  }

  throw new Error(error?.name || "Unknown error");
};

const UseSession = () => {
  const cachedSessionRef = useRef<CognitoUserSession | null>(null); // Ref instead of state
  const [cachedSession, setCachedSession] = useState(cachedSessionRef.current);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData>({
    sessionLogs: [],
  });
  const isRefreshing = useRef<Promise<CognitoUserSession | null> | null>(null);

  // console.log(isRefreshing.current);

  const logout = useCallback(() => {
    setSessionData({ sessionLogs: [] });
    setCachedSession(null);
    cachedSessionRef.current = null; // Update the ref directly
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
  }, []);

  const refreshSession =
    useCallback(async (): Promise<CognitoUserSession | null> => {
      if (!cachedSessionRef.current) {
        console.error("No session found in cache");
        logout();
        return null;
      }

      // console.log(
      //   isRefreshing.current
      //     ? "Refreshing promise already exists"
      //     : "Begin refreshing promise"
      // );

      if (isRefreshing.current) {
        return isRefreshing.current; // Return the current refresh promise
      }

      const refreshToken = cachedSessionRef.current.getRefreshToken();
      // console.log("Using refresh token:", refreshToken);

      // Create the refresh promise and store it in the ref
      isRefreshing.current = new Promise<CognitoUserSession | null>(
        async (resolve, reject) => {
          try {
            const cognitoUser = userPool.getCurrentUser();
            // console.log("Current cognito user:", cognitoUser);

            if (!cognitoUser) {
              console.error("No user is currently logged in");
              return reject("No user is currently logged in");
            }

            cognitoUser.refreshSession(
              refreshToken,
              (error, refreshedSession) => {
                if (error || !refreshedSession) {
                  console.error("Error refreshing session:", error);
                  reject("Error refreshing session");
                  return;
                }

                cachedSessionRef.current = refreshedSession; // Update the ref directly
                console.log("Session refreshed and cached:", refreshedSession);
                setSessionData((prev) => ({
                  ...prev,
                  sessionLogs: [
                    ...prev.sessionLogs,
                    `Cognito session refreshed at ${new Date().toLocaleTimeString()}`,
                  ],
                }));
                resolve(refreshedSession);
              }
            );
          } catch (error) {
            console.error("Session refresh failed:", error);
            logout();
            reject(null);
          } finally {
            // Ensure the refresh state is reset
            isRefreshing.current = null;
          }
        }
      );

      return isRefreshing.current;
    }, [logout, isRefreshing]);

  const invokeBackendService = useCallback(
    async <T extends keyof ServiceResponseMap>(
      service: T,
      payload?: ServicePayloadMap[T],
      refreshed = false
    ): Promise<ServiceResponseMap[T]> => {
      setSessionData((prev) => ({
        ...prev,
        sessionLogs: [...prev.sessionLogs, `Invoking service: ${service}`],
      }));
      // console.log("Invoking service:", service);

      let token = "";

      try {
        // Check if there's a cached session in sessionCache
        if (!cachedSessionRef.current) {
          throw new Error("No session found in cache");
        }

        // Get the ID token from the cached session
        token = cachedSessionRef.current.getIdToken().getJwtToken();

        // Check if the token is expired
        if (!refreshed && isTokenExpired(token)) {
          !isRefreshing &&
            setSessionData((prev) => ({
              ...prev,
              sessionLogs: [
                ...prev.sessionLogs,
                `Token expired. Refreshing session...`,
              ],
            }));

          const newSession = await refreshSession(); // Refresh the session if token is expired
          isRefreshing.current = null;
          if (newSession) {
            token = newSession.getIdToken().getJwtToken(); // Get new ID token
            refreshed = true;
          } else {
            throw new Error("Failed to refresh session");
          }
        }
      } catch (error) {
        console.error("Error during service invocation:", error);
        logout();
        return { success: false, error: new Error("Refresh token is expired") };
      }

      try {
        const res = await axios<ServiceResponseMap[T]>(
          `${API_ENDPOINT}${serviceMap[service].path}`,
          {
            data: payload,
            method: serviceMap[service].method,
            headers: {
              Authorization: token,
            },
          }
        );
        console.log(`${service}:`, res.data);
        setSessionData((prev) => ({
          ...prev,
          sessionLogs: [
            ...prev.sessionLogs,
            `${service}: ${res.data.success ? "Success" : "Failed"}`,
          ],
        }));
        return res.data;
      } catch (error) {
        console.error("Error in service call:", error);
        setSessionData((prev) => ({
          ...prev,
          sessionLogs: [...prev.sessionLogs, `${service}: Failed`],
        }));
        if (!(error as AxiosError).response) {
          if (!refreshed) {
            console.log(
              "Retrying service invocation after refreshing session for: ",
              service
            );
            return await invokeBackendService(service, payload, true);
          }
          console.error("Error at the lambda level:", error);
        }
        return { success: false, error: error as unknown as Error };
      }
    },
    [refreshSession, logout]
  );

  const restoreSession = useCallback(async () => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      setLoadingSession(false);
      console.error("No current user found");
      return logout();
    }

    try {
      const session = await new Promise<CognitoUserSession>(
        (resolve, reject) => {
          cognitoUser.getSession((error: any, session: CognitoUserSession) => {
            if (error || !session) {
              return reject(error || new Error("No session found"));
            }
            resolve(session);
          });
        }
      );

      const refreshToken = session.getRefreshToken();
      const newSession = await new Promise<CognitoUserSession>(
        (resolve, reject) => {
          cognitoUser.refreshSession(
            refreshToken,
            (error, refreshedSession) => {
              if (error || !refreshedSession) {
                return reject(error || new Error("Failed to refresh session"));
              }
              resolve(refreshedSession);
            }
          );
        }
      );

      cachedSessionRef.current = newSession; // Update the ref directly
      setCachedSession(newSession);
      console.log("Session refreshed and cached", newSession);
      setSessionData((prev) => ({
        ...prev,
        sessionLogs: [
          ...prev.sessionLogs,
          `Cognito session refreshed at ${new Date().toLocaleTimeString()}`,
        ],
      }));
    } catch (error) {
      setLoadingSession(false);
      console.error("Error in session restoration process:", error);
      logout();
    } finally {
      setLoadingSession(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!loadingSession) {
      return;
    }
    restoreSession();
  }, [loadingSession, restoreSession]);

  useEffect(() => {
    cachedSessionRef.current = cachedSession;
  }, [cachedSession]);

  return {
    loadingSession,
    handleBackendServiceError,
    cachedSession,
    setCachedSession,
    logout,
    sessionData,
    setSessionData,
    userPool,
    invokeBackendService,
  };
};

export default UseSession;
