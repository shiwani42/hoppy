import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter, Mukta } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "devanagari"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hoppy",
  description:
    "Your meals, workouts, water and sleep power an avatar of you. A supportive calorie tracker for Indian food and yoga.",
  applicationName: "Hoppy",
  appleWebApp: { capable: true, title: "Hoppy", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#fbf5e9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${baloo.variable} ${inter.variable} ${mukta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cream sm:shadow-[0_0_60px_rgb(60_40_10/0.12)] print:max-w-none print:shadow-none">{children}</div>
        <ServiceWorker />
      </body>
    </html>
  );
}
