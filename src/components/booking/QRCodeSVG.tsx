"use client";
import { QRCodeSVG as EncodedQRCode } from "qrcode.react";
export default function QRCodeSVG({ value, className = "w-44 h-44" }: { value: string; className?: string }) {
  return <EncodedQRCode value={value} className={className} level="M" marginSize={4} title="Ticket verification code" />;
}
