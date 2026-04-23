import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — YesBundles',
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-4xl font-bold tracking-tight text-navy-900">
        Terms of Service
      </h1>
      <p className="mb-8 text-sm text-navy-500">Last updated: [DATE]</p>

      <div className="space-y-6 text-navy-700 leading-relaxed">
        <p className="rounded-lg bg-electric-50 p-4 text-sm text-electric-900">
          <strong>Draft placeholder.</strong> Replace with final legal copy before launch.
          Review with counsel if applicable in your jurisdiction.
        </p>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">1. Acceptance of Terms</h2>
          <p>
            By accessing and using YesBundles (&quot;the Service&quot;), operated by Maestro Media Group,
            you accept and agree to be bound by these Terms of Service. If you do not agree,
            please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">2. Digital Products</h2>
          <p>
            YesBundles sells digital products including PDFs, spreadsheets, templates, and guides.
            All products are delivered electronically via a secure download link after purchase.
            Licenses are for personal or single-business use only unless otherwise stated.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">3. No Refunds on Digital Downloads</h2>
          <p>
            Due to the instantly-delivered nature of digital goods, <strong>all sales are final</strong>.
            Once a download link has been accessed or the file has been received, the purchase
            cannot be refunded. See our Refund Policy for narrow exceptions.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">4. License and Use</h2>
          <p>
            You may use purchased products for personal or single-business purposes. You may not
            resell, redistribute, sublicense, or share the downloaded files with third parties.
            All intellectual property rights remain with YesBundles and Maestro Media Group.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">5. Account and Access</h2>
          <p>
            You are responsible for keeping your account credentials secure. You are responsible
            for all activity that occurs under your account.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">6. Limitation of Liability</h2>
          <p>
            YesBundles is provided &quot;as is&quot; without warranties of any kind. Maestro Media Group
            is not liable for any indirect, incidental, or consequential damages arising from
            your use of the products.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">7. Changes to Terms</h2>
          <p>
            We reserve the right to update these terms at any time. Continued use of the Service
            after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">8. Contact</h2>
          <p>
            Questions about these terms? Email <a href="mailto:hello@yesbundles.com" className="text-electric-600 hover:underline">hello@yesbundles.com</a>.
          </p>
        </section>
      </div>
    </article>
  );
}
