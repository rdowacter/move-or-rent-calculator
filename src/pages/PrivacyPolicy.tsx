import { Link } from 'react-router-dom'
import { Footer } from '@/components/Footer'

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground underline">
          &larr; Back to Calculator
        </Link>
        <h1 className="text-2xl font-bold mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 21, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <p>
            HomeDecision is designed to protect your privacy. This policy explains how we handle your information.
          </p>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">The Short Version</h2>
            <p>
              <strong>We do not collect, store, or share your personal financial information.</strong> All calculations happen in your web browser. Your data never leaves your device.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">1. How the Tool Works</h2>
            <p>HomeDecision is a client-side application. This means:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>All financial calculations are performed <strong>in your web browser</strong>, on your device</li>
              <li>Your inputs and results are <strong>not sent to any server</strong></li>
              <li>No account creation is required</li>
              <li>No login is required</li>
              <li>No personal information is requested beyond what is needed for the financial analysis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">2. Local Storage</h2>
            <p>
              To preserve your work between visits, HomeDecision saves your inputs in your browser&apos;s <strong>local storage</strong> — a standard browser feature that stores data on your device only.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>This data remains on your device and is not accessible to us or any third party</li>
              <li>You can clear this data at any time by clearing your browser&apos;s site data for HomeDecision, or by using your browser&apos;s &quot;Clear Browsing Data&quot; feature</li>
              <li>If you use a shared or public computer, clear your browser data when you are finished</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">3. Information We Do Not Collect</h2>
            <p>We do not collect, process, or store:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Your name, email address, or contact information</li>
              <li>Your income, savings, debt, or other financial details</li>
              <li>Your property addresses or locations</li>
              <li>Your retirement account information</li>
              <li>Any information you enter into the tool</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">4. Website Hosting and Server Logs</h2>
            <p>
              HomeDecision is hosted on Vercel. Like all web hosting providers, Vercel may automatically collect standard server log data when you visit the site, including:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Your IP address</li>
              <li>Browser type and version</li>
              <li>Pages visited and timestamps</li>
              <li>Referring URL</li>
            </ul>
            <p className="mt-3">
              This data is collected by the hosting provider as part of standard web infrastructure. We do not access, analyze, or store these logs for tracking purposes. Vercel&apos;s privacy practices are governed by{' '}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Vercel&apos;s Privacy Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">5. Cookies and Tracking</h2>
            <p>HomeDecision does not use:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Tracking cookies</li>
              <li>Advertising cookies</li>
              <li>Analytics services (such as Google Analytics)</li>
              <li>Pixel trackers or beacons</li>
              <li>Fingerprinting techniques</li>
            </ul>
            <p className="mt-3">
              We may use essential cookies required for the website to function (such as session cookies for page navigation). These do not track you across sites or collect personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">6. Third-Party Services</h2>
            <p>
              As of the last updated date, HomeDecision does not integrate with any third-party services that collect user data. If this changes in the future (for example, through the addition of analytics or affiliate features), this policy will be updated to reflect those changes before they take effect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">7. Children&apos;s Privacy</h2>
            <p>
              HomeDecision is not directed at individuals under the age of 18. We do not knowingly collect information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">8. Your Rights</h2>
            <p>
              Because we do not collect or store your personal data, there is no data for us to provide, correct, or delete. Your financial inputs exist only in your browser&apos;s local storage, which you control entirely.
            </p>
            <p className="mt-3">
              If you are a California resident, the California Consumer Privacy Act (CCPA) grants you specific rights regarding personal information. Because HomeDecision does not collect personal information as defined by CCPA, these rights are not applicable to our service. We do not sell personal information.
            </p>
            <p className="mt-3">
              If you are located in the European Economic Area, the General Data Protection Regulation (GDPR) grants you specific rights regarding personal data. Because HomeDecision does not collect or process personal data on our servers, and all processing occurs locally in your browser, GDPR data subject rights are not applicable to the tool&apos;s core functionality. Standard server logs collected by our hosting provider are addressed in Section 4.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The &quot;Last Updated&quot; date at the top indicates the most recent revision. If we make material changes — particularly if we begin collecting data we do not currently collect — we will provide prominent notice on the site before the changes take effect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">10. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, contact us at: <strong>contact@homedecision.app</strong>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
