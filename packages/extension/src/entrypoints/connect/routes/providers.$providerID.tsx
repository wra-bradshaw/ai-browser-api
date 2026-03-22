import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/providers/$providerID")({
  staticData: {
    title: "Connect Provider",
  },
  component: ProviderRoute,
});

function ProviderRoute() {
  return <Outlet />;
}
