"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Phone, Search } from "lucide-react";

type CountryCode = {
  name: string;
  code: string;
  iso: string;
};

const COUNTRY_CODES: CountryCode[] = [
  { name: "Afghanistan", code: "+93", iso: "AF" },
  { name: "Albania", code: "+355", iso: "AL" },
  { name: "Algeria", code: "+213", iso: "DZ" },
  { name: "Andorra", code: "+376", iso: "AD" },
  { name: "Angola", code: "+244", iso: "AO" },
  { name: "Argentina", code: "+54", iso: "AR" },
  { name: "Armenia", code: "+374", iso: "AM" },
  { name: "Australia", code: "+61", iso: "AU" },
  { name: "Austria", code: "+43", iso: "AT" },
  { name: "Azerbaijan", code: "+994", iso: "AZ" },
  { name: "Bahamas", code: "+1", iso: "BS" },
  { name: "Bahrain", code: "+973", iso: "BH" },
  { name: "Bangladesh", code: "+880", iso: "BD" },
  { name: "Barbados", code: "+1", iso: "BB" },
  { name: "Belarus", code: "+375", iso: "BY" },
  { name: "Belgium", code: "+32", iso: "BE" },
  { name: "Belize", code: "+501", iso: "BZ" },
  { name: "Benin", code: "+229", iso: "BJ" },
  { name: "Bolivia", code: "+591", iso: "BO" },
  { name: "Bosnia and Herzegovina", code: "+387", iso: "BA" },
  { name: "Botswana", code: "+267", iso: "BW" },
  { name: "Brazil", code: "+55", iso: "BR" },
  { name: "Bulgaria", code: "+359", iso: "BG" },
  { name: "Burkina Faso", code: "+226", iso: "BF" },
  { name: "Burundi", code: "+257", iso: "BI" },
  { name: "Cambodia", code: "+855", iso: "KH" },
  { name: "Cameroon", code: "+237", iso: "CM" },
  { name: "Canada", code: "+1", iso: "CA" },
  { name: "Chad", code: "+235", iso: "TD" },
  { name: "Chile", code: "+56", iso: "CL" },
  { name: "China", code: "+86", iso: "CN" },
  { name: "Colombia", code: "+57", iso: "CO" },
  { name: "Congo", code: "+242", iso: "CG" },
  { name: "Costa Rica", code: "+506", iso: "CR" },
  { name: "Croatia", code: "+385", iso: "HR" },
  { name: "Cuba", code: "+53", iso: "CU" },
  { name: "Cyprus", code: "+357", iso: "CY" },
  { name: "Czech Republic", code: "+420", iso: "CZ" },
  { name: "Denmark", code: "+45", iso: "DK" },
  { name: "Dominican Republic", code: "+1", iso: "DO" },
  { name: "Ecuador", code: "+593", iso: "EC" },
  { name: "Egypt", code: "+20", iso: "EG" },
  { name: "El Salvador", code: "+503", iso: "SV" },
  { name: "Estonia", code: "+372", iso: "EE" },
  { name: "Ethiopia", code: "+251", iso: "ET" },
  { name: "Finland", code: "+358", iso: "FI" },
  { name: "France", code: "+33", iso: "FR" },
  { name: "Gabon", code: "+241", iso: "GA" },
  { name: "Gambia", code: "+220", iso: "GM" },
  { name: "Georgia", code: "+995", iso: "GE" },
  { name: "Germany", code: "+49", iso: "DE" },
  { name: "Ghana", code: "+233", iso: "GH" },
  { name: "Greece", code: "+30", iso: "GR" },
  { name: "Guatemala", code: "+502", iso: "GT" },
  { name: "Guinea", code: "+224", iso: "GN" },
  { name: "Haiti", code: "+509", iso: "HT" },
  { name: "Honduras", code: "+504", iso: "HN" },
  { name: "Hong Kong", code: "+852", iso: "HK" },
  { name: "Hungary", code: "+36", iso: "HU" },
  { name: "Iceland", code: "+354", iso: "IS" },
  { name: "India", code: "+91", iso: "IN" },
  { name: "Indonesia", code: "+62", iso: "ID" },
  { name: "Iran", code: "+98", iso: "IR" },
  { name: "Iraq", code: "+964", iso: "IQ" },
  { name: "Ireland", code: "+353", iso: "IE" },
  { name: "Israel", code: "+972", iso: "IL" },
  { name: "Italy", code: "+39", iso: "IT" },
  { name: "Ivory Coast", code: "+225", iso: "CI" },
  { name: "Jamaica", code: "+1", iso: "JM" },
  { name: "Japan", code: "+81", iso: "JP" },
  { name: "Jordan", code: "+962", iso: "JO" },
  { name: "Kazakhstan", code: "+7", iso: "KZ" },
  { name: "Kenya", code: "+254", iso: "KE" },
  { name: "Kuwait", code: "+965", iso: "KW" },
  { name: "Kyrgyzstan", code: "+996", iso: "KG" },
  { name: "Laos", code: "+856", iso: "LA" },
  { name: "Latvia", code: "+371", iso: "LV" },
  { name: "Lebanon", code: "+961", iso: "LB" },
  { name: "Lesotho", code: "+266", iso: "LS" },
  { name: "Liberia", code: "+231", iso: "LR" },
  { name: "Libya", code: "+218", iso: "LY" },
  { name: "Lithuania", code: "+370", iso: "LT" },
  { name: "Luxembourg", code: "+352", iso: "LU" },
  { name: "Madagascar", code: "+261", iso: "MG" },
  { name: "Malawi", code: "+265", iso: "MW" },
  { name: "Malaysia", code: "+60", iso: "MY" },
  { name: "Mali", code: "+223", iso: "ML" },
  { name: "Malta", code: "+356", iso: "MT" },
  { name: "Mauritania", code: "+222", iso: "MR" },
  { name: "Mauritius", code: "+230", iso: "MU" },
  { name: "Mexico", code: "+52", iso: "MX" },
  { name: "Moldova", code: "+373", iso: "MD" },
  { name: "Mongolia", code: "+976", iso: "MN" },
  { name: "Montenegro", code: "+382", iso: "ME" },
  { name: "Morocco", code: "+212", iso: "MA" },
  { name: "Mozambique", code: "+258", iso: "MZ" },
  { name: "Myanmar", code: "+95", iso: "MM" },
  { name: "Namibia", code: "+264", iso: "NA" },
  { name: "Nepal", code: "+977", iso: "NP" },
  { name: "Netherlands", code: "+31", iso: "NL" },
  { name: "New Zealand", code: "+64", iso: "NZ" },
  { name: "Nicaragua", code: "+505", iso: "NI" },
  { name: "Niger", code: "+227", iso: "NE" },
  { name: "Nigeria", code: "+234", iso: "NG" },
  { name: "North Macedonia", code: "+389", iso: "MK" },
  { name: "Norway", code: "+47", iso: "NO" },
  { name: "Oman", code: "+968", iso: "OM" },
  { name: "Pakistan", code: "+92", iso: "PK" },
  { name: "Panama", code: "+507", iso: "PA" },
  { name: "Paraguay", code: "+595", iso: "PY" },
  { name: "Peru", code: "+51", iso: "PE" },
  { name: "Philippines", code: "+63", iso: "PH" },
  { name: "Poland", code: "+48", iso: "PL" },
  { name: "Portugal", code: "+351", iso: "PT" },
  { name: "Qatar", code: "+974", iso: "QA" },
  { name: "Romania", code: "+40", iso: "RO" },
  { name: "Russia", code: "+7", iso: "RU" },
  { name: "Rwanda", code: "+250", iso: "RW" },
  { name: "Saudi Arabia", code: "+966", iso: "SA" },
  { name: "Senegal", code: "+221", iso: "SN" },
  { name: "Serbia", code: "+381", iso: "RS" },
  { name: "Sierra Leone", code: "+232", iso: "SL" },
  { name: "Singapore", code: "+65", iso: "SG" },
  { name: "Slovakia", code: "+421", iso: "SK" },
  { name: "Slovenia", code: "+386", iso: "SI" },
  { name: "Somalia", code: "+252", iso: "SO" },
  { name: "South Africa", code: "+27", iso: "ZA" },
  { name: "South Korea", code: "+82", iso: "KR" },
  { name: "South Sudan", code: "+211", iso: "SS" },
  { name: "Spain", code: "+34", iso: "ES" },
  { name: "Sri Lanka", code: "+94", iso: "LK" },
  { name: "Sudan", code: "+249", iso: "SD" },
  { name: "Sweden", code: "+46", iso: "SE" },
  { name: "Switzerland", code: "+41", iso: "CH" },
  { name: "Syria", code: "+963", iso: "SY" },
  { name: "Taiwan", code: "+886", iso: "TW" },
  { name: "Tanzania", code: "+255", iso: "TZ" },
  { name: "Thailand", code: "+66", iso: "TH" },
  { name: "Togo", code: "+228", iso: "TG" },
  { name: "Tunisia", code: "+216", iso: "TN" },
  { name: "Turkey", code: "+90", iso: "TR" },
  { name: "Uganda", code: "+256", iso: "UG" },
  { name: "Ukraine", code: "+380", iso: "UA" },
  { name: "United Arab Emirates", code: "+971", iso: "AE" },
  { name: "United Kingdom", code: "+44", iso: "GB" },
  { name: "United States", code: "+1", iso: "US" },
  { name: "Uruguay", code: "+598", iso: "UY" },
  { name: "Uzbekistan", code: "+998", iso: "UZ" },
  { name: "Venezuela", code: "+58", iso: "VE" },
  { name: "Vietnam", code: "+84", iso: "VN" },
  { name: "Yemen", code: "+967", iso: "YE" },
  { name: "Zambia", code: "+260", iso: "ZM" },
  { name: "Zimbabwe", code: "+263", iso: "ZW" },
];

function localPart(value: string, countryCode: string) {
  const cleaned = value.trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith(countryCode)) return cleaned.slice(countryCode.length);
  if (cleaned.startsWith("+")) return cleaned.replace(/^\+\d{1,4}/, "");
  return cleaned.replace(/^0+/, "");
}

export default function PhoneNumberInput({
  value,
  onChange,
  defaultIso = "UG",
}: {
  value: string;
  onChange: (value: string) => void;
  defaultIso?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(
    COUNTRY_CODES.find((country) => country.iso === defaultIso) ?? COUNTRY_CODES[0],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return COUNTRY_CODES;
    return COUNTRY_CODES.filter((country) => {
      return (
        country.name.toLowerCase().includes(normalized) ||
        country.iso.toLowerCase().includes(normalized) ||
        country.code.includes(normalized)
      );
    });
  }, [query]);

  const local = localPart(value, selected.code);

  const updateSelected = (country: CountryCode) => {
    setSelected(country);
    setOpen(false);
    setQuery("");
    onChange(`${country.code}${localPart(value, country.code)}`);
  };

  return (
    <div className="relative rounded-xl border border-card-border bg-card/60 p-3">
      <div className="flex items-center">
        <Phone className="h-4 w-4 text-foreground/45 shrink-0 mr-3" />
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="mr-3 flex min-w-[5.25rem] items-center justify-between gap-2 rounded-lg border border-card-border bg-background/30 px-2.5 py-2 text-left text-xs font-bold text-white"
        >
          <span>{selected.iso}</span>
          <span className="text-foreground/60">{selected.code}</span>
          <ChevronDown className="h-3.5 w-3.5 text-foreground/45" />
        </button>
        <input
          type="tel"
          inputMode="tel"
          required
          value={local}
          onChange={(event) => {
            const nextLocal = event.target.value.replace(/[^\d]/g, "");
            onChange(nextLocal ? `${selected.code}${nextLocal}` : "");
          }}
          placeholder="77123..."
          className="bg-transparent border-0 text-white placeholder-foreground/25 focus:outline-none focus:ring-0 w-full text-base font-medium sm:text-sm"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-hidden rounded-xl border border-card-border bg-background shadow-xl">
          <div className="flex items-center border-b border-card-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-foreground/45" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country or code"
              className="ml-2 w-full bg-transparent text-sm text-white placeholder-foreground/35 outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((country) => (
              <button
                key={`${country.iso}-${country.name}`}
                type="button"
                onClick={() => updateSelected(country)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground/80 hover:bg-card"
              >
                <span className="min-w-0 truncate">{country.name}</span>
                <span className="ml-3 shrink-0 font-bold text-white">{country.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-foreground/50">No country found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
