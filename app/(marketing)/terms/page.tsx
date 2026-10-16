import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Valgate",
  description:
    "The terms you agree to when you use Valgate, on the web and in the iPhone app.",
};

const EFFECTIVE = "16 October 2026";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-secondary">{children}</div>
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-foreground">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Valgate
          </Link>
          <Link
            href="/login"
            className="touch-44 flex items-center rounded-md px-3 text-sm font-medium text-secondary transition-colors hover:bg-surface-tint hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-secondary">Effective {EFFECTIVE}</p>

        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-secondary">
          <p>
            These terms are the agreement between you and Valgate for the use of the Valgate web
            app at https://www.valgate.co and the Valgate iPhone app. They are written to be read,
            so if something here is unclear, ask us instead of guessing.
          </p>
          <p>
            By creating an account, or by using either product, you agree to these terms. If you do
            not agree with them, please do not use Valgate. How we handle personal data is a
            separate document — see our{" "}
            <Link href="/privacy" className="font-medium text-[--val-primary-dark] underline">
              Privacy Policy
            </Link>
            , which forms part of this agreement.
          </p>
          <p>
            In these terms, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; mean Valgate,
            and &ldquo;you&rdquo; means the person using Valgate. If you are using Valgate for an
            organisation, you are confirming that you are allowed to accept these terms on its
            behalf.
          </p>
        </div>

        <Section id="account" title="1. Your account">
          <p>
            You need an account to use Valgate, and you must be at least 16 years old to have one.
            Give us accurate information, and keep your sign-in credentials to yourself — you are
            responsible for what happens through your account. If you think someone else has got
            into it, tell us straight away.
          </p>
          <p>
            Accounts belong to people, not to workspaces. That distinction matters, and it is why
            deleting your account and leaving a workspace are two different things (see section 8).
          </p>
        </Section>

        <Section id="your-content" title="2. Your content, and the information you enter about other people">
          <p>
            The records, documents and photographs you add to Valgate are yours. We do not claim
            ownership of them, we do not use them for our own purposes, and we do not sell them.
            You give us permission to store, copy, transmit and display them for one reason only:
            so that we can run the service for you and the people you share a workspace with.
            That permission lasts as long as the content is in Valgate.
          </p>
          <p>
            <strong className="font-medium text-foreground">This section is the one to read
            carefully.</strong> Valgate is built for property records, so much of what you enter
            describes <strong className="font-medium text-foreground">other people</strong> —
            tenants, co-owners, buyers, contractors — and some of it is sensitive, such as identity
            documents, lease terms and payment history.
          </p>
          <p>By entering information about someone else, you confirm that:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              you have a lawful reason to hold and record it, and to put it in Valgate;
            </li>
            <li>
              you have given those people whatever notice the law requires, including telling them
              that their information is held in a system like this one;
            </li>
            <li>
              you are allowed to upload any document you upload, and it does not infringe anyone
              else&rsquo;s rights or break a duty of confidence.
            </li>
          </ul>
          <p>
            We store that information on your instructions as part of the workspace&rsquo;s
            records. We do not use it for our own purposes, and responsibility for having a lawful
            basis for it rests with the person and the organisation who put it there.
          </p>
        </Section>

        <Section id="acceptable-use" title="3. How you may and may not use Valgate">
          <p>Please use Valgate for its intended purpose: recording and managing property information. In particular, do not:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              use it to break the law, or to help anyone else do so — including using it to
              discriminate unlawfully in the letting or sale of property;
            </li>
            <li>
              try to reach data that belongs to someone else, or to a workspace you are not a member
              of, including by probing our API, guessing identifiers or working around access
              controls;
            </li>
            <li>
              scrape, harvest or bulk-extract content from Valgate, or use automated tools against
              it other than as we permit in writing;
            </li>
            <li>
              upload malware, or anything designed to disrupt the service or other people&rsquo;s
              use of it;
            </li>
            <li>
              resell the service, or present it as your own, without our agreement;
            </li>
            <li>
              share your access with someone who should have their own account. Invite them
              instead — it is free to do and it keeps the record of who changed what honest.
            </li>
          </ul>
          <p>
            We may suspend or close an account that is being used in any of these ways. Where the
            problem is minor and can be fixed, we will tell you first and give you the chance to
            fix it.
          </p>
        </Section>

        <Section id="workspaces" title="4. Being part of a workspace">
          <p>
            Property records are held in workspaces, and more than one person can be a member of
            one. What you add to a workspace can be seen and changed by the other members of it, in
            line with their role. Think of a workspace as a shared filing cabinet: if you would not
            put something in the cabinet, do not put it in the workspace.
          </p>
          <p>
            If you are the owner of a workspace, you decide who joins it and what they may do. If
            you delete your own account, whatever you added to a workspace stays with that
            workspace and remains available to its other members.
          </p>
        </Section>

        <Section id="our-ip" title="5. Our content and intellectual property">
          <p>
            Valgate itself — the software, the design, the name and the logo — belongs to us. We
            give you permission to use it for as long as you keep to these terms. That permission
            does not include copying, modifying, reverse-engineering or redistributing the service,
            or using our name or logo without our agreement.
          </p>
        </Section>

        <Section id="fees" title="6. Fees">
          <p>
            If we charge for any part of Valgate, we will show you the price and the terms before
            you are charged, and you will have to agree to it before it applies to you. Nothing in
            Valgate commits you to a payment you have not been shown.
          </p>
        </Section>

        <Section id="availability" title="7. Changes to the service, and availability">
          <p>
            We are building Valgate, so it will change. We may add, change or remove features, and
            we may need to take the service down briefly for maintenance. We will not remove a
            feature you rely on without telling you first, where we reasonably can.
          </p>
          <p>
            We aim to keep Valgate available and your records intact, but we do not promise the
            service will be uninterrupted or error-free, and you should keep your own copies of
            anything you would be badly stuck without. Uploaded documents can be downloaded from
            within the product at any time.
          </p>
        </Section>

        <Section id="not-advice" title="8. What Valgate is not">
          <p>
            Valgate records and organises the information you put into it. It is a records tool,
            not a source of professional advice, and nothing in it is legal, tax, surveying,
            valuation, accounting or investment advice.
          </p>
          <p>
            Address lookups, map positions, valuations and figures shown in Valgate are provided to
            help you organise your own information. They are not authoritative: they may be
            incomplete or out of date, and they are not a substitute for the land register, a
            qualified valuer, or your own professional advisers. Check anything that matters
            against the official source before you rely on it.
          </p>
        </Section>

        <Section id="liability" title="9. Our responsibility to you">
          <p>
            Nothing in these terms limits any liability that cannot lawfully be limited, including
            liability for death or personal injury caused by negligence, or for fraud.
          </p>
          <p>
            Subject to that, and to the extent the law allows: we are not responsible for loss of
            profit, loss of business, loss of goodwill, or indirect or consequential loss; we are
            not responsible for loss that comes from information you entered incorrectly, from your
            failure to keep your credentials secure, or from your reliance on Valgate where the
            official source would have been available to you; and our total responsibility to you
            for any claim connected with Valgate is limited to the greater of the amount you paid us
            in the twelve months before the claim, or one hundred United States dollars.
          </p>
          <p>
            We provide Valgate with reasonable skill and care, but otherwise as it is, and we do not
            promise that it will meet every requirement you might have of it.
          </p>
        </Section>

        <Section id="ending" title="10. Ending this agreement">
          <p>
            You can stop using Valgate at any time, and you can delete your account from the
            Settings screen in the app or by writing to us. What happens to your data when you do is
            explained in the Privacy Policy — the important parts being that your account&rsquo;s
            personal data is erased, that workspace records stay with the workspace, and that
            uploaded documents are not deleted with your account.
          </p>
          <p>
            We may suspend or end your access if you seriously or repeatedly break these terms, if
            we are required to by law, or if we stop offering the service. Except where we have to
            act immediately, we will tell you and give you a reasonable chance to retrieve your
            records first.
          </p>
        </Section>

        <Section id="law" title="11. Which law applies, and where disputes are heard">
          <p>
            These terms are governed by the laws of the country in which Valgate is established,
            and the courts of that country have exclusive jurisdiction over any dispute arising from
            them or from your use of Valgate, except where the law where you live gives you the
            right to bring proceedings somewhere else. If you are a consumer, nothing here takes
            away the protection of the mandatory consumer law of the country you live in.
          </p>
        </Section>

        <Section id="changes" title="12. Changes to these terms">
          <p>
            We may update these terms as Valgate develops. When we do, we will change the date at
            the top, and where a change materially affects you we will tell you in the product or by
            email before it takes effect. Continuing to use Valgate after a change takes effect
            means you accept the updated terms. If you do not accept them, you can stop using
            Valgate and delete your account.
          </p>
        </Section>

        <Section id="contact" title="13. Contact">
          <p>
            Questions about these terms, or about anything in them you would like explained, go to{" "}
            <a
              className="font-medium text-[--val-primary-dark] underline"
              href="mailto:feedback@valgate.co"
            >
              feedback@valgate.co
            </a>
            .
          </p>
        </Section>
      </main>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <span className="text-sm font-medium text-secondary">Valgate</span>
          <Link
            href="/"
            className="touch-44 flex items-center rounded-md px-3 text-sm font-medium text-secondary transition-colors hover:bg-surface-tint hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
          >
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
