import type { Metadata, Viewport } from "next";
import { Baloo_2, Mukta } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "devanagari"],
  weight: ["500", "600", "700", "800"],
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
  themeColor: "#fbf6ee",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${baloo.variable} ${mukta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col print:max-w-none">{children}</div>
        <ServiceWorker />
      </body>
    </html>
  );
}
