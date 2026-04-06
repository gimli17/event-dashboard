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
  title: "Caruso Ventures — Operations Hub",
  description: "Central hub for BRMF, Bold Summit, and Ensuring Colorado initiatives",
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
