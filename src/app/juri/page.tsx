import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { JudgeDemo } from '@/components/juri/JudgeDemo';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Demo juri',
  description: 'Coba pemeriksaan label dan pratinjau cetak dengan data kemasan rekaan yang sudah siap.',
};

export default function JudgePage() {
  return (
    <div className="cetak-root flex min-h-dvh flex-col">
      <Navbar />
      <main id="main-content" className="page-shell flex-1 py-6 sm:py-10">
        <JudgeDemo />
      </main>
      <Footer />
    </div>
  );
}
