import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Valgate",
  description:
    "How Valgate collects, uses, shares and retains personal data across the Valgate web app and iPhone app.",
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

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-border-subtle py-2 pr-4 font-medium text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="align-top">
              {row.map((cell, i) => (
                <td key={i} className="border-b border-border-subtle py-2 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-secondary">Effective {EFFECTIVE}</p>

        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-secondary">
          <p>
            This policy explains what personal data Valgate collects, why we collect it, who
            else processes it, how long we keep it, and the rights you have over it. It covers
            both of our products, which share one account and one set of records: the{" "}
            <strong className="font-medium text-foreground">Valgate web app</strong> at
            https://www.valgate.co, and the{" "}
            <strong className="font-medium text-foreground">Valgate iPhone app</strong>.
          </p>
          <p>
            Where the two products differ, this policy says so. The differences that matter are
            that the web app uses product analytics and the app does not; that the app renders
            maps with a third-party SDK that sends its own telemetry; and that the app keeps
            your session in the iOS keychain while the web app uses cookies.
          </p>
        </div>

        <Section id="who-we-are" title="Who we are">
          <p>
            In this policy, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; mean
            Valgate, and &ldquo;you&rdquo; means the person using one of our products. We are
            the controller of the personal data described here — we decide why and how it is
            processed.
          </p>
          <p>
            For any privacy question, or to exercise any right described below, write to{" "}
            <a
              className="font-medium text-[--val-primary-dark] underline"
              href="mailto:feedback@valgate.co"
            >
              feedback@valgate.co
            </a>
            .
          </p>
          <p>
            We have not appointed a Data Protection Officer — our processing does not require
            one — but the address above reaches the people responsible for it. We are not
            established in the European Union or the United Kingdom, and we do not direct our
            services at people there. If you contact us from those countries we will still
            honour your rights under this policy, and if we ever do target those markets we
            will appoint a representative as the law requires.
          </p>
        </Section>

        <Section id="what-we-collect" title="1. What we collect, why, and where it goes">
          <h3 className="pt-2 font-medium text-foreground">Account and identity</h3>
          <Table
            head={["Data", "Why we have it", "Processed by"]}
            rows={[
              [
                "Email address, display name, profile photo URL, user ID",
                "Signing you in, managing your account, and showing you which account you are using",
                "Clerk (identity provider)",
              ],
              [
                "Workspace name, your role in it (owner, admin, member or viewer)",
                "Deciding what you are allowed to see and change",
                "Clerk and our database",
              ],
              [
                "Email address, received indirectly when a colleague invites you before you have an account",
                "Letting you accept an invitation and join the workspace you were invited to",
                "Clerk and our database",
              ],
            ]}
          />
          <p>
            We do not ask for your phone number, your date of birth, government identifiers or
            payment details, and we never store your password — authentication is handled by
            Clerk.
          </p>

          <h3 className="pt-2 font-medium text-foreground">Records you enter about your properties</h3>
          <p>
            Property names, addresses and map coordinates, type and status, floor area, bedroom
            and bathroom counts, the year built, valuations, ownership records, and tenancy and
            lease records. These are held in our database, which runs on Neon (managed
            PostgreSQL).
          </p>
          <p>
            Some of this describes <strong className="font-medium text-foreground">other people
            who are not Valgate users</strong> — for example tenant names and contact details,
            or co-owners. If you enter information about someone else, you are responsible for
            having a lawful reason to do so and for telling them what you have recorded. We
            hold it on your instructions as part of the workspace&rsquo;s records, and we do not
            use it for our own purposes.
          </p>

          <h3 className="pt-2 font-medium text-foreground">Files you upload</h3>
          <p>
            Documents and photographs you attach to a property — leases, tenant records,
            payment and expense records, and inspection reports. Uploads travel{" "}
            <strong className="font-medium text-foreground">directly from your device to object
            storage</strong> (Amazon Web Services S3) using a short-lived, single-purpose ticket
            issued by our API, so the file itself does not pass through our application servers.
            Files are read back through short-lived signed links, which expire after five
            minutes.
          </p>

          <h3 className="pt-2 font-medium text-foreground">Security and service operation</h3>
          <p>
            Session tokens (kept in the iOS keychain on the app, not in ordinary app storage),
            request timestamps, IP address, and rate-limiting counters. We keep these to hold
            your session open, to stop abuse, and to diagnose faults. Rate limiting is applied
            per IP address and per signed-in caller on our API.
          </p>

          <h3 className="pt-2 font-medium text-foreground">Maps</h3>
          <p>
            Maps are rendered with the Mapbox SDK. Mapbox&rsquo;s own published privacy manifest
            states that the SDK may collect a <strong className="font-medium text-foreground">user
            ID and precise location</strong> for app functionality and for its own analytics,
            and that this data is not used to track you across other companies&rsquo; apps or
            websites.
          </p>
          <p>
            <strong className="font-medium text-foreground">Our app never asks for your device
            location.</strong> It contains no location permission request and no use of
            Core Location; maps are centred on the properties you have entered. Location data is
            therefore collected by the Mapbox SDK rather than requested by us, which is why the
            app&rsquo;s App Store privacy label declares Precise Location even though you will
            never see a location prompt. Mapbox&rsquo;s telemetry is controlled by the SDK, and
            the map&rsquo;s attribution menu — reached from the map itself — offers a way to
            turn that participation off.
          </p>
          <p>
            Address search and geocoding happen <strong className="font-medium
            text-foreground">server-side</strong> in our API, not on your device. Address search
            uses AWS Location (GrabMaps) in the Asia Pacific (Singapore) region, with Mapbox
            geocoding also available server-side. This is the point at which the addresses you
            search for leave our systems.
          </p>

          <h3 className="pt-2 font-medium text-foreground">Web analytics — web app only</h3>
          <p>
            The web app is designed to use PostHog for product analytics and session replay,
            so we can see which parts of the product work and where people get stuck. This is
            not yet live in production. When it is, these limits apply:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Session replay masks all on-screen text and all element attributes, so property
              addresses, tenant names and lease figures are not captured in replays. Images,
              canvas content and map tiles are not covered by that masking, which is why replay
              is only used where you have consented to it.
            </li>
            <li>
              Anonymous visitors are not given a person profile, but their events are still
              recorded. Being unidentified is not the same as not being collected.
            </li>
            <li>
              When you are signed in, events and replays are linked to your account, so we can
              understand how a real workflow behaves.
            </li>
            <li>
              <strong className="font-medium text-foreground">None of this happens in the iPhone
              app.</strong> The app contains no analytics SDK, no crash-reporting SDK and no
              advertising SDK, and nothing you do in the app is sent to PostHog.
            </li>
          </ul>

          <h3 className="pt-2 font-medium text-foreground">What we do not do</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              We do not use your personal data to <strong className="font-medium
              text-foreground">track you across other companies&rsquo; apps or websites</strong>,
              and we do not sell it or share it for cross-context behavioural advertising. That
              is why the iPhone app never shows an App Tracking Transparency prompt: there is
              nothing for it to ask permission for.
            </li>
            <li>
              We do not include advertising or data-broker SDKs in either product, and we do not
              use your data to train machine-learning models.
            </li>
            <li>
              We do not ask for your device location, your contacts, your photo library or your
              health data, and we do not read your device advertising identifier.
            </li>
            <li>
              We do not use your records for our own commercial purposes. They exist so that you
              can manage your properties, and for no other reason.
            </li>
          </ul>
        </Section>

        <Section id="lawful-basis" title="2. Our lawful basis for using your data">
          <Table
            head={["What we do", "Our basis"]}
            rows={[
              ["Creating and running your account, and storing the records and files you add", "Performance of our contract with you"],
              ["Keeping the service secure and working — logs, rate limiting, abuse prevention", "Our legitimate interests in protecting the service and everyone using it"],
              ["Rendering maps and looking up addresses you search for", "Performance of our contract with you"],
              ["Mapbox SDK telemetry", "The SDK provider's own legitimate interests in improving its product; you can turn it off from the map's attribution menu"],
              ["Web analytics and session replay", "Your consent, where you have given it"],
              ["Meeting legal obligations and defending legal claims", "Legal obligation, or our legitimate interests"],
            ]}
          />
          <p>
            Where we rely on legitimate interests we have balanced those interests against your
            rights, and you can object to that processing at any time using the contact address
            above.
          </p>
        </Section>

        <Section id="processors" title="3. Who else processes your data">
          <Table
            head={["Provider", "What it does for us", "Where it processes"]}
            rows={[
              ["Clerk", "Sign-in, sessions, workspace membership", "United States and other regions Clerk publishes"],
              ["Mapbox", "Rendering maps; it also collects a user ID and precise location for its own analytics, as described above", "United States and other regions Mapbox publishes"],
              ["AWS Location (GrabMaps)", "Address search and geocoding on the server", "Asia Pacific (Singapore)"],
              ["PostHog", "Product analytics and session replay — web app only, and not yet live", "United States or the European Union, depending on configuration"],
              ["Neon", "Managed PostgreSQL, holding your records", "United States and other regions Neon publishes"],
              ["Amazon Web Services", "Object storage for the files you upload", "Asia Pacific (Sydney)"],
              ["Vercel", "Hosting and delivering the web app and our API", "United States and the region serving your requests"],
              ["Resend", "Transactional email, such as workspace invitations and delivery failures", "United States and other regions Resend publishes"],
            ]}
          />
          <p>
            The Mapbox entry is different from the rest. Every other provider processes your
            data only on our instructions. Mapbox&rsquo;s manifest declares an analytics
            purpose, so part of what its SDK does is for its own ends rather than ours, and the
            map&rsquo;s attribution menu is where you change that.
          </p>
        </Section>

        <Section id="transfers" title="4. Sending data between countries">
          <p>
            We are based outside the European Economic Area and the United Kingdom, and our
            providers are too. Your data is processed at least in Australia (where your uploaded
            files are stored) and Singapore (where address searches are performed), and by the
            providers listed above, several of which are established in the United States.
          </p>
          <p>
            Where personal data protected by UK or EU law is transferred outside those areas, we
            rely on the safeguards those laws provide for — the UK International Data Transfer
            Agreement or Addendum, the European Commission&rsquo;s Standard Contractual Clauses,
            or the EU-US Data Privacy Framework where the provider concerned is certified under
            it.
          </p>
        </Section>

        <Section id="retention" title="5. How long we keep it">
          <ul className="list-disc space-y-3 pl-5">
            <li>
              <strong className="font-medium text-foreground">Your account</strong> is kept for as
              long as it exists. You can delete it at any time from the app (see &ldquo;Your
              rights&rdquo;), which closes your account and ends your access.
            </li>
            <li>
              <strong className="font-medium text-foreground">Workspace records outlive your
              account.</strong> Properties, valuations, ownership records, tenancy records and
              uploaded documents belong to the workspace, not to an individual account. If you
              delete your account you lose access to them; they are not deleted from the
              workspace or from storage, because the workspace and the other people in it still
              need them. We keep a workspace&rsquo;s records for as long as the workspace
              exists, and for up to twelve months after it is closed, except where we must keep
              something longer to meet a legal, tax or accounting obligation, or to establish or
              defend a legal claim. Workspace records are deleted from our production database
              when that period ends; copies in encrypted backups are overwritten as the backup
              cycle completes.
            </li>
            <li>
              <strong className="font-medium text-foreground">When you delete your account,</strong>{" "}
              we delete it in Clerk, remove your workspace memberships, and erase the personal
              data we hold about you — your email address, display name and profile photo —
              from our own records. The user identifier that other records refer to is kept in
              a pseudonymised form so those records stay internally consistent. It is still
              personal data, and it is still linkable to those records.
            </li>
            <li>
              <strong className="font-medium text-foreground">Uploaded files do not disappear
              automatically</strong> when an account is deleted, for the same reason the
              workspace&rsquo;s records do not: they belong to the workspace.
            </li>
            <li>
              <strong className="font-medium text-foreground">Security and operational logs</strong>{" "}
              are kept for up to twelve months, and are then deleted or, where they are held in
              an aggregated form, de-identified.
            </li>
            <li>
              If you want a workspace&rsquo;s business records deleted, that is a separate
              request. Write to us and we will tell you what can be removed and what we are
              required to keep.
            </li>
          </ul>
        </Section>

        <Section id="rights" title="6. Your rights and choices">
          <ul className="list-disc space-y-3 pl-5">
            <li>
              <strong className="font-medium text-foreground">Delete your account.</strong> In the
              app, open <strong className="font-medium text-foreground">Settings</strong> and
              choose <strong className="font-medium text-foreground">Delete Account</strong>. You
              do not need to ask us, and you do not need to give a reason. What happens to your
              data when you do is set out under &ldquo;How long we keep it&rdquo;.
            </li>
            <li>
              <strong className="font-medium text-foreground">Access, correction, erasure,
              portability, objection, restriction, and withdrawing consent.</strong> Write to us
              at the address above. We answer within one month. If a request is complex we may
              extend that by up to two further months, and we will tell you if we do. Requests are
              free, and we may ask for enough information to confirm who you are before we act —
              so that a request can never be used to reach someone else&rsquo;s data. If we
              refuse a request we will explain why and tell you how to complain.
            </li>
            <li>
              <strong className="font-medium text-foreground">Object to our legitimate
              interests.</strong> You can object to any processing that rests on our legitimate
              interests, including the security logging described above.
            </li>
            <li>
              <strong className="font-medium text-foreground">Complain.</strong> You can complain
              to the data protection authority where you live, where you work, or where the
              problem happened. We would rather you came to us first, but it is entirely your
              choice.
            </li>
            <li>
              <strong className="font-medium text-foreground">California and other US states.</strong>{" "}
              If you are a California resident and a law such as the CCPA applies to us, you have
              the rights to know what we collect, to see it, to correct it, to delete it, and not
              to be discriminated against for asking. In the last twelve months we have collected
              the categories described in section 1: identifiers and account information;
              commercial and property records; the documents and photographs you upload; internet
              and device information such as IP address and request records; and, through the
              Mapbox SDK, precise geolocation, which is sensitive personal information. We collect
              it from you, from the colleague who invited you, and from our service providers. We
              use and disclose it for the purposes in section 1. We do not sell personal
              information and we do not share it for cross-context behavioural advertising. You,
              or an authorised agent acting for you, can make a request using the contact address
              above; we may ask you to verify your identity first.
            </li>
            <li>
              <strong className="font-medium text-foreground">Automated decisions.</strong> We do
              not make decisions with legal or similarly significant effects about you by
              automated means alone, and we do not build advertising or profiling profiles from
              your data.
            </li>
          </ul>
        </Section>

        <Section id="cookies" title="7. Cookies and similar technologies">
          <p>
            The web app sets <strong className="font-medium text-foreground">strictly necessary
            cookies</strong> through Clerk so that you can stay signed in and so your session is
            secure. These are required for the service to work, and they cannot be switched off
            while you are signed in.
          </p>
          <p>
            When PostHog goes live in the web app, it will use cookies or local storage to
            recognise returning browsers and to record sessions. In the United Kingdom and the
            European Economic Area, that needs your prior consent, so those features will be off
            until you accept them, and turning them on or off again will be as easy as accepting
            them was. The iPhone app sets no analytics or advertising cookies.
          </p>
        </Section>

        <Section id="children" title="8. Children">
          <p>
            Valgate is a property-records tool for property owners and managers, and it is not
            directed at children. We do not knowingly collect personal data from anyone under 16.
            If you believe a child has given us personal data, write to us and we will delete it.
          </p>
        </Section>

        <Section id="security" title="9. How we protect your data">
          <p>
            Traffic between the app, the web app and our API uses HTTPS. Uploads go straight to
            storage with short-lived, single-purpose tickets, and are read back through
            short-lived signed links. Session tokens are kept in the iOS keychain. Every API
            request is authorised on the server, against your account and your workspace
            boundaries, rather than trusting what the app asks for. Access to production data is
            limited to those who need it to run the service, and requires authenticated access to
            our infrastructure provider.
          </p>
        </Section>

        <Section id="breach" title="10. If something goes wrong">
          <p>
            If a breach of security leads to your personal data being accidentally lost, altered
            or disclosed, we will assess the risk, record what happened, and act to contain it.
            Where the law requires it, we will tell the relevant supervisory authority within 72
            hours of becoming aware of it, and we will tell you without undue delay if the breach
            is likely to put you at high risk.
          </p>
        </Section>

        <Section id="choices" title="11. Do you have to give us this data?">
          <p>
            No. You choose whether to use Valgate. But we cannot create an account without an
            email address, and the service cannot hold records about a property without the
            details you enter about it, so that information is required for us to perform our
            contract with you. Everything else is optional.
          </p>
        </Section>

        <Section id="changes" title="12. Changes to this policy">
          <p>
            If we make a material change to this policy we will update the date at the top and,
            where the change is significant, tell you in the product or by email before it takes
            effect. Continuing to use Valgate after a change takes effect means you accept the
            updated policy.
          </p>
        </Section>

        <Section id="contact" title="13. Contact">
          <p>
            Questions, requests and complaints about privacy all go to the same place:{" "}
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
