import type { Metadata } from "next";
import "./globals.css";
import { AuthWrapper } from "@/components/AuthWrapper";
import { ConditionalHeader } from "@/components/ConditionalHeader";

export const metadata: Metadata = {
  title: "SuperClaw Dashboard",
  description: "Monitor and manage your OpenClaw installation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthWrapper>
          <ConditionalHeader />
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
