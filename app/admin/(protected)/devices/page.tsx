import { listDevices } from "@/lib/devices";
import { getDeviceSettings } from "@/lib/device-settings";
import { DeviceManager } from "@/components/admin/device-manager";
import { DeviceSettingsPanel } from "@/components/admin/device-settings-panel";

export default async function AdminDevicesPage() {
  const [devices, settings] = await Promise.all([listDevices(), getDeviceSettings()]);

  if (devices === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to manage devices here.
      </div>
    );
  }

  // Already plain, serializable data (see lib/devices.ts DeviceView) — safe to
  // hand straight to the client component.
  return (
    <div className="flex flex-col gap-4">
      <DeviceSettingsPanel initial={settings} />
      <DeviceManager initialDevices={devices} />
    </div>
  );
}
