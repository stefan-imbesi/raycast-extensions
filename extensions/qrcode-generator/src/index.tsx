import { Action, ActionPanel, Form, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import fs from "fs";
import QRCode from "qrcode";
import { useState } from "react";
import {
  buildQrOptions,
  buildSvgOptions,
  COLOR_PRESETS,
  CUSTOM_COLOR_VALUE,
  DEFAULT_COLOR,
  isLowContrast,
  isValidHexColor,
} from "./config";
import { appendUtmParams, isHttpUrl, shortenUrl } from "./url";
import { copyQRCodeToClipboard, generateQRCode, getQRCodePath, QRCodeView } from "./utils";

type FormatValue = "png" | "svg" | "png-bg";

interface FormValues {
  url: string;
  inline: boolean;
  copy?: boolean;
  format: FormatValue;
  color: string;
  customColor: string;
  shorten: boolean;
  utmEnabled: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
}

interface Preferences {
  Index: {
    primaryAction: "save" | "inline" | "copy";
    defaultColor?: string;
  };
}

export default function Command() {
  const { primaryAction, defaultColor } = getPreferenceValues<Preferences["Index"]>();
  const [qrData, setQrData] = useState<string>();

  const initialColor = isValidHexColor(defaultColor) ? defaultColor : DEFAULT_COLOR;
  const matchedPreset = COLOR_PRESETS.find((preset) => preset.value.toLowerCase() === initialColor.toLowerCase());

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: {
      color: matchedPreset ? matchedPreset.value : CUSTOM_COLOR_VALUE,
      customColor: initialColor,
    },
    async onSubmit(values) {
      const color = resolveColor(values);

      if (isLowContrast(color)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Low contrast color",
          message: "This color may be hard to scan against a light background.",
        });
      }

      const url = await prepareUrl(values);

      if (values.inline) {
        try {
          const qrData = await generateQRCode({
            URL: url,
            format: values.format === "png-bg" ? "png" : values.format,
            preview: values.format === "png-bg",
            color,
          });
          if (!qrData) {
            throw new Error("Failed to generate QR code");
          }
          setQrData(qrData);
        } catch (error) {
          await showFailureToast(error, { title: "Failed to generate QR code" });
        }
      } else if (values.copy) {
        await copyQRCodeToClipboard({ url, format: values.format, color });
      } else {
        try {
          const path = getQRCodePath(url, "png");
          if (values.format === "svg") {
            const svg = await QRCode.toString(url, { type: "svg", ...buildSvgOptions({ color }) });
            const svgPath = path.replace(/\.png$/, ".svg");
            fs.writeFileSync(svgPath, svg);
            showToast(Toast.Style.Success, "QRCode saved", `You can find it here: ${svgPath}`);
            open(svgPath);
          } else {
            await QRCode.toFile(path, url, buildQrOptions({ color, preview: values.format === "png-bg" }));
            showToast(Toast.Style.Success, "QRCode saved", `You can find it here: ${path}`);
            open(path);
          }
        } catch (error) {
          await showFailureToast(error, { title: "Failed to save QR code" });
        }
      }
    },
    validation: {
      url: FormValidation.Required,
      format: FormValidation.Required,
      customColor: (value) => {
        if (values.color === CUSTOM_COLOR_VALUE && !isValidHexColor(value)) {
          return "Enter a valid hex color, e.g. #1D8348";
        }
      },
    },
  });

  function resolveColor(values: FormValues): string {
    if (values.color === CUSTOM_COLOR_VALUE) {
      return isValidHexColor(values.customColor) ? values.customColor.trim() : DEFAULT_COLOR;
    }
    return values.color;
  }

  async function prepareUrl(values: FormValues): Promise<string> {
    let url = values.url;

    if (values.utmEnabled) {
      url = appendUtmParams(url, {
        source: values.utmSource,
        medium: values.utmMedium,
        campaign: values.utmCampaign,
        term: values.utmTerm,
        content: values.utmContent,
      });
    }

    if (values.shorten) {
      if (!isHttpUrl(url)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot shorten",
          message: "Only http(s) links can be shortened.",
        });
      } else {
        try {
          await showToast({ style: Toast.Style.Animated, title: "Shortening link..." });
          url = await shortenUrl(url);
        } catch (error) {
          await showFailureToast(error, { title: "Failed to shorten link" });
        }
      }
    }

    return url;
  }

  const renderActions = () => {
    const saveAction = (
      <Action.SubmitForm
        title="Generate and Save"
        onSubmit={(values) => {
          handleSubmit({ ...values, inline: false } as FormValues);
        }}
      />
    );

    const showAction = (
      <Action.SubmitForm
        title="Generate and Show"
        onSubmit={(values) => {
          handleSubmit({ ...values, inline: true } as FormValues);
        }}
      />
    );

    const copyAction = (
      <Action.SubmitForm
        title="Generate and Copy to Clipboard"
        onSubmit={(values) => {
          handleSubmit({ ...values, inline: false, copy: true } as FormValues);
        }}
      />
    );

    if (primaryAction === "save") {
      return (
        <>
          {saveAction}
          {showAction}
          {copyAction}
        </>
      );
    } else if (primaryAction === "copy") {
      return (
        <>
          {copyAction}
          {saveAction}
          {showAction}
        </>
      );
    } else {
      return (
        <>
          {showAction}
          {saveAction}
          {copyAction}
        </>
      );
    }
  };

  if (qrData) {
    return <QRCodeView qrData={qrData} height={350} onBack={() => setQrData(undefined)} />;
  }

  return (
    <Form actions={<ActionPanel>{renderActions()}</ActionPanel>}>
      <Form.TextField title="URL or Content" placeholder="https://google.com" {...itemProps.url} />
      <Form.Dropdown
        id="format"
        title="Format"
        storeValue
        value={itemProps.format.value}
        onChange={(value) => itemProps.format.onChange?.(value as FormatValue)}
      >
        <Form.Dropdown.Item value="png" title="PNG (Transparent)" />
        <Form.Dropdown.Item value="png-bg" title="PNG (w/BG)" />
        <Form.Dropdown.Item value="svg" title="SVG" />
      </Form.Dropdown>
      <Form.Dropdown title="QR Color" storeValue {...itemProps.color}>
        {COLOR_PRESETS.map((preset) => (
          <Form.Dropdown.Item key={preset.value} value={preset.value} title={preset.title} />
        ))}
        <Form.Dropdown.Item value={CUSTOM_COLOR_VALUE} title="Custom…" />
      </Form.Dropdown>
      {values.color === CUSTOM_COLOR_VALUE && (
        <Form.TextField title="Custom Color (Hex)" placeholder="#1D8348" {...itemProps.customColor} />
      )}
      <Form.Checkbox
        label="Shorten link (is.gd)"
        {...itemProps.shorten}
        info="Sends the URL to is.gd to create a short link."
      />
      <Form.Separator />
      <Form.Checkbox label="Add tracking parameters (UTM)" {...itemProps.utmEnabled} />
      {values.utmEnabled && (
        <>
          <Form.Description text="UTM parameters are appended to http(s) URLs for campaign tracking." />
          <Form.TextField title="utm_source" placeholder="newsletter" {...itemProps.utmSource} />
          <Form.TextField title="utm_medium" placeholder="email" {...itemProps.utmMedium} />
          <Form.TextField title="utm_campaign" placeholder="spring_sale" {...itemProps.utmCampaign} />
          <Form.TextField title="utm_term" placeholder="running+shoes" {...itemProps.utmTerm} />
          <Form.TextField title="utm_content" placeholder="logolink" {...itemProps.utmContent} />
        </>
      )}
    </Form>
  );
}
