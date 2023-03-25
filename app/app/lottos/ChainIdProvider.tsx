import { createContext, useContext } from "react";

export const ChainIdContext = createContext<string>("0xaa36a7");

export const useChainId = () => {
	return useContext(ChainIdContext);
}