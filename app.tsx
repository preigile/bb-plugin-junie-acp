import { definePluginApp } from "@get-bb/plugin-sdk/app";

function JunieIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M28 8h8v22a12 12 0 0 1-12 12 12 12 0 0 1-12-12h8a4 4 0 0 0 8 0z" />
    </svg>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_providerIcon({ providerId: "acp-junie", icon: JunieIcon });
});
