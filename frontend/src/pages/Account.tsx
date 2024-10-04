import { useCallback, useState, useContext } from "react";
import { Link } from "react-router-dom";

// context
import ModalContext from "../context/ModalContext";

function Home() {
  const { setModal } = useContext(ModalContext);

  const [loading] = useState(false);

  const changePassword = useCallback(async () => {
    setModal("changePassword");
  }, [setModal]);
  const deleteAccount = useCallback(async () => {
    setModal("deleteAccount");
  }, [setModal]);

  return (
    <>
      <div className="w-full h-screen min-h-[33rem] flex flex-col items-center justify-center">
        <div className="absolute bottom-4 right-4">
          <Link
            className={`${
              loading
                ? "pointer-events-none text-gray-400"
                : "text-blue-400 hover:text-sky-300 visited:text-purple-500 visited:hover:text-purple-400"
            } `}
            to="/development"
            replace={true}
          >
            /development-test-page
          </Link>
        </div>
        <div className="w-52 flex flex-col items-center">
          <h1 className="text-3xl font-bold font-mono mb-4">Account</h1>
          <button
            className="w-full py-2 mb-2.5 bg-yellow-500/[85%] hover:bg-yellow-500 border border-yellow-600/20 cursor-pointer rounded transition-colors ease-out duration-75"
            onClick={changePassword}
          >
            Change Password
          </button>
          <button
            className="w-full py-2 bg-red-500/80 hover:bg-red-500 border border-red-600/20 cursor-pointer rounded transition-colors ease-out duration-75"
            onClick={deleteAccount}
          >
            Delete Account
          </button>
          <Link
            className={`${
              loading
                ? "pointer-events-none text-gray-400"
                : "text-blue-400 hover:text-sky-300 visited:text-purple-500 visited:hover:text-purple-400"
            } mt-2`}
            to="/"
            replace={true}
          >
            return /home
          </Link>
        </div>
      </div>
    </>
  );
}

export default Home;
