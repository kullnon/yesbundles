import type { Metadata } from 'next';
import { Mail, Clock, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact — YesBundles',
};

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
        Get in touch.
      </h1>
      <p className="mb-10 text-lg text-navy-600">
        Questions about a product, an order, or a bundle discount? We&apos;re here to help.
      </p>

      <div className="space-y-4">
        
        <a href="mailto:hello@yesbundles.com"
          className="group flex items-start gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-electric-100 text-electric-700">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Email</p>
            <p className="text-lg font-semibold text-navy-900 group-hover:text-electric-600">
              hello@yesbundles.com
            </p>
            <p className="text-sm text-navy-600">For all support, billing, and product questions.</p>
          </div>
        </a>

        <div className="flex items-start gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-100 text-navy-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Response time</p>
            <p className="text-lg font-semibold text-navy-900">Within 24 hours</p>
            <p className="text-sm text-navy-600">Monday through Friday. Weekends may be slower.</p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-100 text-navy-700">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Parent company</p>
            <p className="text-lg font-semibold text-navy-900">Maestro Media Group</p>
            <p className="text-sm text-navy-600">
              YesBundles is one of several platforms under MMG.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
