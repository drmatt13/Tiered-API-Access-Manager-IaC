import { FormEvent, useCallback, useState, useEffect, useContext } from "react";
import { CognitoUser } from "amazon-cognito-identity-js";
import { z } from "zod";

// context
import ModalContext from "../context/ModalContext";
import SessionContext from "../context/SessionContext";

const validateEmail = z.string().email();

const ForgotPasswordModal = () => {
  const { setModal } = useContext(ModalContext);
  const { userPool, emailRef } = useContext(SessionContext); // Assuming userPool and setModal are in the SessionContext
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [validEmail, setValidEmail] = useState(false);

  const resetEmail = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      try {
        validateEmail.parse(email);
      } catch (error) {
        alert("Please enter a valid email address");
        return;
      }

      setLoading(true);

      try {
        const userData = {
          Username: email,
          Pool: userPool,
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.forgotPassword({
          onSuccess: () => {
            alert("A verification code has been sent to your email.");
            emailRef.current = email;
            setModal("newPassword");
            setLoading(false);
          },
          onFailure: (error) => {
            if (
              error.message ===
              "Attempt limit exceeded, please try after some time."
            ) {
              setModal("newPassword");
              return;
            } else {
              alert("Failed to reset password. error: " + error.message);
            }
            setLoading(false);
          },
        });
      } catch (error) {
        alert("An unexpected error occurred. Please try again.");
        setLoading(false);
      }
    },
    [email, userPool, setModal]
  );

  useEffect(() => {
    if (email) {
      try {
        validateEmail.parse(email);
        setValidEmail(true);
      } catch (error) {
        setValidEmail(false);
      }
    } else {
      setValidEmail(false);
    }
  }, [email]);

  return (
    <>
      <div className="w-full flex flex-col items-center bg-gradient-to-br from-gray-900 to-blue-900/75 backdrop-blur-3xl">
        <div className="h-12"></div>
        <div>
          <form onSubmit={resetEmail}>
            <div className="flex flex-col items-center">
              <input
                type="email"
                className="mb-3 px-2.5 py-2 rounded !outline-none w-52 bg-white/95 text-black"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="submit"
                disabled={loading || !validEmail}
                className={`${
                  loading || !validEmail
                    ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                    : "bg-blue-500/80 hover:bg-blue-500 border-blue-600/20 cursor-pointer"
                } border mb-8 w-52 py-2 rounded transition-colors ease-out`}
                value={"Reset Password"}
              />
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordModal;
