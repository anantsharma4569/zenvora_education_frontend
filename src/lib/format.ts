// Display helpers shared by the pages.

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** The API stores money in paise; show rupees. */
export const money = (paise: number | null | undefined) => inr.format((paise ?? 0) / 100);

/** Rupees typed in a form → paise for the API. */
export const toPaise = (rupees: string | number) => Math.round(Number(rupees) * 100);

/** Paise → a rupee string for an input. */
export const toRupees = (paise: number) => String(paise / 100);

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "2026-04-01" → "1 Apr 2026". */
export const formatDate = (d: string | null | undefined) => (d ? dateFmt.format(new Date(`${d.slice(0, 10)}T00:00:00Z`)) : "—");

/** Today in the browser's time zone, as YYYY-MM-DD. */
export const todayIso = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const GENDERS = [
	{ value: "MALE", label: "Male" },
	{ value: "FEMALE", label: "Female" },
	{ value: "OTHER", label: "Other" },
];

export const genderLabel = (g: string | null | undefined) => GENDERS.find((x) => x.value === g)?.label ?? "—";

/** "ON_LEAVE" → "On leave". */
export const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
