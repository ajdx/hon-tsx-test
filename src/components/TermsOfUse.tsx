import React from 'react';
import { Link } from 'react-router-dom';
import honLogo from '../assets/hon-logo.svg';

export default function TermsOfUse() {
  return (
    <div className="bg-white text-black min-h-screen">
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <Link to="/" className="inline-flex items-center">
            <img src={honLogo} alt="Hon" className="h-7" />
          </Link>
          <div className="ml-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Terms of Use</h1>
            <p className="text-gray-500 text-sm">Effective date: August 16, 2025</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
          <p className="text-gray-700 leading-relaxed">
            These Terms of Use (the “Terms”) govern your access to and use of Hon and any related services,
            websites, and applications provided by us (collectively, the “Service”). By using the Service,
            you agree to these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Eligibility & Accounts</h2>
          <p className="text-gray-700 leading-relaxed">
            You must be legally able to enter into these Terms. You are responsible for all activity under
            your account and for keeping your credentials secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Your Content and AI Outputs</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              You retain ownership of all content, prompts, inputs, and uploads you provide to the Service
              (“Inputs”) and of any AI-generated outputs produced for you by the Service (“Outputs”).
            </p>
            <p>
              You grant us a worldwide, non-exclusive, royalty-free license to host, store, process, transmit,
              display, and create transient copies of Inputs and Outputs solely to operate, maintain, secure,
              and improve the Service, to comply with law, and to provide you requested features such as
              collaboration, previews, caching, and sharing.
            </p>
            <p>
              You are responsible for your Inputs and Outputs, including ensuring you have all necessary rights
              to use Inputs and to use Outputs as you intend. You agree not to submit Inputs or use Outputs in a
              manner that violates applicable law, third-party rights, or these Terms.
            </p>
            <p>
              Commercial Use Acknowledgement: Subject to applicable law and third-party rights, you may use
              Outputs commercially. We do not claim ownership in your Outputs. You are solely responsible for
              determining whether your use (including commercial use) of any Output is lawful and for obtaining
              any permissions required by third parties.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Payments & Fees</h2>
          <p className="text-gray-700 leading-relaxed">
            Certain features may incur fees. Where applicable, platform or processing fees may apply to
            transactions, and you authorize us and our processors to charge the payment method you provide.
            We may charge a platform fee (currently up to 1.8%) on support transactions processed via the
            Service. You are responsible for any taxes arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Acceptable Use</h2>
          <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
            <li>No illegal, infringing, harmful, or deceptive activity.</li>
            <li>No attempts to compromise the Service, other users, or our infrastructure.</li>
            <li>No collection or processing of others’ personal data without a lawful basis.</li>
            <li>No violation of model or service provider policies integrated into the platform.</li>
            <li>No content that is non-consensual, exploitative, or violates intellectual property rights.</li>
            <li>No impersonation or misrepresentation of affiliation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Intellectual Property</h2>
          <p className="text-gray-700 leading-relaxed">
            We and our licensors own the Service and all related software, code, and branding. Except for the
            limited license granted to us in Section 3, we do not claim ownership of your Inputs or Outputs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Disclaimers</h2>
          <p className="text-gray-700 leading-relaxed">
            The Service and all Outputs are provided “as is” and “as available.” We do not guarantee accuracy,
            reliability, suitability, or error-free operation. AI systems may produce unexpected, inaccurate, or
            biased results. Use at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed">
            To the maximum extent permitted by law, we will not be liable for any indirect, incidental,
            consequential, special, or punitive damages, or for any loss of profits, data, or goodwill arising
            from your use of or inability to use the Service or Outputs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">9. Indemnification</h2>
          <p className="text-gray-700 leading-relaxed">
            You agree to defend, indemnify, and hold harmless the Service and its affiliates from any claims,
            damages, liabilities, costs, and expenses arising from your Inputs, Outputs, or use of the Service,
            or your violation of these Terms or applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">10. DMCA & Takedowns</h2>
          <p className="text-gray-700 leading-relaxed">
            If you believe content on the Service infringes your copyright, notify us at
            <a href="mailto:info@tellhon.com" className="text-blue-600 underline"> info@tellhon.com</a> with
            sufficient detail to identify the work and the allegedly infringing content. We may remove or
            disable access to disputed content and may terminate repeat infringers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">11. Disputes; Governing Law</h2>
          <p className="text-gray-700 leading-relaxed">
            These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law
            principles. You agree to binding arbitration on an individual basis for any dispute arising out of
            or relating to the Service or these Terms, and you waive any right to participate in a class action
            or class-wide arbitration. You may seek individual relief in small claims court if eligible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">12. Changes</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update these Terms. If we make material changes, we will provide notice as appropriate.
            Continued use of the Service after changes take effect constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">13. Contact</h2>
          <p className="text-gray-700 leading-relaxed">
            Questions about these Terms? Contact us at <a href="mailto:info@tellhon.com" className="text-blue-600 underline">info@tellhon.com</a>.
          </p>
        </section>
      </main>
    </div>
  );
}


