// Pure helper: where the Step6Success "Add more details" CTA should navigate. Extracted so
// this can be unit tested without rendering the component or a router.
export function getAddMoreDetailsHref(confirmedCode: string | undefined | null): string {
  return confirmedCode ? `/property/${confirmedCode}/overview` : "/portfolio";
}
