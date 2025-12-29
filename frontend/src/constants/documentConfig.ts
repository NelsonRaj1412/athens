// Document Configuration for All Modules
export interface DocumentConfig {
  documentName: string;
  documentNumber: string;
  formatNumber: string;
  issueNumber: string;
  revisionNumber: string;
  issueDate: string;
  revisionDate: string;
  approvedBy?: string;
  reviewedBy?: string;
  classification?: 'CONFIDENTIAL' | 'INTERNAL' | 'PUBLIC';
}

// TBT (Tool Box Talk) Documents
export const TBT_DOCUMENTS: Record<string, DocumentConfig> = {
  GENERAL_SAFETY: {
    documentName: "Tool Box Talk - General Safety",
    documentNumber: "TBT/GEN/001",
    formatNumber: "IMS/FOR/TBT/001",
    issueNumber: "01",
    revisionNumber: "00",
    issueDate: "01-01-2024",
    revisionDate: "NA",
    approvedBy: "Safety Manager",
    reviewedBy: "HSE Head",
    classification: 'INTERNAL'
  },
  ELECTRICAL_SAFETY: {
    documentName: "Tool Box Talk - Electrical Safety",
    documentNumber: "TBT/ELE/001",
    formatNumber: "IMS/FOR/TBT/002",
    issueNumber: "01",
    revisionNumber: "00",
    issueDate: "01-01-2024",
    revisionDate: "NA",
    approvedBy: "Safety Manager",
    reviewedBy: "HSE Head",
    classification: 'INTERNAL'
  }
};

// PTW (Permit to Work) Documents
export const PTW_DOCUMENTS: Record<string, DocumentConfig> = {
  HOT_WORK: {
    documentName: "Permit to Work - Hot Work",
    documentNumber: "PTW/HW/001",
    formatNumber: "IMS/FOR/PTW/001",
    issueNumber: "01",
    revisionNumber: "00",
    issueDate: "01-01-2024",
    revisionDate: "NA",
    approvedBy: "Operations Manager",
    reviewedBy: "Safety Manager",
    classification: 'INTERNAL'
  },
  ELECTRICAL_WORK: {
    documentName: "Permit to Work - Electrical Work",
    documentNumber: "PTW/EW/001",
    formatNumber: "IMS/FOR/PTW/002",
    issueNumber: "01",
    revisionNumber: "00",
    issueDate: "01-01-2024",
    revisionDate: "NA",
    approvedBy: "Operations Manager",
    reviewedBy: "Safety Manager",
    classification: 'INTERNAL'
  }
};

// Company Information Interface
export interface CompanyInfo {
  name: string;
  tagline: string;
  logoPath: string;
  fallbackLogoPath: string;
}

// ISO Document Header Interface
export interface ISODocumentHeader {
  companyInfo: CompanyInfo;
  documentConfig: DocumentConfig;
  pageNumber: number;
  totalPages: number;
  generatedBy: string;
  generatedAt: string;
  documentId: string;
}

// Training Documents
export const TRAINING_DOCUMENTS: Record<string, DocumentConfig> = {
  INDUCTION_TRAINING: {
    documentName: "Induction Training – Site Safety Awareness Induction",
    documentNumber: "TRN/IND/001",
    formatNumber: "IMS/FOR/TRN/001",
    issueNumber: "01",
    revisionNumber: "00",
    issueDate: "01-01-2024",
    revisionDate: "NA",
    approvedBy: "Training Manager",
    reviewedBy: "HR Head",
    classification: 'INTERNAL'
  },
  JOB_SPECIFIC_TRAINING: {
    documentName: "Job Specific Training Record",
    documentNumber: "TRN/JST/001",
    formatNumber: "IMS/FOR/TRN/002",
    issueNumber: "01",
    revisionNumber: "00",
    issueDate: "01-01-2024",
    revisionDate: "NA",
    approvedBy: "Training Manager",
    reviewedBy: "Operations Head",
    classification: 'INTERNAL'
  }
};

// Inspection Documents
export const INSPECTION_DOCUMENTS: Record<string, DocumentConfig> = {
  AC_CABLE_TESTING: {
    documentName: "Pre-Commissioning Checklist - AC Cable Testing",
    documentNumber: "INS/ACC/001",
    formatNumber: "IMS/FOR/PR/077",
    issueNumber: "01",
    revisionNumber: "00",
    issueDate: "18-01-2024",
    revisionDate: "NA",
    approvedBy: "QC Manager",
    reviewedBy: "Technical Head",
    classification: 'INTERNAL'
  },
  BATTERY_UPS: {
    documentName: "Pre-Commissioning Checklist - Battery & UPS",
    documentNumber: "INS/BAT/001",
    formatNumber: "IMS/FOR/PR/077",
    issueNumber: "01",
    revisionNumber: "00",
    issueDate: "18-01-2024",
    revisionDate: "NA",
    approvedBy: "QC Manager",
    reviewedBy: "Technical Head",
    classification: 'INTERNAL'
  }
};

// Main Document Configuration Export
export const DOCUMENT_CONFIG = {
  TBT: TBT_DOCUMENTS,
  PTW: PTW_DOCUMENTS,
  TRAINING: TRAINING_DOCUMENTS,
  INSPECTION: INSPECTION_DOCUMENTS
};

// Utility function to get document config
export const getDocumentConfig = (module: string, type: string): DocumentConfig | null => {
  const moduleConfigs: Record<string, Record<string, DocumentConfig>> = {
    TBT: TBT_DOCUMENTS,
    PTW: PTW_DOCUMENTS,
    TRAINING: TRAINING_DOCUMENTS,
    INSPECTION: INSPECTION_DOCUMENTS
  };

  return moduleConfigs[module]?.[type] || null;
};