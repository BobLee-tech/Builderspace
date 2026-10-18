import { Doto } from "next/font/google";

// Dot-matrix digits for the live numbers (countdown, seats) only.
export const doto = Doto({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-doto",
});
