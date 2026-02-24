import type { AppProps } from "next/app";
import "../styles/globals.css";
import "../styles/print.css";
import { BoardFilterProvider } from "../lib/boardFilterContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <BoardFilterProvider>
      <Component {...pageProps} />
    </BoardFilterProvider>
  );
}
