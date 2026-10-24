import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ItemPageSwitch } from "@/components/items/ItemPageSwitch";

export const Route = createFileRoute("/_items")({
  component: ItemsLayout,
});

function ItemsLayout() {
  return (
    <>
      <ItemPageSwitch />
      <Outlet />
    </>
  );
}
