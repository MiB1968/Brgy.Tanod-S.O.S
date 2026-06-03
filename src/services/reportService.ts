// src/services/reportService.ts
import jsPDF from 'jspdf';
import { db } from '../db/offlineDB';

export const reportService = {
  /**
   * Generates a beautifully formatted PDF report of an incident / AI conversation.
   * Prompts user to download and queues an audit / sync action securely.
   */
  async generateIncidentPDF(messages: any[], userInfo: any, sosData?: any): Promise<{ success: boolean; filename: string }> {
    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

      // Stylized Header Banner
      doc.setFillColor(39, 39, 42); // slate dark color matching theme
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('BARANGAY TANOD — INCIDENT REPORT', 20, 26);

      // Metadata
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      let y = 50;
      doc.text(`Reported Date/Time : ${date} (Philippine Standard Time)`, 20, y);
      y += 6;
      doc.text(`Incident Responder : ${userInfo?.name || userInfo?.uid || 'Active Tanod Watchman'}`, 20, y);
      y += 6;
      if (sosData) {
        doc.text(`Emergency Type     : ${String(sosData.type || 'SOS Alert').toUpperCase()}`, 20, y);
        y += 6;
        doc.text(`Location Coordinates: ${sosData.location?.lat?.toFixed(5) || '0'}, ${sosData.location?.lng?.toFixed(5) || '0'}`, 20, y);
        y += 6;
        if (sosData.description) {
          const splitDesc = doc.splitTextToSize(`Details: ${sosData.description}`, 170);
          splitDesc.forEach((line: string) => {
            doc.text(line, 20, y);
            y += 6;
          });
        }
      }

      // Divider Line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y + 2, 190, y + 2);
      y += 12;

      // Conversations Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('TACTICAL ASSISTANT CONVERSATION LOGS:', 20, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      // Render Messages safely
      messages.forEach((msg) => {
        const isUser = msg.role === 'user' || msg.sender === 'user';
        const rawRole = isUser ? 'Reporter' : 'Tanod AI Assistant';
        const content = msg.content || msg.text || '';
        
        if (!content) return;

        // Message block card headers
        doc.setFont('helvetica', 'bold');
        doc.text(`[${rawRole}]:`, 20, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(content, 170);
        splitText.forEach((line: string) => {
          if (y > 280) {
            doc.addPage();
            y = 25; // Reset top margin with page padding
          }
          doc.text(line, 22, y);
          y += 6;
        });
        
        y += 3; // spacing between entries
      });

      // Footer notice
      if (y > 270) {
        doc.addPage();
        y = 25;
      }
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('This record was compiled with Brgy.Tanod-S.O.S local offline AI models. Under RA 10173 (Data Privacy Act of 2012).', 20, y + 10);

      // Trigger standard local filesystem save
      const filename = `incident-${Date.now()}.pdf`;
      doc.save(filename);

      // Queue an action to log pdf generation event in outbox / action log for centralized audit sync
      try {
        await db.queuedActions.add({
          type: 'activity_log',
          payload: {
            path: 'tanod_activity_logs',
            entry: {
              timestamp: new Date().toISOString(),
              action: 'export_incident_report_pdf',
              details: {
                filename,
                reportedBy: userInfo?.uid || 'Unknown',
              },
            }
          },
          timestamp: Date.now(),
          retryCount: 0,
        });
      } catch (e) {
        console.warn('[ReportService] Failed to queue report activity log offline:', e);
      }

      return { success: true, filename };
    } catch (err) {
      console.error('[ReportService] Failed to generate incident report PDF:', err);
      return { success: false, filename: '' };
    }
  },
};

export default reportService;
