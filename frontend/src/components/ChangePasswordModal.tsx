import { FormEvent, useCallback, useState, useContext } from "react";
import { CognitoUserSession } from "amazon-cognito-identity-js";
import SessionContext from "../context/SessionContext";
import ModalContext from "../context/ModalContext";

const ChangePasswordModal = () => {
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const { userPool, setSessionData } = useContext(SessionContext);
  const { setModal } = useContext(ModalContext);

  const changePassword = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // if old and new password are the same
      if (
        currentPassword === newPassword &&
        currentPassword === confirmNewPassword
      ) {
        alert("New password cannot be the same as the current password.");
        return;
      }

      // Check if new password and confirm password match
      if (newPassword !== confirmNewPassword) {
        alert("New passwords do not match.");
        return;
      }

      // Get the current user from the user pool
      const user = userPool.getCurrentUser();

      if (!user) {
        alert("User session not found.");
        return;
      }

      setLoading(true);

      try {
        // Retrieve the user's session to ensure they are authenticated
        user.getSession((error: any, session: CognitoUserSession) => {
          if (error || !session) {
            console.error("Failed to get user session:", error);
            alert("Failed to get user session.");
            setLoading(false);
            return;
          }

          // Change password using the current password and new password
          user.changePassword(currentPassword, newPassword, (error) => {
            if (error) {
              alert("Failed to change password.");
            } else {
              alert("Password changed successfully.");
              setCurrentPassword("");
              setNewPassword("");
              setConfirmNewPassword("");
              setModal("");
              setSessionData((prev) => ({
                ...prev,
                sessionLogs: [
                  ...prev.sessionLogs,
                  "Account password updated successfully",
                ],
              }));
            }
            setLoading(false);
          });
        });
      } catch (error) {
        console.error("Error changing password:", error);
        alert("Failed to change password.");
        setLoading(false);
      }
    },
    [currentPassword, newPassword, confirmNewPassword, userPool]
  );

  return (
    <>
      <div className="w-full flex flex-col items-center bg-gradient-to-br from-yellow-900/50 to-yellow-500/50 backdrop-blur-3xl">
        <div className="h-12 /text-white/50"></div>
        <div>
          <form onSubmit={changePassword}>
            <div className="flex flex-col items-center">
              <input
                type="password"
                className="mb-3 text-black px-2.5 py-2 rounded !outline-none w-52 bg-white/95"
                placeholder="Current Password"
                onChange={(e) => setCurrentPassword(e.target.value)}
                value={currentPassword}
              />
              <input
                type="password"
                className="mb-3 text-black px-2.5 py-2 rounded !outline-none w-52 bg-white/95"
                placeholder="New Password"
                onChange={(e) => setNewPassword(e.target.value)}
                value={newPassword}
                minLength={8}
              />
              <input
                type="password"
                className="mb-3 text-black px-2.5 py-2 rounded !outline-none w-52 bg-white/95"
                placeholder="Confirm New Password"
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                value={confirmNewPassword}
                minLength={8}
              />
              <input
                type="submit"
                disabled={
                  loading ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmNewPassword
                }
                className={`${
                  loading ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmNewPassword
                    ? "brightness-[120%] bg-gray-500 cursor-not-allowed border-black/20 text-gray-100/50"
                    : "bg-yellow-500/[85%] hover:bg-yellow-500 border-yellow-600/20 cursor-pointer"
                } border mb-8 w-52 py-2 rounded transition-colors ease-out`}
                value={loading ? "Changing..." : "Change Password"}
              />
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ChangePasswordModal;
