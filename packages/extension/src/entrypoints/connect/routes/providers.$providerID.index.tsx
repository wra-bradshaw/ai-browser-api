import { createFileRoute } from "@tanstack/react-router";
import { ConnectProviderChooserPage } from "@/popup/features/providers/connect-provider-window";
import { resolveChooserRouteRedirect } from "@/popup/features/providers/connect-provider-route";
import { runConnectRouteGuard } from "./-connect-route-guards";

export const Route = createFileRoute("/providers/$providerID/")({
  staticData: {
    title: "Connect Provider",
  },
  beforeLoad: ({ params }) =>
    runConnectRouteGuard(params.providerID, (flow) =>
      resolveChooserRouteRedirect({
        flow,
      }),
    ),
  component: ProviderChooserRoute,
});

function ProviderChooserRoute() {
  const { providerID } = Route.useParams();

  return <ConnectProviderChooserPage providerID={providerID} />;
}
