import { useEffect, useState } from "react";
import { isExtensionAvailable } from "../lib/extension-bridge";

export type ExtensionStatus = "checking" | "connected" | "unavailable";

export function useExtensionStatus(): ExtensionStatus {
  const [status, setStatus] = useState<ExtensionStatus>("checking");

  useEffect(() => {
    isExtensionAvailable()
      .then((ok) => setStatus(ok ? "connected" : "unavailable"))
      .catch(() => setStatus("unavailable"));
  }, []);

  return status;
}
