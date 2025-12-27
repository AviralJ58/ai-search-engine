import "../styles/globals.css";
import Providers from "../components/Providers";

export const metadata = {
  title: "AI Search",
  description: "Chat-first streaming RAG frontend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
  <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-500">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
