"use client";
import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import type { InventoryItem } from "@/lib/types";

export function BarcodeLabel({ item }: { item: InventoryItem }) {
  const ref = useRef<SVGSVGElement>(null);
  const [settings, setSettings] = useState({
    store_name: "Narciso Geronimo Jewelry",
    label_show_karat: true,
    label_show_grams: true,
  });
  useEffect(() => {
    if (ref.current)
      JsBarcode(ref.current, item.barcode, {
        format: "CODE128",
        width: 2.3,
        height: 72,
        displayValue: false,
        margin: 0,
      });
  }, [item.barcode]);
  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => data.settings && setSettings(data.settings))
      .catch(() => {});
  }, []);
  return (
    <div className="print-label">
      <p>{settings.store_name.toUpperCase()}</p>
      <strong>{item.barcode}</strong>
      <svg ref={ref} />
      {(settings.label_show_karat || settings.label_show_grams) && (
        <span>
          {settings.label_show_karat && item.karat}
          {settings.label_show_karat && settings.label_show_grams && " · "}
          {settings.label_show_grams && `${Number(item.grams).toFixed(2)} g`}
        </span>
      )}
    </div>
  );
}
