import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy — YesBundles',
};

export default function RefundPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-4xl font-bold tracking-tight text-navy-900">
        Refund Policy
      </h1>
      <p className="mb-8 text-sm text-navy-500">Last updated: [DATE]</p>

      <div className="space-y-6 text-navy-700 leading-relaxed">
        <p className="rounded-lg bg-electric-50 p-4 text-sm text-electric-900">
          <strong>Draft placeholder.</strong> Replace with final policy before launch.
          Stripe and most card networks require a visible refund policy at checkout.
        </p>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">All Sales Final</h2>
          <p>
            YesBundles sells digital products delivered electronically. Because products are
            downloaded immediately and cannot be returned, <strong>all sales are final</strong>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">Narrow Exceptions</h2>
          <p>
            We may issue refunds at our discretion in these specific cases:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>You were charged twice for the same order (duplicate transaction)</li>
            <li>The download link never delivered a working file, and support cannot resolve</li>
            <li>The product was misrepresented in a material way on the product page</li>
          </ul>
          <p className="mt-3">
            Requests must be made within <strong>14 days of purchase</strong>, in writing, to
            <a href="mailto:hello@yesbundles.com" className="text-electric-600 hover:underline"> hello@yesbundles.com</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">Chargebacks</h2>
          <p>
            Before initiating a chargeback with your card issuer, please contact us first.
            Chargebacks without prior contact may result in account suspension and forfeiture
            of access to any purchased products.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold text-navy-900">Contact</h2>
          <p>
            Refund requests and questions: <a href="mailto:hello@yesbundles.com" className="text-electric-600 hover:underline">hello@yesbundles.com</a>.
          </p>
        </section>
      </div>
    </article>
  );
}
