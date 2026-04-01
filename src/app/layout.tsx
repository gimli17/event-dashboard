import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/components/user-provider";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ChatSidebar } from "@/components/chat-sidebar";

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "BRMF 2026 — Boulder Roots Music Fest",
  description: "The Founders Experience — August 26\u201330, 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <UserProvider>
          <SidebarProvider>
            {children}
            <ChatSidebar />
          </SidebarProvider>
        </UserProvider>
      </body>
    </html>
  );
}
