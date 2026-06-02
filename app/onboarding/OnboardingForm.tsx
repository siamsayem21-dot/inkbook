"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkSlugAvailable, createStudio } from "./actions";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma",
  "Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee",
  "Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidUSPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().+]/g, "");
  return /^1?\d{10}$/.test(cleaned);
}

type SlugStatus = "idle" | "checking" | "available" | "taken";
type FieldErrors = Partial<Record<"name" | "slug" | "phone" | "city" | "state" | "form", string>>;

const inputBase =
  "w-full bg-[#0A0A0A] border rounded-lg px-4 py-2.5 text-sm text-[#E8E8E8] focus:outline-none transition-colors placeholder:text-zinc-600";
const inputNormal = "border-[#2A2A2A] focus:border-[#c9a84c]";
const inputError = "border-red-700 focus:border-red-600";

export default function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function clearField(field: keyof FieldErrors) {
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleNameChange(val: string) {
    setName(val);
    clearField("name");
    if (!slugEdited) {
      setSlug(toSlug(val));
      setSlugStatus("idle");
    }
  }

  function handleSlugChange(val: string) {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
    setSlugEdited(true);
    setSlugStatus("idle");
    clearField("slug");
  }

  async function handleSlugBlur() {
    if (!slug || slug.length < 2) return;
    setSlugStatus("checking");
    const { available } = await checkSlugAvailable(slug);
    setSlugStatus(available ? "available" : "taken");
    if (!available) {
      setErrors((e) => ({ ...e, slug: "That slug is already taken. Try another." }));
    } else {
      clearField("slug");
    }
  }

  function validate(): boolean {
    const errs: FieldErrors = {};
    const trimName = name.trim();
    if (trimName.length < 2) errs.name = "Studio name must be at least 2 characters.";
    else if (trimName.length > 50) errs.name = "Studio name must be 50 characters or less.";
    if (!slug || slug.length < 2) errs.slug = "Slug must be at least 2 characters.";
    if (slugStatus === "taken") errs.slug = "That slug is already taken. Try another.";
    if (!isValidUSPhone(phone)) errs.phone = "Enter a valid US phone number.";
    if (!city.trim()) errs.city = "City is required.";
    if (!state) errs.state = "Please select a state.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    // Re-verify slug uniqueness if not already confirmed
    if (slugStatus !== "available") {
      const { available } = await checkSlugAvailable(slug);
      if (!available) {
        setErrors((prev) => ({ ...prev, slug: "That slug is already taken. Try another." }));
        setSlugStatus("taken");
        setLoading(false);
        return;
      }
    }

    const result = await createStudio({
      name: name.trim(),
      slug,
      phone,
      city: city.trim(),
      state,
      userId,
    });

    if (result.error) {
      if (result.error.toLowerCase().includes("slug")) {
        setErrors((prev) => ({ ...prev, slug: result.error! }));
      } else {
        setErrors((prev) => ({ ...prev, form: result.error! }));
      }
      setLoading(false);
      return;
    }

    router.push("/owner/dashboard");
  }

  const slugBorderColor =
    errors.slug
      ? "border-red-700"
      : slugStatus === "available"
      ? "border-green-700"
      : "border-[#2A2A2A] focus-within:border-[#c9a84c]";

  return (
    <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-8">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-lg bg-[#c9a84c] flex items-center justify-center shrink-0">
          <span className="text-black text-xs font-black">IB</span>
        </div>
        <span className="text-[#E8E8E8] font-bold text-lg">InkBook</span>
      </div>

      {/* Progress */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            Step 1 of 1 — Studio Setup
          </span>
          <span className="text-xs text-[#c9a84c]">100%</span>
        </div>
        <div className="h-1 bg-[#1E1E1E] rounded-full overflow-hidden">
          <div className="h-full bg-[#c9a84c] rounded-full w-full" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-[#E8E8E8] mb-1">Set up your studio</h1>
      <p className="text-sm text-zinc-500 mb-7">
        Takes 60 seconds. You can change everything later.
      </p>

      {errors.form && (
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 mb-5">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {/* Studio Name */}
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">
            Studio Name <span className="text-[#c9a84c]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ink & Iron Studio"
            maxLength={50}
            className={`${inputBase} ${errors.name ? inputError : inputNormal}`}
          />
          {errors.name && (
            <p className="text-red-400 text-xs mt-1.5">{errors.name}</p>
          )}
        </div>

        {/* Slug */}
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">
            Booking URL <span className="text-[#c9a84c]">*</span>
          </label>
          <div
            className={`flex items-center bg-[#0A0A0A] border rounded-lg overflow-hidden transition-colors ${slugBorderColor}`}
          >
            <span className="pl-4 text-sm text-zinc-600 select-none shrink-0 whitespace-nowrap">
              inkbook.tech/book/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              onBlur={handleSlugBlur}
              placeholder="ink-iron-studio"
              className="flex-1 bg-transparent py-2.5 pr-2 text-sm text-[#E8E8E8] focus:outline-none placeholder:text-zinc-600 min-w-0"
            />
            {slugStatus === "checking" && (
              <span className="pr-3 text-xs text-zinc-500 shrink-0">checking…</span>
            )}
            {slugStatus === "available" && (
              <span className="pr-3 text-xs text-green-500 shrink-0">available</span>
            )}
            {slugStatus === "taken" && (
              <span className="pr-3 text-xs text-red-400 shrink-0">taken</span>
            )}
          </div>
          <p className="text-xs text-zinc-600 mt-1.5">
            Lowercase letters, numbers, hyphens only.
          </p>
          {errors.slug && (
            <p className="text-red-400 text-xs mt-1">{errors.slug}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">
            Phone <span className="text-[#c9a84c]">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); clearField("phone"); }}
            placeholder="(555) 555-5555"
            className={`${inputBase} ${errors.phone ? inputError : inputNormal}`}
          />
          {errors.phone && (
            <p className="text-red-400 text-xs mt-1.5">{errors.phone}</p>
          )}
        </div>

        {/* City + State */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-zinc-400 block mb-1.5">
              City <span className="text-[#c9a84c]">*</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => { setCity(e.target.value); clearField("city"); }}
              placeholder="Los Angeles"
              className={`${inputBase} ${errors.city ? inputError : inputNormal}`}
            />
            {errors.city && (
              <p className="text-red-400 text-xs mt-1.5">{errors.city}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-zinc-400 block mb-1.5">
              State <span className="text-[#c9a84c]">*</span>
            </label>
            <select
              value={state}
              onChange={(e) => { setState(e.target.value); clearField("state"); }}
              className={`${inputBase} ${errors.state ? inputError : inputNormal} ${!state ? "text-zinc-600" : ""}`}
            >
              <option value="">Select…</option>
              {US_STATES.map((s) => (
                <option key={s} value={s} className="text-[#E8E8E8] bg-[#111]">
                  {s}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="text-red-400 text-xs mt-1.5">{errors.state}</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || slugStatus === "taken"}
          className="w-full bg-[#c9a84c] text-black font-bold py-3 rounded-lg hover:bg-[#a8832e] transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Creating…
            </>
          ) : (
            "Create My Studio →"
          )}
        </button>
      </form>
    </div>
  );
}
