export function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[14px] text-foreground mb-1 block" style={{ fontWeight: 500 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
        className="w-full border border-border rounded-lg px-3 py-2 text-[14px] text-foreground bg-background focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}
