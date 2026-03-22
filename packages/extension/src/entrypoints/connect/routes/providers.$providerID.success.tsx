import { createFileRoute } from "@tanstack/react-router";
import { ConnectProviderSuccessPage } from "@/popup/features/providers/connect-provider-window";
import { resolveSuccessRouteRedirect } from "@/popup/features/providers/connect-provider-route";
import { runConnectRouteGuard } from "./-connect-route-guards";

export const Route = createFileRoute("/providers/$providerID/success")({
  staticData: {
    title: "Connect Provider",
  },
  beforeLoad: ({ params }) =>
    runConnectRouteGuard(params.providerID, (flow) =>
      resolveSuccessRouteRedirect({
        flow,
      }),
    ),
  component: ProviderSuccessRoute,
});

function ProviderSuccessRoute() {
  const { providerID } = Route.useParams();

  return <ConnectProviderSuccessPage providerID={providerID} />;
}
