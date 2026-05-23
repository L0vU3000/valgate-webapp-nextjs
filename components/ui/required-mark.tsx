export function RequiredMark() {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className="inline-block w-[5px] h-[5px] rounded-full bg-primary ml-1 mb-[3px] align-middle shrink-0"
    />
  );
}

export function OptionalLabel() {
  return (
    <span className="ml-1 text-[--text-tertiary] font-normal text-[0.8em] lowercase">
      optional
    </span>
  );
}
