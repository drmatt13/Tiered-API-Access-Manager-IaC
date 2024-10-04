import { useEffect, useState, useRef, useContext, useCallback } from "react";
import { CognitoUser } from "amazon-cognito-identity-js";

// context
import ModalContext from "../context/ModalContext";
import SessionContext from "../context/SessionContext";

const VerifyEmailModal = () => {
  const { setModal } = useContext(ModalContext);
  const { userPool, emailRef } = useContext(SessionContext);

  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);

  // State for each digit input
  const [digitOne, setDigitOne] = useState("");
  const [digitTwo, setDigitTwo] = useState("");
  const [digitThree, setDigitThree] = useState("");
  const [digitFour, setDigitFour] = useState("");
  const [digitFive, setDigitFive] = useState("");
  const [digitSix, setDigitSix] = useState("");

  // Refs for each input field
  const digitOneRef = useRef<HTMLInputElement>(null);
  const digitTwoRef = useRef<HTMLInputElement>(null);
  const digitThreeRef = useRef<HTMLInputElement>(null);
  const digitFourRef = useRef<HTMLInputElement>(null);
  const digitFiveRef = useRef<HTMLInputElement>(null);
  const digitSixRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.FormEvent<HTMLInputElement>,
    setDigit: React.Dispatch<React.SetStateAction<string>>,
    nextRef?: React.RefObject<HTMLInputElement>
  ) => {
    const input = e.currentTarget;

    // Allow only digits
    if (!/^[0-9]$/.test(input.value)) {
      input.value = ""; // Clear invalid input
      return;
    }

    setDigit(input.value); // Update the state for the current digit

    // Move to the next input if present and select its content
    if (nextRef && input.value !== "") {
      nextRef.current?.focus();
      nextRef.current?.select(); // Highlight the text in the next input
    }

    // If this is the last input, blur the focus
    if (!nextRef) {
      input.blur();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    setDigit: React.Dispatch<React.SetStateAction<string>>,
    prevRef?: React.RefObject<HTMLInputElement>
  ) => {
    // If backspace is pressed and the current input is empty, focus on the previous input
    if (e.key === "Backspace" && !e.currentTarget.value) {
      if (prevRef) {
        prevRef.current?.focus();
        prevRef.current?.select(); // Highlight the text in the previous input
      }
    }

    // Clear the current input value when backspace is pressed
    if (e.key === "Backspace") {
      setDigit(""); // Clear the state for the current digit
    }
  };

  // Handle paste event
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData("Text");

    // Check if the pasted content is 6 digits long
    if (/^\d{6}$/.test(pasteData)) {
      setDigitOne(pasteData[0]);
      setDigitTwo(pasteData[1]);
      setDigitThree(pasteData[2]);
      setDigitFour(pasteData[3]);
      setDigitFive(pasteData[4]);
      setDigitSix(pasteData[5]);

      // Move focus to the last input to signal completion
      digitSixRef.current?.focus();
      digitSixRef.current?.select();

      // Prevent the default paste behavior
      e.preventDefault();
    }
  };

  // useEffect to check if any input fields are empty
  useEffect(() => {
    // Set invalidCode to true if any of the inputs are empty
    if (
      !digitOne ||
      !digitTwo ||
      !digitThree ||
      !digitFour ||
      !digitFive ||
      !digitSix
    ) {
      setInvalidCode(true);
    } else {
      setInvalidCode(false);
    }
  }, [digitOne, digitTwo, digitThree, digitFour, digitFive, digitSix]);

  // Callback function to send a new verification code
  const sendNewCode = useCallback(() => {
    setLoading1(true);
    try {
      const userData = {
        Username: emailRef.current as string,
        Pool: userPool,
      };
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.resendConfirmationCode((error) => {
        if (error) {
          alert(
            "Failed to send a new code. Please try again. Error: " +
              error.message
          );
          setLoading1(false);
          return;
        }
        alert("A new verification code has been sent to your email.");
        setLoading1(false);
      });
    } catch (error) {
      alert("An unexpected error occurred. Please try again.");
      setLoading1(false);
    }
  }, [emailRef, userPool]);

  // Callback function to verify the entered code
  const verifyAccount = useCallback(async () => {
    setLoading2(true);
    try {
      // Check if all digits are filled
      if (invalidCode) {
        alert("Please complete the verification code.");
        setLoading2(false);
        return;
      }

      const verificationCode = `${digitOne}${digitTwo}${digitThree}${digitFour}${digitFive}${digitSix}`;
      const userData = {
        Username: emailRef.current as string,
        Pool: userPool,
      };
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmRegistration(verificationCode, true, (error) => {
        if (error) {
          alert(
            "Verification failed. Please check the code and try again. Error: " +
              error.message
          );
          setLoading2(false);
          return;
        }
        alert("Your account has been successfully verified.");
        setLoading2(false);
        setModal("");
      });
    } catch (error) {
      alert("An unexpected error occurred. Please try again.");
      setLoading2(false);
    }
  }, [
    digitOne,
    digitTwo,
    digitThree,
    digitFour,
    digitFive,
    digitSix,
    emailRef,
    userPool,
    invalidCode,
  ]);

  useEffect(() => {
    // on component mount, focus on the first input field
    digitOneRef.current?.focus();
  }, []);
  return (
    <>
      <div className="w-full flex flex-col items-center bg-gradient-to-br from-gray-900 to-blue-900/75 backdrop-blur-3xl">
        <div className="h-12"></div>
        <div className="mb-4 px-6">
          Enter the verification code sent to your email
        </div>
        <div className="flex items-center justify-center space-x-2">
          <input
            ref={digitOneRef}
            type="text"
            className="w-10 h-10 text-center bg-white/80 rounded-md text-black font-bold"
            maxLength={1}
            autoComplete="off"
            name="disable-autofill"
            value={digitOne}
            onInput={(e) => handleInputChange(e, setDigitOne, digitTwoRef)}
            onKeyDown={(e) => handleKeyDown(e, setDigitOne)}
            onPaste={handlePaste} // Handle paste event
          />
          <input
            ref={digitTwoRef}
            type="text"
            className="w-10 h-10 text-center bg-white/80 rounded-md text-black font-bold"
            maxLength={1}
            autoComplete="off"
            name="disable-autofill"
            value={digitTwo}
            onInput={(e) => handleInputChange(e, setDigitTwo, digitThreeRef)}
            onKeyDown={(e) => handleKeyDown(e, setDigitTwo, digitOneRef)}
          />
          <input
            ref={digitThreeRef}
            type="text"
            className="w-10 h-10 text-center bg-white/80 rounded-md text-black font-bold"
            maxLength={1}
            autoComplete="off"
            name="disable-autofill"
            value={digitThree}
            onInput={(e) => handleInputChange(e, setDigitThree, digitFourRef)}
            onKeyDown={(e) => handleKeyDown(e, setDigitThree, digitTwoRef)}
          />
          <input
            ref={digitFourRef}
            type="text"
            className="w-10 h-10 text-center bg-white/80 rounded-md text-black font-bold"
            maxLength={1}
            autoComplete="off"
            name="disable-autofill"
            value={digitFour}
            onInput={(e) => handleInputChange(e, setDigitFour, digitFiveRef)}
            onKeyDown={(e) => handleKeyDown(e, setDigitFour, digitThreeRef)}
          />
          <input
            ref={digitFiveRef}
            type="text"
            className="w-10 h-10 text-center bg-white/80 rounded-md text-black font-bold"
            maxLength={1}
            autoComplete="off"
            name="disable-autofill"
            value={digitFive}
            onInput={(e) => handleInputChange(e, setDigitFive, digitSixRef)}
            onKeyDown={(e) => handleKeyDown(e, setDigitFive, digitFourRef)}
          />
          <input
            ref={digitSixRef}
            type="text"
            className="w-10 h-10 text-center bg-white/80 rounded-md text-black font-bold"
            maxLength={1}
            autoComplete="off"
            name="disable-autofill"
            value={digitSix}
            onInput={(e) => handleInputChange(e, setDigitSix)}
            onKeyDown={(e) => handleKeyDown(e, setDigitSix, digitFiveRef)}
          />
        </div>
        <div>
          <div className="mt-6 flex gap-2.5 w-64">
            <button
              onClick={sendNewCode}
              disabled={loading1}
              className={`${
                loading1
                  ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                  : "bg-yellow-500/80 hover:bg-yellow-500 border-yellow-600/20 cursor-pointer"
              } border mb-8 flex-1 py-2 rounded transition-colors ease-out text-sm`}
            >
              Send New Code
            </button>
            <button
              onClick={verifyAccount}
              disabled={loading2 || invalidCode}
              className={`${
                loading2 || invalidCode
                  ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                  : "bg-blue-500/80 hover:bg-blue-500 border-blue-600/20 cursor-pointer"
              } border mb-8 flex-1 py-2 rounded transition-colors ease-out text-sm`}
            >
              {loading2 ? "Verifying..." : "Verify Account"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyEmailModal;
