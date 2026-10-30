import './globals.css';
import Dock from '@/components/layout/Dock';
import HeaderTitle from '@/components/layout/HeaderTitle';
import CommandPalette from '@/components/shared/CommandPalette';
import { ActiveTimeProvider } from '@/components/layout/ActiveTimeContext';
import { NotificationCenter } from '@/components/layout/NotificationCenter';

export const metadata = {
  title: 'HELM — Personal Work OS',
  description: 'Local-first personal work operating system for managing daily focus, projects, and calendar.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-helm-bg text-zinc-100 min-h-screen antialiased">
        <ActiveTimeProvider>
          {/* Top Control Bar */}
          <header className="h-12 border-b border-helm-border bg-helm-bg/80 backdrop-blur sticky top-0 z-40 px-4 flex items-center justify-between text-xs text-zinc-400">
            <HeaderTitle />
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <CommandPalette />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="p-6 pb-28">
            {children}
          </main>

          {/* Floating dock nav */}
          <Dock />
        </ActiveTimeProvider>
      </body>
    </html>
  );
}
