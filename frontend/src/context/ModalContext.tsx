import { createContext } from "react";

interface ContextInterface {
  modal: string;
  setModal: (temp: string) => void;
}

const Context = createContext<ContextInterface>({
  modal: "",
  setModal: () => {},
});

export default Context;
