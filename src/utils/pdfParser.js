import { getDocument } from 'pdfjs-dist';

export const pdfParser = {
  async parsePDFFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      let fullText = '';

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return this.extractRequestDetails(fullText);
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file');
    }
  },

  async parseTextFile(file) {
    try {
      const text = await file.text();
      return this.extractRequestDetails(text);
    } catch (error) {
      console.error('Error parsing text file:', error);
      throw new Error('Failed to parse text file');
    }
  },

  extractRequestDetails(text) {
    return {
      requestNumber: this.extractField(text, 'Number:', 'RITM\\d+'),
      requestedFor: this.extractField(text, 'Request Requested for:', '[^\\n]+'),
      updatedToOpen: this.extractField(text, 'Updated to open:', '\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}'),
      shortDescription: this.extractField(text, 'Short description:', '[^\\n]+'),
      description: this.extractField(text, 'Description:', '[^\\n]+'),
      workNotes: this.extractField(text, 'Work notes:', '[^\\n]+'),
      state: this.extractField(text, 'State:', '[^\\n]+'),
      approvals: this.extractApprovals(text),
      additionalDetails: {
        company: this.extractField(text, 'Company:', '[^\\n]+'),
        priority: this.extractField(text, 'Priority:', '[^\\n]+'),
        impact: this.extractField(text, 'Impact:', '[^\\n]+'),
        urgency: this.extractField(text, 'Urgency:', '[^\\n]+'),
        assignmentGroup: this.extractField(text, 'Assignment group:', '[^\\n]+'),
        assignedTo: this.extractField(text, 'Assigned to:', '[^\\n]+')
      }
    };
  },

  extractField(text, label, pattern) {
    const regex = new RegExp(`${label}\\s*(${pattern})`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  },

  extractApprovals(text) {
    const approvals = [];
    const approvalPattern = /Approved\s+([^\n]+)\s+Data Centre Access\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/g;
    
    let match;
    while ((match = approvalPattern.exec(text)) !== null) {
      approvals.push({
        approver: match[1].trim(),
        approvalTime: match[2],
        requestTime: match[3],
        status: 'Approved'
      });
    }

    return approvals;
  },

  validateRequestDetails(details) {
    const requiredFields = ['requestNumber', 'requestedFor', 'state'];
    const missingFields = requiredFields.filter(field => !details[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return true;
  }
};

export const fileTypes = {
  isPDF: (file) => file.type === 'application/pdf',
  isText: (file) => file.type === 'text/plain',
  isSupported: (file) => fileTypes.isPDF(file) || fileTypes.isText(file)
};