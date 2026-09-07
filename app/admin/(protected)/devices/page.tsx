import { listDevices } from "@/lib/devices";
import { DeviceManager } from "@/components/admin/device-manager";

export default async function AdminDevicesPage() {
  const devices = await listDevices();

  if (devices === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to manage devices here.
      </div>
    );
  }

  // Already plain, serializable data (see lib/devices.ts DeviceView) — safe to
  // hand straight to the client component.
  return <DeviceManager initialDevices={devices} />;
}
