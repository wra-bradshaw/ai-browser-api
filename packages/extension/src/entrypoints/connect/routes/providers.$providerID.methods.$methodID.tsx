import { createFileRoute } from "@tanstack/react-router";
import { ConnectProviderMethodPage } from "@/popup/features/providers/connect-provider-window";
import { resolveMethodRouteRedirect } from "@/popup/features/providers/connect-provider-route";
import { runConnectRouteGuard } from "./-connect-route-guards";

export const Route = createFileRoute("/providers/$providerID/methods/$methodID")(
  {
    staticData: {
      title: "Connect Provider",
    },
    beforeLoad: ({ params }) =>
      runConnectRouteGuard(params.providerID, (flow) =>
        resolveMethodRouteRedirect({
          routeMethodID: params.methodID,
          flow,
        }),
      ),
    component: ProviderMethodRoute,
  },
);

function ProviderMethodRoute() {
  const { methodID, providerID } = Route.useParams();

  return (
    <ConnectProviderMethodPage providerID={providerID} methodID={methodID} />
  );
}
