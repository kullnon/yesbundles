import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — YesBundles',
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-4xl font-bold tracking-tight text-navy-900">
        Privacy Policy
      </h1>
      <p className="mb-8 text-sm text-navy-500">Last updated: [DATE]</p>

      <div className="space-y-6 text-navy-700 leading-relaxed">
        <p className="rounded-lg bg-electric-50 p-4 text-sm text-electric-900">
          <strong>Draft placeholder.</strong> Replace with final privacy language before launch.
          If you expect EU traffic, add GDPR-specific language.
        </p>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">1. Information We Collect</h2>
          <p>
            When you use YesBundles, we collect:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Your name and email address when you create an account or make a purchase</li>
            <li>Billing information handled securely by our payment processor (Stripe)</li>
            <li>Order history and download activity</li>
            <li>Anonymous usage data (pages visited, device type) for site improvement</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">2. How We Use Your Information</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>To process purchases and deliver digital products</li>
            <li>To send order confirmations and customer support messages</li>
            <li>To send marketing emails (only if you opt in)</li>
            <li>To improve the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">3. Payment Information</h2>
          <p>
            We <strong>do not</strong> store credit card numbers. Payments are processed by Stripe,
            a PCI-compliant payment processor. Review Stripe&apos;s privacy policy at stripe.com/privacy.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">4. Data Sharing</h2>
          <p>
            We do not sell your personal information. We share data only with:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Stripe (payment processing)</li>
            <li>Supabase (authentication, database, file storage)</li>
            <li>Email service providers (transactional + marketing email)</li>
            <li>Legal authorities, if required by law</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">5. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. Analytics cookies
            are minimal and anonymized. You may disable cookies in your browser, though some
            features may not function.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">6. Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data by emailing
            <a href="mailto:hello@yesbundles.com" className="text-electric-600 hover:underline"> hello@yesbundles.com</a>.
            We will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">7. Data Retention</h2>
          <p>
            We retain order records for as long as required for tax and accounting purposes
            (typically 7 years). You may request earlier deletion of non-essential data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">8. Children</h2>
          <p>
            YesBundles is not directed at children under 13. We do not knowingly collect
            information from children.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">9. Contact</h2>
          <p>
            Privacy questions? Email <a href="mailto:hello@yesbundles.com" className="text-electric-600 hover:underline">hello@yesbundles.com</a>.
          </p>
        </section>
      </div>
    </article>
  );
}
