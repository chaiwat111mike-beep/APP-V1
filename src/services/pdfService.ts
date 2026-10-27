import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface PdfExportOptions {
  filename?: string;
  quality?: number;
  orientation?: 'portrait' | 'landscape';
  fitToOnePage?: boolean;
}

/**
 * Helper to recursively convert any OKLCH/OKLAB colors in styles to RGB/HEX fallback
 */
function sanitizeColorsInClonedDoc(doc: Document) {
  const allElements = doc.querySelectorAll('*');
  const tempCanvas = doc.createElement('canvas');
  const ctx = tempCanvas.getContext('2d');

  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (!htmlEl.style) return;

    // Convert common color properties if they have unsupported formats
    const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor'];
    colorProps.forEach((prop) => {
      const val = htmlEl.style.getPropertyValue(prop);
      if (val && (val.includes('oklch') || val.includes('oklab'))) {
        try {
          if (ctx) {
            ctx.fillStyle = val;
            htmlEl.style.setProperty(prop, ctx.fillStyle);
          }
        } catch {
          // Ignore fallback if conversion fails
        }
      }
    });
  });
}

/**
 * Exports a DOM element to PDF directly on client-side with 1-click
 * Guaranteed exact 1-page A4 fit without accidental 2nd page overflow
 */
export const exportElementToPdf = async (
  elementId: string | HTMLElement,
  options: PdfExportOptions = {}
): Promise<boolean> => {
  const targetElement = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
  if (!targetElement) {
    console.error('PDF export target element not found:', elementId);
    return false;
  }

  const filename = options.filename || `Songkarn-Garage-Doc-${Date.now()}.pdf`;
  const fitToOnePage = options.fitToOnePage !== false; // default true for standard invoices/work orders

  // Save original styles that might affect html2canvas rendering
  const originalTransform = targetElement.style.transform;
  const originalTransition = targetElement.style.transition;
  targetElement.style.transform = 'none';
  targetElement.style.transition = 'none';

  try {
    // Generate high resolution canvas with html2canvas-pro supporting modern CSS
    const canvas = await html2canvas(targetElement, {
      scale: 2.5, // Crisp 300-DPI equivalent sharpness
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: targetElement.scrollWidth || 1024,
      onclone: (clonedDoc) => {
        sanitizeColorsInClonedDoc(clonedDoc);

        const clonedTarget = typeof elementId === 'string' 
          ? clonedDoc.getElementById(elementId) 
          : clonedDoc.body;
        if (clonedTarget) {
          clonedTarget.style.boxShadow = 'none';
          clonedTarget.style.transform = 'none';
          clonedTarget.style.transition = 'none';
          clonedTarget.style.margin = '0 auto';
        }
      }
    });

    // Restore original styles
    targetElement.style.transform = originalTransform;
    targetElement.style.transition = originalTransition;

    const imgData = canvas.toDataURL('image/png', 0.98);
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Margin: 5mm for balanced page borders
    const margin = 5;
    const availableWidth = pdfWidth - (margin * 2); // 200mm
    const availableHeight = pdfHeight - (margin * 2); // 287mm

    const widthRatio = availableWidth / canvasWidth;
    const naturalImgHeight = canvasHeight * widthRatio;

    // If fitToOnePage is requested, or height is within 18% of 1 page, fit to 1 single page!
    const shouldFitSinglePage = fitToOnePage || (naturalImgHeight <= availableHeight * 1.18);

    if (shouldFitSinglePage) {
      let renderWidth = availableWidth;
      let renderHeight = naturalImgHeight;

      if (renderHeight > availableHeight) {
        // Proportionally scale to fit inside 1 A4 page exactly
        const scaleFactor = availableHeight / renderHeight;
        renderHeight = availableHeight;
        renderWidth = availableWidth * scaleFactor;
      }

      const xOffset = margin + (availableWidth - renderWidth) / 2;
      const yOffset = margin;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');
    } else {
      // Multi-page slicing for very long itemized jobs
      let heightLeft = naturalImgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, availableWidth, naturalImgHeight, undefined, 'FAST');
      heightLeft -= availableHeight;

      while (heightLeft > 0) {
        position = heightLeft - naturalImgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, availableWidth, naturalImgHeight, undefined, 'FAST');
        heightLeft -= availableHeight;
      }
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    targetElement.style.transform = originalTransform;
    targetElement.style.transition = originalTransition;
    // Fallback to print
    printElementViaIframe(targetElement);
    return false;
  }
};

/**
 * 1-Click Print isolated element via hidden iframe with full styles and exact A4 1-page guarantee
 */
export const printElementViaIframe = (elementOrId: string | HTMLElement, title?: string): boolean => {
  try {
    const targetElement = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!targetElement) {
      window.print();
      return false;
    }

    // Capture the entire element including its classes and attributes
    const outerHtml = targetElement.outerHTML;
    
    // Remove old iframe if present
    const oldIframe = document.getElementById('print-hidden-iframe');
    if (oldIframe) {
      document.body.removeChild(oldIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.id = 'print-hidden-iframe';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return false;
    }

    // Collect all stylesheet links and style elements from parent
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'เอกสารอู่สงกรานต์ (ช่างไมค์)'}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800;900&family=Kanit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              font-family: 'Prompt', 'Kanit', system-ui, -apple-system, sans-serif !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
            }
            #printable-document-content {
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              max-height: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              transform: none !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              break-inside: avoid !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body class="bg-white text-black">
          <div style="padding: 0; margin: 0; width: 100%;">
            ${outerHtml}
          </div>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print iframe error:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 3500);
      }
    }, 450);

    return true;
  } catch (e) {
    console.error('Iframe print failure fallback:', e);
    window.print();
    return false;
  }
};
