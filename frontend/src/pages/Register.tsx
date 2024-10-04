import { useState, useCallback, useRef, useContext } from "react";
import { Link } from "react-router-dom";
import { CognitoUserAttribute } from "amazon-cognito-identity-js";
import { z } from "zod";

// context
import SessionContext from "../context/SessionContext";
import ModalContext from "../context/ModalContext";

interface CognitoSignUpError {
  message: string;
  code:
    | "UsernameExistsException"
    | "InvalidPasswordException"
    | "InvalidParameterException"
    | "CodeDeliveryFailureException"
    | "UserLambdaValidationException"
    | "NotAuthorizedException"
    | "TooManyRequestsException"
    | "InternalErrorException";
  name: string;
  stack?: string; // Optional stack trace
}

const valididateEmail = z.string().email();

// const APP_ENVIRONMENT = (import.meta.env.VITE_Environment as string) || "dev";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const linkRef = useRef<HTMLAnchorElement>(null);

  const { userPool, emailRef } = useContext(SessionContext);
  const { setModal } = useContext(ModalContext);

  const registerUser = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        valididateEmail.parse(email);
      } catch (error: unknown) {
        alert("Please enter a valid email address");
        return;
      }

      if (password !== passwordConfirm) {
        alert("Passwords do not match");
        return;
      }

      setLoading(true);

      try {
        const attributeList: CognitoUserAttribute[] = [
          new CognitoUserAttribute({
            Name: "email",
            Value: email,
          }),
        ];

        await new Promise((resolve, reject) => {
          userPool.signUp(
            email,
            password,
            attributeList,
            [],
            (error, result) => {
              if (error || !result) {
                reject(error);
                setLoading(false);
                return;
              }
              if (result && "user" in result) {
                resolve(result.user);
              }
              reject(new Error("Unknown error"));
            }
          );
        });

        alert(
          // APP_ENVIRONMENT === "prod"
          // ? "User registered successfully, You must verify your email before you can login"
          // : "User registered successfully"
          "User registered successfully, You must verify your email before you can login"
        );
        // if (APP_ENVIRONMENT === "prod") {
        emailRef.current = email;
        setModal("verifyEmail");
        setLoading(false);
        setEmail("");
        setPassword("");
        setPasswordConfirm("");
        // }
        linkRef.current?.click();
      } catch (error: unknown) {
        if (error instanceof Error) {
          alert((error as CognitoSignUpError).message);
        } else {
          alert("Unknown error");
        }
      }

      setLoading(false);
    },
    [email, password, passwordConfirm]
  );

  // -------------------------------------------------------------------------------------

  return (
    <>
      <div className="w-full h-screen min-h-[33rem] flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold font-mono mb-4">Register</h1>
        <form
          onSubmit={registerUser}
          className="bg-gray-800/60 rounded-md backdrop-blur flex flex-col items-center p-5 text-black"
        >
          <input
            type="email"
            className="bg-white/80 w-52 px-2.5 py-2 rounded !outline-none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required={true}
          />
          <input
            type="password"
            className="mt-3 bg-white/80 w-52 px-2.5 py-2 rounded !outline-none"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            minLength={8}
            required={true}
          />
          <input
            type="password"
            className="mt-3 bg-white/80 w-52 px-2.5 py-2 rounded !outline-none"
            placeholder="Confirm Password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            disabled={loading}
            minLength={8}
            required={true}
          />
          <input
            type="submit"
            className={`${
              loading || !email || !password || !passwordConfirm
                ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                : "bg-emerald-500 sepia-[0.4] hover:brightness-110 text-white"
            }  w-52 mt-3 px-2.5 py-2 rounded transition-colors ease-out`}
            disabled={loading}
            value="Register"
          />
        </form>
        <div className="mt-2">
          already a user?{" "}
          <Link
            ref={linkRef}
            className={`${
              loading && "pointer-events-none"
            } underline text-blue-400 hover:text-sky-300 visited:text-purple-400 visited:hover:text-purple-300`}
            to="/login"
          >
            login now
          </Link>
        </div>
      </div>
    </>
  );
};

export default Register;
