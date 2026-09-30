import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineIndicator } from "@/components/OfflineIndicator";

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Ner Gateway AI – Advanced Payment Gateway & Analytics",
  description: "Automate your checkout, manage affiliate commissions, and track real-time sales with Ner Gateway AI.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NerGateway",
  },
  icons: {
    apple: "https://picsum.photos/seed/nerapple/180/180",
  },
  openGraph: {
    type: "website",
    title: "Ner Gateway AI – Advanced Payment Gateway & Analytics",
    description: "Automate your checkout, manage affiliate commissions, and track real-time sales with Ner Gateway AI.",
    siteName: "Ner Gateway AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ner Gateway AI – Advanced Payment Gateway & Analytics",
    description: "Automate your checkout, manage affiliate commissions, and track real-time sales with Ner Gateway AI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (!theme && supportDarkMode) theme = 'dark';
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Ner Gateway AI",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "All",
              "description": "An AI-powered payment gateway and checkout system with advanced analytics and affiliate management.",
            }),
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <OfflineIndicator />
      </body>
    </html>
  );
}
