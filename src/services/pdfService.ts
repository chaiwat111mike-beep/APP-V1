import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface PdfExportOptions {
  filename?: string;
  quality?: number;
  orientation?: 'portrait' | 'landscape';
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

  try {
    // Generate high resolution canvas with html2canvas-pro supporting modern CSS (oklch, color-mix, etc.)
    const canvas = await html2canvas(targetElement, {
      scale: 2.5, // Crisp high-DPI rendering for print
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: targetElement.scrollWidth || 1024,
      onclone: (clonedDoc) => {
        // Sanitize any residual modern colors just in case
        sanitizeColorsInClonedDoc(clonedDoc);

        // Ensure cloned element is visible and properly styled as pure white page
        const clonedTarget = typeof elementId === 'string' 
          ? clonedDoc.getElementById(elementId) 
          : clonedDoc.body;
        if (clonedTarget) {
          clonedTarget.style.backgroundColor = '#ffffff';
          clonedTarget.style.color = '#000000';
          clonedTarget.style.boxShadow = 'none';
          clonedTarget.style.border = 'none';
        }
      }
    });

    const imgData = canvas.toDataURL('image/png', 0.98);
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate scaling to fit A4 width nicely with margins
    const margin = 5; // 5mm margin
    const contentWidth = pdfWidth - (margin * 2);
    const ratio = contentWidth / canvasWidth;
    const imgHeight = canvasHeight * ratio;

    let heightLeft = imgHeight;
    let position = margin;

    // Add first page
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight, undefined, 'FAST');
    heightLeft -= (pdfHeight - (margin * 2));

    // Add extra pages if content overflows A4
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight, undefined, 'FAST');
      heightLeft -= (pdfHeight - (margin * 2));
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback to print method
    printElementViaIframe(targetElement);
    return false;
  }
};

/**
 * 1-Click Print isolated element via hidden iframe (No dark mode background or app shell leak)
 */
export const printElementViaIframe = (elementOrId: string | HTMLElement, title?: string): boolean => {
  try {
    const targetElement = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!targetElement) {
      window.print();
      return false;
    }

    const htmlContent = targetElement.innerHTML;
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
          <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box;
            }
            body {
              font-family: 'Prompt', system-ui, -apple-system, sans-serif !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              margin: 0;
              padding: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body class="bg-white text-slate-900">
          <div style="padding: 10px; max-width: 100%;">
            ${htmlContent}
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
          document.body.removeChild(iframe);
        }, 3000);
      }
    }, 400);

    return true;
  } catch (e) {
    console.error('Iframe print failure fallback:', e);
    window.print();
    return false;
  }
};

