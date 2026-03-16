import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import type { Metadata } from "next";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "YouTube Comment Automation",
    description: "AI-Assisted YouTube Comment Reply System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${inter.variable} font-sans`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
