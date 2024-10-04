import { useCallback, useState, useContext } from "react";
import { CognitoUser, AuthenticationDetails } from "amazon-cognito-identity-js";

// context
import SessionContext from "../context/SessionContext";

const DeleteAccountModal = () => {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");

  const { invokeBackendService, logout, cachedSession, userPool } =
    useContext(SessionContext);

  const loginUser = useCallback(async (): Promise<boolean> => {
    try {
      // Ensure cachedSession is available and contains the user's email
      if (!cachedSession) {
        console.error("No user session found.");
        return false;
      }

      const email = cachedSession.getIdToken().payload.email;

      // Perform authentication using the user's email and password
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      await new Promise((resolve, reject) => {
        user.authenticateUser(authenticationDetails, {
          onSuccess: () => resolve(true),
          onFailure: (err) => {
            console.error("Authentication failed:", err);
            reject(false);
          },
        });
      });

      return true; // Authentication successful
    } catch (error) {
      alert("Incorrect password.");
      console.error("Login error:", error);
      return false;
    }
  }, [cachedSession, password]);

  const deleteAccount = useCallback(async () => {
    if (loading || text !== "delete my account" || password.length < 1) return;
    setLoading(true);

    try {
      // Check the password first
      const isAuthenticated = await loginUser();
      if (!isAuthenticated) {
        console.error("Password check failed. Cannot delete account.");
        setLoading(false);
        return;
      }

      // If password check is successful, proceed to delete the account
      const response = await invokeBackendService("DeleteAcount");

      if (response.success) {
        logout();
      } else {
        console.log(response.error);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    }

    setLoading(false);
  }, [text, password, loading, loginUser]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    deleteAccount();
  };

  return (
    <div className="w-full flex flex-col items-center bg-gradient-to-br from-gray-900 to-rose-900/75 backdrop-blur-3xl">
      <div className="h-12 /text-white/50"></div>
      <form onSubmit={handleSubmit} className="flex flex-col items-center">
        <div className="mb-4">
          type:{" "}
          <span className="underline underline-offset-4">
            delete my account
          </span>
        </div>
        <input
          type="text"
          className="mb-3 text-red-500 px-2.5 py-2 rounded !outline-none w-52 bg-white/95"
          placeholder="delete my account"
          onChange={(e) => setText(e.target.value)}
          value={text}
        />
        <input
          type="password"
          className="mb-3 text-black px-2.5 py-2 rounded !outline-none w-52 bg-white/95"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
        />
        <button
          type="submit"
          disabled={
            loading || text !== "delete my account" || password.length < 1
          }
          className={`${
            loading || text !== "delete my account" || password.length < 1
              ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
              : "bg-red-500/80 hover:bg-red-500 border-red-600/20 cursor-pointer"
          } border mb-8 w-52 py-2 rounded transition-colors ease-out`}
        >
          {loading ? "Deleting..." : "Delete Account"}
        </button>
      </form>
    </div>
  );
};

export default DeleteAccountModal;
