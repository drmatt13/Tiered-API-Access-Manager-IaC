import { useContext } from "react";
import { Link } from "react-router-dom";

// context
import SessionContext from "../context/SessionContext";

function Home() {
  const { logout } = useContext(SessionContext);

  return (
    <>
      <div className="w-full h-screen min-h-[33rem] flex flex-col items-center justify-center">
        <div className="absolute bottom-4 right-4">
          <Link
            className="text-blue-400 hover:text-sky-300 visited:text-purple-500 visited:hover:text-purple-400"
            to="/development"
            replace={true}
          >
            /development-test-page
          </Link>
        </div>
        <div className="w-52 flex flex-col items-center">
          <h1 className="text-3xl font-bold font-mono">Home</h1>
          <div className="flex flex-col items-center w-full py-4 mt-3 mb-3 bg-slate-800/60 rounded">
            <div className="flex flex-col">
              <Link
                className="text-blue-400 hover:text-sky-300 visited:text-purple-500 visited:hover:text-purple-400"
                to="/account"
                replace={true}
              >
                /account
              </Link>
              <Link
                to="/billing"
                replace={true}
                className="text-blue-400 hover:text-sky-300 visited:text-purple-500 visited:hover:text-purple-400"
              >
                /billing
              </Link>
              <Link
                to="/api-key"
                replace={true}
                className="text-blue-400 hover:text-sky-300 visited:text-purple-500 visited:hover:text-purple-400"
              >
                /api-key
              </Link>
            </div>
          </div>
          <button
            className="w-full py-2 bg-red-500/80 hover:bg-red-500 cursor-pointer rounded transition-colors ease-out duration-75"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

export default Home;
