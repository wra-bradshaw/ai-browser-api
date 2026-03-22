import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  staticData: {
    title: "Connect Provider",
  },
  component: RootRouteComponent,
});

function RootRouteComponent() {
  return (
    <div className="h-full w-full overflow-hidden bg-background font-sans">
      <Outlet />
    </div>
  );
}
