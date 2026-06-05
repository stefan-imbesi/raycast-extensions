import { Action, ActionPanel, Detail, showToast, Toast, Clipboard } from "@raycast/api";
import { homedir } from "os";
import QRCode from "qrcode";
import { buildQrOptions, buildSvgOptions, DEFAULT_COLOR } from "./config";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import os from "os";
import path from "path";

export async function generateQRCode(options: {
  URL?: string;
  format?: "png" | "svg";
  preview?: boolean;
  color?: string;
}) {
  const { URL, format = "png", preview = false, color = DEFAULT_COLOR } = options;
  await showToast({
    title: "Generating",
    message: "Generating QR Code...",
    style: Toast.Style.Animated,
  });

  if (URL === undefined) {
    await showFailureToast(new Error("URL is undefined"), { title: "An error occurred" });
    return;
  }

  try {
    let result;
    if (format === "svg") {
      const svg = await QRCode.toString(URL, {
        type: "svg",
        ...buildSvgOptions({ color }),
      });
      result = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    } else {
      result = await QRCode.toDataURL(URL, buildQrOptions({ color, preview }));
    }
    await showToast({
      title: "Generated successfully!",
      style: Toast.Style.Success,
    });
    return result;
  } catch (error) {
    await showFailureToast(error, { title: "Failed to generate QR code" });
    throw error;
  }
}

export function QRCodeView({ qrData, height, onBack }: { qrData: string; height: number; onBack: () => void }) {
  return (
    <Detail
      isLoading={!qrData}
      markdown={`![qrcode](${qrData}?raycast-height=${height})`}
      actions={
        <ActionPanel>
          <Action title="Edit QR Code" onAction={onBack} />
        </ActionPanel>
      }
    />
  );
}

export const getQRCodePath = (qrcodeUrl: string, format: "png" | "svg" = "png") => {
  const match = qrcodeUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)/gm);
  if (!match) {
    throw new Error("Invalid URL format");
  }

  const filename = String(match).replace(/^(?:https?:\/\/)?/gm, "");
  return `${homedir()}/Downloads/qrcode-${filename}.${format}`;
};

export async function copyQRCodeToClipboard(options: {
  url: string;
  format: "png" | "svg" | "png-bg";
  color?: string;
}): Promise<void> {
  const { url, format, color = DEFAULT_COLOR } = options;

  try {
    if (format === "svg") {
      const svg = await QRCode.toString(url, {
        type: "svg",
        ...buildSvgOptions({ color }),
      });
      const fileName = `qrcode-${Date.now()}.svg`;
      const filePath = path.join(os.tmpdir(), fileName);
      fs.writeFileSync(filePath, svg, "utf-8");
      await Clipboard.copy({ file: filePath });
      await showToast(Toast.Style.Success, "QR Code copied to clipboard");
    } else {
      const fileName = `qrcode-${Date.now()}.png`;
      const filePath = path.join(os.tmpdir(), fileName);
      await QRCode.toFile(filePath, url, buildQrOptions({ color, preview: format === "png-bg" }));
      await Clipboard.copy({ file: filePath });
      await showToast(Toast.Style.Success, "QR Code copied to clipboard");
    }
  } catch (error) {
    await showFailureToast(error, { title: "Failed to copy QR code" });
    throw error;
  }
}
