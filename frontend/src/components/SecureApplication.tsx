import { ReactNode, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

// context
import SessionContext from "../context/SessionContext";

// hooks
import useSession from "../hooks/useSession";

// types
import { PaymentTableItem } from "../../../types/tableItems";

interface CredentialsLayoutProps {
  children: ReactNode;
}

const SecureApplication = ({ children }: CredentialsLayoutProps) => {
  const emailRef = useRef<string>();

  const location = useLocation();
  const {
    loadingSession,
    logout,
    handleBackendServiceError,
    cachedSession,
    setCachedSession,
    invokeBackendService,
    sessionData,
    setSessionData,
    userPool,
  } = useSession();

  const [allPayments, setAllPayments] = useState<
    PaymentTableItem[] | undefined
  >([]);

  if (loadingSession) {
    return <></>;
  }

  // Redirect to login if no session is cached and not on login/register routes
  if (!cachedSession && !["/login", "/register"].includes(location.pathname)) {
    return <Navigate to="/login" replace={true} />;
  }

  // Redirect to home if session exists and user is on login/register routes
  if (cachedSession && ["/login", "/register"].includes(location.pathname)) {
    return <Navigate to="/" replace={true} />;
  }

  return (
    <SessionContext.Provider
      value={{
        logout,
        handleBackendServiceError,
        cachedSession,
        setCachedSession,
        invokeBackendService,
        sessionData,
        setSessionData,
        userPool,
        loadingSession,
        emailRef,
        allPayments,
        setAllPayments,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export default SecureApplication;
