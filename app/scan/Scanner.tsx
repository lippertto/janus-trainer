'use client';
import React from 'react';

import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';
import { type QrcodeSuccessCallback } from 'html5-qrcode/core';

import { useDebouncedCallback } from 'use-debounce';

// stolen from source code of https://blog.minhazav.dev/research/html5-qrcode.html
function qrboxFunction(viewfinderWidth: number, viewfinderHeight: number) {
  // Square QR Box, with size = 80% of the min edge.
  const minEdgeSizeThreshold = 250;
  const edgeSizePercentage = 0.75;
  const minEdgeSize =
    viewfinderWidth > viewfinderHeight ? viewfinderHeight : viewfinderWidth;
  const qrboxEdgeSize = Math.floor(minEdgeSize * edgeSizePercentage);
  if (qrboxEdgeSize < minEdgeSizeThreshold) {
    if (minEdgeSize < minEdgeSizeThreshold) {
      return { width: minEdgeSize, height: minEdgeSize };
    } else {
      return {
        width: minEdgeSizeThreshold,
        height: minEdgeSizeThreshold,
      };
    }
  }
  return { width: qrboxEdgeSize, height: qrboxEdgeSize };
}

const QRCODE_REGION_ID = 'html5-qrcode-region-id';

const QR_SCAN_CONFIG = {
  fps: 2,
  rememberLastUsedCamera: true,
  supportedScanTypes: [0], // Html5QrcodeScanType.SCAN_TYPE_CAMERA
  aspectRatio: 1.0,
  experimentalFeatures: {
    useBarCodeDetectorIfSupported: true,
  },
  qrbox: qrboxFunction,
  formatsToSupport: [0], // QR_CODE
};

/** The scanner is initializing asynchronously, and there is now other way of knowing if it is ready than this. */
function scannerIsReady(scanner?: Html5QrcodeScanner) {
  try {
    scanner?.getState();
    return true;
  } catch (e) {
    return false;
  }
}

type ScannerProps = {
  handleSuccess: QrcodeSuccessCallback;
  active: boolean;
};

export function Scanner({ active, handleSuccess }: ScannerProps) {
  const scanner = React.useRef<Html5QrcodeScanner | null>(null);

  const startStop = React.useCallback(() => {
    if (!scanner.current) return;
    if (!scannerIsReady(scanner.current)) return;

    if (active) {
      if (
        scanner.current.getState() === Html5QrcodeScannerState.PAUSED ||
        scanner.current.getState() === Html5QrcodeScannerState.NOT_STARTED
      ) {
        scanner.current.render(handleSuccess, undefined);
      }
    } else {
      if (scanner.current.getState() === Html5QrcodeScannerState.SCANNING) {
        scanner.current.pause();
      }
    }
  }, [active, handleSuccess]);
  const debouncedScannerStartStop = useDebouncedCallback(startStop, 100);

  debouncedScannerStartStop();

  // we initialize the scanner afterwards because the div below needs to exist in the DOM
  React.useEffect(() => {
    if (!scanner.current) {
      scanner.current = new Html5QrcodeScanner(
        QRCODE_REGION_ID,
        QR_SCAN_CONFIG,
        false,
      );
      scanner.current.render(handleSuccess, undefined);
    }
    return () => {
      scanner.current?.clear();
    };
  }, [handleSuccess]);

  return <div style={{ width: '500px' }} id={QRCODE_REGION_ID} />;
}
