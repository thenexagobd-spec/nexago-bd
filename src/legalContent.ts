/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LegalSection = { heading: string; text: string };

export type LegalDoc = {
  id: 'privacy' | 'terms';
  title: string;
  effectiveDate: string;
  website: string;
  content: LegalSection[];
};

export const LEGAL_DOCS: Record<'privacy' | 'terms', LegalDoc> = {
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    effectiveDate: 'August 16, 2026',
    website: 'https://thanexsago.com',
    content: [
      { heading: 'Company Name / Platform', text: 'NexaGo' },
      { heading: 'Website', text: 'https://thanexsago.com' },
      { heading: 'Welcome', text: 'Welcome to NexaGo ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your information when you access our platform, including our Super Admin, Store Admin, and related services.' },
      { heading: 'Information We Collect', text: 'Account Information: When you log in or register, we may collect your name, email address, phone number, and authentication details (such as Google Sign-In data). Business & Operational Data: Information related to multi-vendor stores, branches, orders, and system configurations managed through your account. Technical Data: IP address, browser type, device information, and access logs for security and maintenance purposes.' },
      { heading: 'How We Use Your Information', text: 'To provide, maintain, and secure our multi-tenant software systems and administrative panels. To authenticate users and prevent unauthorized access or security breaches. To communicate with you regarding system updates, support, and administrative notices.' },
      { heading: 'Data Security', text: 'We implement strict role-based access control and multi-layer permission defenses to ensure your data remains secure. However, no method of transmission over the internet is 100% secure.' },
      { heading: 'Contact Us', text: 'If you have any questions about this Privacy Policy, you can contact us at: thanexsagobd@gmail.com' },
    ],
  },
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    effectiveDate: 'August 16, 2026',
    website: 'https://thanexsago.com',
    content: [
      { heading: 'Platform', text: 'NexaGo' },
      { heading: 'Website', text: 'https://thanexsago.com' },
      { heading: 'Use of the Platform', text: 'NexaGo provides software systems and management tools designed for merchants and administrators. You agree to use the platform only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your login credentials and access keys (?key=nexago-main).' },
      { heading: 'Intellectual Property', text: 'All software architecture, designs, source code, system layouts, and branding associated with NexaGo are the exclusive property of the platform creators and are protected by applicable intellectual property laws.' },
      { heading: 'Limitation of Liability', text: 'NexaGo is provided on an "as-is" and "as-available" basis. We do not guarantee that the system will be uninterrupted or error-free, and we are not liable for any direct or indirect damages arising from the use of our software.' },
      { heading: 'Termination', text: 'We reserve the right to suspend or terminate access to the platform immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to our systems.' },
      { heading: 'Changes to Terms', text: 'We may update these Terms from time to time. Continued use of the platform after any changes indicates your acceptance of the new Terms.' },
      { heading: 'Contact Us', text: 'For any inquiries regarding these Terms, please contact us at: Thsnexsagobd@gmail.com' },
    ],
  },
};