import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riff",
  description: "Let others finish your thoughts!",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body>{children}</body>
    </html>
  );
}
