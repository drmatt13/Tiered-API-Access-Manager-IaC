import { createContext } from "react";

interface ContextInterface {
  setModal: (temp: string) => void;
}

const Context = createContext<ContextInterface>({
  setModal: () => {},
});

export default Context;
