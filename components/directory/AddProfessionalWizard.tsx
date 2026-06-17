"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  Mail,
  Phone,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  PhoneSheet,
  PhoneSheetContent,
  PhoneSheetTitle,
} from "@/components/ui/phone-sheet";
import { WizardProgress } from "@/components/feature-unlock/WizardProgress";
import type { WizardProgressStep } from "@/components/feature-unlock/WizardProgress";
import { useAppHeaderProperties } from "@/components/layout/AppHeaderPropertiesContext";
import { createProfessional } from "@/lib/actions/professionals.actions";
import {
  ADD_PROFESSIONAL_DEFAULTS,
  ADD_PROFESSIONAL_STEPS,
  CATEGORY_AVATAR_BG,
  CATEGORY_BADGE,
  PROFESSIONAL_CATEGORIES,
  addProfessionalSchema,
  buildProfessionalInitials,
  formDataToNewProfessional,
  type AddProfessionalFormData,
} from "@/lib/professional-form";
import type { ProfessionalCategory } from "@/lib/data/types/professional";
import { cn } from "@/components/ui/utils";
import { toast } from "sonner";
import { RequiredMark, OptionalLabel } from "@/components/ui/required-mark";

const INPUT =
  "w-full border-0 bg-transparent px-0 py-0 text-[14px] text-val-heading placeholder:text-slate-400 focus:outline-none";

const INPUT_WRAP =
  "flex items-center gap-3 rounded-xl border border-[var(--val-border-subtle)] bg-[var(--val-input-surface)] px-4 py-3 transition-[border-color,box-shadow] duration-200 focus-within:border-[var(--val-primary-dark)] focus-within:shadow-[0_0_0_3px_oklch(55%_0.15_250_/_0.08)]";

const LABEL = "block text-[13px] font-semibold text-val-heading mb-2";

const ERROR = "text-[12px] text-red-600 mt-1.5";

const GRADIENT_STYLE = {
  background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
  boxShadow: "0 4px 6px -1px rgba(0,74,198,0.20)",
};

interface AddProfessionalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProfessionalPreviewCard({
  name,
  company,
  category,
  available,
  email,
  phone,
  linkedCount,
  compact = false,
}: {
  name: string;
  company: string;
  category: ProfessionalCategory;
  available: boolean;
  email: string;
  phone: string;
  linkedCount: number;
  compact?: boolean;
}) {
  const displayName = name.trim() || "Professional name";
  const displayCompany = company.trim() || "Company or firm";
  const initials = buildProfessionalInitials(name.trim() || "NA");
  const badgeClass = CATEGORY_BADGE[category];
  const avatarBg = CATEGORY_AVATAR_BG[category];
  const hasContact = email.trim().length > 0 || phone.trim().length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--val-border-subtle)] bg-white flex flex-col",
        compact ? "p-5" : "p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]",
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="relative">
          <div
            className={cn(
              "rounded-full flex items-center justify-center text-white font-bold ring-4 ring-[#dbe1ff] transition-all duration-300",
              compact ? "size-14 text-base" : "size-16 text-lg",
              avatarBg,
              !name.trim() && "opacity-60",
            )}
          >
            {initials}
          </div>
          {available && (
            <div className="absolute bottom-0 right-0 size-4 rounded-full bg-emerald-500 border-2 border-white" />
          )}
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold tracking-[1px] uppercase px-3 py-1 rounded-full",
            badgeClass,
          )}
        >
          {category}
        </span>
      </div>

      <h4
        className={cn(
          "font-bold text-val-heading leading-snug",
          compact ? "text-base" : "text-lg",
          !name.trim() && "text-slate-400",
        )}
      >
        {displayName}
      </h4>
      <p
        className={cn(
          "text-sm mt-0.5 mb-4",
          company.trim() ? "text-slate-500" : "text-slate-400",
        )}
      >
        {displayCompany}
      </p>

      {!compact && (
        <div className="bg-val-bg-tint rounded-lg px-3 py-2.5 flex items-center gap-3 mb-4">
          <div className="flex gap-2">
            <span
              className={cn(
                "size-8 rounded-full flex items-center justify-center bg-white",
                email.trim() ? "text-slate-500" : "text-slate-300",
              )}
            >
              <Mail className="size-3.5" />
            </span>
            <span
              className={cn(
                "size-8 rounded-full flex items-center justify-center bg-white",
                phone.trim() ? "text-slate-500" : "text-slate-300",
              )}
            >
              <Phone className="size-3.5" />
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {hasContact ? "Contact on file" : "Add email or phone"}
          </span>
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
        <span className="text-slate-500 text-xs">
          Linked properties:{" "}
          <span className="font-semibold text-val-heading tabular-nums">
            {linkedCount}
          </span>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Your contact
        </span>
      </div>
    </div>
  );
}

function DetailsStep({
  form,
}: {
  form: UseFormReturn<AddProfessionalFormData>;
}) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const name = watch("name");
  const company = watch("company");
  const category = watch("category");
  const available = watch("available");

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        <div className="rounded-xl bg-val-bg-tint/80 border border-[var(--val-border-subtle)] px-4 py-3.5">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Add someone you already trust. Valgate-verified professionals are
            curated separately and show a blue verified badge.
          </p>
        </div>

        <p className="text-[11px] text-[--text-tertiary] flex items-center gap-1 self-end -mb-1">
          <RequiredMark />
          <span>Required fields</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={LABEL + " flex items-center"} htmlFor="professionalName">
              Full name <RequiredMark />
            </label>
            <div className={INPUT_WRAP}>
              <UserRound className="size-4 text-slate-400 shrink-0" />
              <input
                id="professionalName"
                {...register("name")}
                type="text"
                placeholder="e.g. Sok Dara"
                className={INPUT}
                autoComplete="name"
              />
            </div>
            {errors.name && <p className={ERROR}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={LABEL + " flex items-center"} htmlFor="professionalCompany">
              Company or firm <RequiredMark />
            </label>
            <div className={INPUT_WRAP}>
              <Building2 className="size-4 text-slate-400 shrink-0" />
              <input
                id="professionalCompany"
                {...register("company")}
                type="text"
                placeholder="e.g. Phnom Penh Notary Office"
                className={INPUT}
                autoComplete="organization"
              />
            </div>
            {errors.company && <p className={ERROR}>{errors.company.message}</p>}
          </div>
        </div>

        <div>
          <label className={LABEL + " flex items-center"} htmlFor="professionalCategory">
            Profession <RequiredMark />
          </label>
          <div className={cn(INPUT_WRAP, "relative pr-10")}>
            <select
              id="professionalCategory"
              {...register("category")}
              className="w-full appearance-none border-0 bg-transparent px-0 py-0 text-[14px] text-val-heading focus:outline-none cursor-pointer"
            >
              {PROFESSIONAL_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
          {errors.category && <p className={ERROR}>{errors.category.message}</p>}
        </div>
      </div>

      <div className="lg:w-[280px] shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-3">
          Card preview
        </p>
        <ProfessionalPreviewCard
          name={name}
          company={company}
          category={category}
          available={available}
          email=""
          phone=""
          linkedCount={0}
          compact
        />
      </div>
    </div>
  );
}

function ContactStep({
  form,
}: {
  form: UseFormReturn<AddProfessionalFormData>;
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const available = watch("available");
  const email = watch("email");
  const phone = watch("phone");

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={LABEL + " flex items-center"} htmlFor="professionalEmail">
            Email <OptionalLabel />
          </label>
        <div className={INPUT_WRAP}>
          <Mail className="size-4 text-slate-400 shrink-0" />
          <input
            id="professionalEmail"
            {...register("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="contact@firm.kh"
            className={INPUT}
          />
        </div>
        {errors.email && <p className={ERROR}>{errors.email.message}</p>}
        </div>

        <div>
          <label className={LABEL + " flex items-center"} htmlFor="professionalPhone">
            Phone <OptionalLabel />
          </label>
        <div className={INPUT_WRAP}>
          <Phone className="size-4 text-slate-400 shrink-0" />
          <input
            id="professionalPhone"
            {...register("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+855 23 456 789"
            className={INPUT}
          />
        </div>
        {errors.phone && <p className={ERROR}>{errors.phone.message}</p>}
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border px-4 py-4 flex items-center justify-between gap-4 transition-colors duration-200",
          available
            ? "border-emerald-200/80 bg-emerald-50/40"
            : "border-[var(--val-border-subtle)] bg-[var(--val-input-surface)]",
        )}
      >
        <div>
          <p className="text-[13px] font-semibold text-val-heading">
            Available for new work
          </p>
          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
            Shows a green dot on their directory card.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={available}
          aria-label="Available for new work"
          onClick={() =>
            setValue("available", !available, { shouldDirty: true })
          }
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
            available ? "bg-emerald-500" : "bg-slate-200",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-sm transition duration-200",
              available ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {(email.trim() || phone.trim()) && (
        <p className="text-[12px] text-slate-500">
          Contact buttons on their card will activate once you save.
        </p>
      )}
    </div>
  );
}

function PropertiesStep({
  form,
}: {
  form: UseFormReturn<AddProfessionalFormData>;
}) {
  const properties = useAppHeaderProperties();
  const { watch, setValue } = form;
  const selectedIds = watch("propertyIds");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProperties = properties.filter((property) => {
    const query = searchQuery.trim().toLowerCase();
    if (query === "") return true;
    return (
      property.name.toLowerCase().includes(query) ||
      property.code.toLowerCase().includes(query) ||
      (property.province?.toLowerCase().includes(query) ?? false) ||
      property.status.toLowerCase().includes(query)
    );
  });

  function toggleProperty(propertyId: string) {
    const next = selectedIds.includes(propertyId)
      ? selectedIds.filter((id) => id !== propertyId)
      : [...selectedIds, propertyId];
    setValue("propertyIds", next, { shouldDirty: true });
  }

  function selectAll() {
    const idsToAdd = filteredProperties.map((property) => property.id);
    const merged = new Set([...selectedIds, ...idsToAdd]);
    setValue("propertyIds", [...merged], { shouldDirty: true });
  }

  function clearAll() {
    setValue("propertyIds", [], { shouldDirty: true });
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--val-border-subtle)] bg-val-bg-tint/50 px-6 py-10 text-center max-w-md">
        <div className="size-12 rounded-full bg-white border border-[var(--val-border-subtle)] flex items-center justify-center mx-auto mb-4">
          <Building2 className="size-5 text-slate-400" />
        </div>
        <p className="text-[15px] font-semibold text-val-heading">
          No properties to link yet
        </p>
        <p className="text-[13px] text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
          Save this contact now — you can assign properties from their profile
          once your portfolio is set up.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-slate-500 leading-relaxed max-w-md">
          Assign properties this professional supports. Skip if you&apos;re not
          ready yet.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={selectAll}
            disabled={filteredProperties.length === 0}
            className="text-[12px] font-semibold text-slate-500 hover:text-val-heading disabled:opacity-40 disabled:pointer-events-none transition-colors px-2 py-1"
          >
            Select all
          </button>
          <span className="text-slate-200">|</span>
          <button
            type="button"
            onClick={clearAll}
            disabled={selectedIds.length === 0}
            className="text-[12px] font-semibold text-slate-500 hover:text-val-heading disabled:opacity-40 disabled:pointer-events-none transition-colors px-2 py-1"
          >
            Clear
          </button>
        </div>
      </div>

      <div className={INPUT_WRAP}>
        <Search className="size-4 text-slate-400 shrink-0" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, code, province, or status…"
          className={INPUT}
          aria-label="Search properties"
        />
      </div>

      <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-0.5">
        {filteredProperties.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--val-border-subtle)] bg-val-bg-tint/40 px-5 py-8 text-center">
            <p className="text-[13px] font-semibold text-val-heading">
              No properties match your search
            </p>
            <p className="text-[12px] text-slate-500 mt-1">
              Try a different name, code, or province.
            </p>
          </div>
        ) : (
          filteredProperties.map((property) => {
          const selected = selectedIds.includes(property.id);
          const propertyInitials = property.code
            .replace(/[^A-Z0-9]/gi, "")
            .slice(0, 2)
            .toUpperCase();

          return (
            <button
              key={property.id}
              type="button"
              onClick={() => toggleProperty(property.id)}
              className={cn(
                "w-full text-left rounded-xl border px-4 py-3.5 flex items-center gap-3.5 transition-all duration-150 active:scale-[0.995]",
                selected
                  ? "border-[var(--val-primary-dark)] bg-white shadow-[0_0_0_3px_oklch(55%_0.15_250_/_0.08)]"
                  : "border-[var(--val-border-subtle)] bg-[var(--val-input-surface)] hover:border-slate-300 hover:bg-white",
              )}
            >
              <div
                className={cn(
                  "size-10 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors duration-150",
                  selected
                    ? "bg-[var(--val-primary-dark)] text-white"
                    : "bg-white text-[var(--val-primary-dark)] border border-[var(--val-border-subtle)]",
                )}
              >
                {propertyInitials || "PR"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-val-heading truncate">
                  {property.name}
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5 tabular-nums">
                  {property.code}
                  {property.province ? ` · ${property.province}` : ""}
                </p>
              </div>

              <div
                className={cn(
                  "size-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-150",
                  selected
                    ? "border-[var(--val-primary-dark)] bg-[var(--val-primary-dark)]"
                    : "border-slate-300 bg-white",
                )}
              >
                {selected && (
                  <Check className="size-3 text-white" strokeWidth={3} />
                )}
              </div>
            </button>
          );
        })
        )}
      </div>

      {selectedIds.length > 0 && (
        <p className="text-[12px] font-semibold text-[var(--val-primary-dark)] tabular-nums">
          {selectedIds.length} of {properties.length} propert
          {properties.length === 1 ? "y" : "ies"} selected
          {searchQuery.trim() && filteredProperties.length !== properties.length && (
            <span className="font-normal text-slate-500">
              {" "}
              · {filteredProperties.length} shown
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function ReviewStep({
  form,
}: {
  form: UseFormReturn<AddProfessionalFormData>;
}) {
  const properties = useAppHeaderProperties();
  const values = form.watch();
  const linkedProperties = properties.filter((property) =>
    values.propertyIds.includes(property.id),
  );

  const facts = [
    { label: "Email", value: values.email.trim() || "Not provided" },
    { label: "Phone", value: values.phone.trim() || "Not provided" },
    {
      label: "Availability",
      value: values.available ? "Available" : "Unavailable",
    },
    {
      label: "Properties",
      value:
        linkedProperties.length === 0
          ? "None linked"
          : linkedProperties.map((property) => property.name).join(", "),
    },
  ];

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
      <div className="lg:w-[300px] shrink-0 order-2 lg:order-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-3">
          Directory card
        </p>
        <ProfessionalPreviewCard
          name={values.name}
          company={values.company}
          category={values.category}
          available={values.available}
          email={values.email}
          phone={values.phone}
          linkedCount={linkedProperties.length}
        />
      </div>

      <div className="flex-1 min-w-0 order-1 lg:order-2 flex flex-col gap-5">
        <div className="divide-y divide-[var(--val-border-subtle)] rounded-xl border border-[var(--val-border-subtle)] bg-white overflow-hidden">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="px-5 py-3.5 flex items-start justify-between gap-6"
            >
              <span className="text-[13px] text-slate-500 shrink-0">
                {fact.label}
              </span>
              <span className="text-[13px] font-semibold text-val-heading text-right leading-snug">
                {fact.value}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-val-bg-tint/80 border border-[var(--val-border-subtle)] px-4 py-3.5 flex items-start gap-3">
          <BadgeCheck className="size-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-500 leading-relaxed">
            Saved to your personal directory. Valgate may verify trusted
            professionals separately — that badge cannot be self-assigned.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AddProfessionalWizard({
  open,
  onOpenChange,
}: AddProfessionalWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AddProfessionalFormData>({
    resolver: zodResolver(addProfessionalSchema),
    defaultValues: ADD_PROFESSIONAL_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(ADD_PROFESSIONAL_DEFAULTS);
    setStepIndex(0);
    setError(null);
    setSubmitting(false);
  }, [open, form]);

  const currentStep = ADD_PROFESSIONAL_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === ADD_PROFESSIONAL_STEPS.length - 1;
  const progressPercent =
    ((stepIndex + 1) / ADD_PROFESSIONAL_STEPS.length) * 100;

  const progressSteps: WizardProgressStep[] = ADD_PROFESSIONAL_STEPS.map(
    (step, index) => ({
      key: step.key,
      title: step.title,
      status: (
        index === stepIndex
          ? "active"
          : index < stepIndex
            ? "completed"
            : "pending"
      ) as WizardProgressStep["status"],
    }),
  );

  async function handleNext() {
    if (!currentStep) return;

    if (currentStep.fields.length > 0) {
      const valid = await form.trigger([...currentStep.fields]);
      if (!valid) {
        setError("Check the highlighted fields before continuing.");
        return;
      }
    }

    setError(null);

    if (isLastStep) {
      await handleSubmit();
      return;
    }

    setStepIndex((index) => index + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const valid = await form.trigger();
    if (!valid) {
      setSubmitting(false);
      setError("Check the highlighted fields before saving.");
      return;
    }

    const payload = formDataToNewProfessional(form.getValues());
    const result = await createProfessional(payload);
    setSubmitting(false);

    if (result.ok) {
      toast.success(`${payload.name} added to your directory`);
      onOpenChange(false);
      router.refresh();
      return;
    }

    setError("Couldn't save this contact. Check your connection and try again.");
  }

  function handleBack() {
    setError(null);
    if (stepIndex > 0) setStepIndex((index) => index - 1);
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen && submitting) return;
    onOpenChange(nextOpen);
  }

  if (!open) {
    return null;
  }

  return (
    <PhoneSheet open={open} onOpenChange={handleClose}>
      {/*
        Phone: full-screen bottom sheet — slide-up animation via
        PhoneSheet. The wizard provides its own back/forward chrome,
        so we hide the default close button and grab handle.
        Desktop: centered dialog up to 1040px wide.
      */}
      <PhoneSheetContent
        hideClose
        showHandle={false}
        desktopMaxWidth="sm:max-w-[min(1040px,calc(100%-2rem))]"
        className="p-0 gap-0 overflow-hidden border-[var(--val-border-subtle)] sm:rounded-2xl"
      >
        <PhoneSheetTitle className="sr-only">Add professional</PhoneSheetTitle>

        <div className="flex min-h-0 flex-1 sm:min-h-[640px] sm:max-h-[88vh]">
          {/* Left rail — hidden on phone, condensed progress shown in right body */}
          <div className="hidden sm:flex w-[240px] shrink-0 flex-col border-r border-[var(--val-border-subtle)] bg-val-bg-page-alt overflow-y-auto">
            <div className="px-6 pt-8 pb-6 border-b border-[var(--val-border-subtle)]">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-lg bg-white border border-[var(--val-border-subtle)] flex items-center justify-center">
                  <Sparkles className="size-3.5 text-[var(--val-primary-dark)]" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Directory
                </p>
              </div>
              <h2 className="text-[17px] font-bold text-val-heading leading-snug tracking-tight">
                Add professional
              </h2>
              <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                Build your trusted network of property service providers.
              </p>
            </div>

            <div className="px-6 pt-6 pb-8 flex-1">
              <WizardProgress steps={progressSteps} />
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
            {/* Progress bar */}
            <div className="h-0.5 bg-[var(--val-border-subtle)] shrink-0">
              <div
                className="h-full bg-[var(--val-primary-dark)] transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="px-5 sm:px-10 pt-5 sm:pt-8 pb-5 sm:pb-6 border-b border-[var(--val-border-subtle)] shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2 tabular-nums">
                Step {stepIndex + 1} of {ADD_PROFESSIONAL_STEPS.length}
              </p>
              <h3 className="text-[18px] sm:text-[24px] font-bold text-val-heading leading-tight tracking-tight">
                {currentStep.title}
              </h3>
              <p className="text-[14px] text-slate-500 mt-2 leading-relaxed">
                {currentStep.description}
              </p>
              {/* Phone-only step progress bar */}
              <div className="sm:hidden mt-4 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--val-primary-dark)] rounded-full transition-all duration-500"
                  style={{
                    width: `${((stepIndex + 1) / ADD_PROFESSIONAL_STEPS.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-10 py-5 sm:py-8">
              {error && (
                <div
                  role="alert"
                  className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-red-700 leading-snug">
                      Something needs fixing
                    </p>
                    <p className="text-[12px] text-red-600 mt-0.5 leading-snug">
                      {error}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="shrink-0 text-red-400 hover:text-red-600 transition-colors mt-0.5"
                    aria-label="Dismiss error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div
                key={currentStep.key}
                className="animate-[fade-slide-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
              >
                {currentStep.key === "details" && <DetailsStep form={form} />}
                {currentStep.key === "contact" && <ContactStep form={form} />}
                {currentStep.key === "properties" && (
                  <PropertiesStep form={form} />
                )}
                {currentStep.key === "review" && <ReviewStep form={form} />}
              </div>
            </div>

            <div className="px-5 sm:px-10 py-4 sm:py-5 pb-safe sm:pb-5 border-t border-[var(--val-border-subtle)] flex items-center justify-between shrink-0 bg-val-bg-page-alt/30">
              <button
                type="button"
                onClick={handleBack}
                disabled={isFirstStep || submitting}
                className="px-4 py-2 text-[13px] font-semibold text-slate-500 hover:text-val-heading disabled:opacity-30 disabled:pointer-events-none transition-colors duration-150"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                className="px-7 py-2.5 text-[14px] font-semibold text-white rounded-xl flex items-center gap-2 disabled:opacity-60 disabled:pointer-events-none transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
                style={GRADIENT_STYLE}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : isLastStep ? (
                  "Add to directory"
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </div>
        </div>
      </PhoneSheetContent>
    </PhoneSheet>
  );
}
