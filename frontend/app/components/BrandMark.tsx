import type { SVGProps } from "react";

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect width="64" height="64" rx="16" fill="#04100B" />
      <path
        d="M16 44L27 33L35 41L49 20"
        stroke="#16C784"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M38 20H49V31"
        stroke="#F5B84B"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 49H51"
        stroke="#EAFBF2"
        strokeWidth="4"
        strokeLinecap="round"
        opacity=".82"
      />
    </svg>
  );
}
