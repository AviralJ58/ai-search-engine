import "../styles/globals.css";
import Providers from "../components/Providers";

export const metadata = {
  title: "AI Search",
  description: "Chat-first streaming RAG frontend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-500 overflow-hidden">
        <Providers>
          {/* App root */}
          <div className="h-full flex flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

