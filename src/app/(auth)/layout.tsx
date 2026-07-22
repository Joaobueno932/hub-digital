import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-primary-dark">
      <header className="mx-auto w-full max-w-md px-4 pt-10">
        <Link href="/" aria-label="Voltar para a página inicial">
          <Image
            src="/brand/logo-horizontal-white.png"
            alt="Hub Digital"
            width={180}
            height={48}
            priority
          />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <div className="rounded-xl bg-surface p-6 shadow-lg sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
