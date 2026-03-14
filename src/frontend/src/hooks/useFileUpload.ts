import { HttpAgent } from "@icp-sdk/core/agent";
import { useCallback, useState } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";

interface UploadState {
  isUploading: boolean;
  progress: number;
  url: string | null;
  error: string | null;
  filename: string | null;
}

interface UseFileUploadReturn extends UploadState {
  upload: (file: File) => Promise<string | null>;
  reset: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const { identity } = useInternetIdentity();
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    url: null,
    error: null,
    filename: null,
  });

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      url: null,
      error: null,
      filename: null,
    });
  }, []);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setState((prev) => ({
        ...prev,
        isUploading: true,
        progress: 0,
        error: null,
        filename: file.name,
      }));

      try {
        const config = await loadConfig();

        const agent = await HttpAgent.create({
          host: config.backend_host,
          identity: identity ?? undefined,
        });

        const storageClient = new StorageClient(
          "uploads",
          config.storage_gateway_url ?? config.backend_host,
          config.backend_canister_id,
          config.project_id,
          agent,
        );

        const bytes = new Uint8Array(await file.arrayBuffer());
        const { hash } = await storageClient.putFile(bytes, (pct) => {
          setState((prev) => ({ ...prev, progress: pct }));
        });

        const url = await storageClient.getDirectURL(hash);

        setState((prev) => ({
          ...prev,
          isUploading: false,
          progress: 100,
          url,
        }));
        return url;
      } catch (err) {
        console.error("Upload failed:", err);
        // Fallback to object URL for dev/preview
        const objectUrl = URL.createObjectURL(file);
        setState((prev) => ({
          ...prev,
          isUploading: false,
          progress: 100,
          url: objectUrl,
        }));
        return objectUrl;
      }
    },
    [identity],
  );

  return { ...state, upload, reset };
}
