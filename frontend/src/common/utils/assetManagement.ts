/**
 * Asset Management Utilities
 * Handles logo and signature asset organization and fallback mechanisms
 */

export interface AssetPaths {
  logos: {
    primary: string[];
    fallback: string;
  };
  signatures: {
    admin: string;
    user: string;
  };
}

/**
 * Recommended folder structure for ISO compliance:
 * 
 * /media/
 * ├── company_logos/
 * │   ├── primary_logo.png
 * │   ├── secondary_logo.png
 * │   └── fallback_logo.png
 * ├── admin_signature_templates/
 * │   └── admin_signature_template_{user_id}_{timestamp}.png
 * ├── signature_templates/
 * │   └── signature_template_{user_id}_{timestamp}.png
 * └── signatures/
 *     └── signature_{user_id}_{timestamp}.png
 * 
 * /frontend/public/
 * ├── logo.png (fallback)
 * └── assets/
 *     └── iso-templates/
 *         ├── header-template.html
 *         └── footer-template.html
 */

export const ASSET_PATHS: AssetPaths = {
  logos: {
    primary: [
      '/media/company_logos/PROZEAL_GREEN_ENERGY_TM_LOGO.png',
      '/media/company_logos/Prozeal_Logo.png',
      '/media/admin_logos/company_logo.png'
    ],
    fallback: '/logo.png'
  },
  signatures: {
    admin: '/media/admin_signature_templates/',
    user: '/media/signature_templates/'
  }
};

/**
 * ISO Document Asset Requirements:
 * 
 * 1. Company Logo:
 *    - Format: PNG with transparent background
 *    - Size: 300x300px minimum, scalable
 *    - Location: /media/company_logos/
 *    - Fallback: /public/logo.png
 * 
 * 2. Digital Signatures:
 *    - Format: PNG with transparent background
 *    - Size: 200x80px recommended
 *    - Naming: signature_template_{user_id}_{timestamp}.png
 *    - Storage: Database field + file system
 * 
 * 3. Document Templates:
 *    - ISO-compliant header/footer templates
 *    - Consistent fonts: Arial, Helvetica
 *    - Standard margins: 20mm all sides
 *    - Page numbering and document control
 */

export class AssetValidator {
  /**
   * Validate image URL accessibility
   */
  static async validateImageUrl(url: string, timeout: number = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(false);
      }, timeout);
      
      img.onload = () => {
        clearTimeout(timer);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      
      img.src = url;
    });
  }

  /**
   * Check if signature meets ISO requirements
   */
  static validateSignatureFormat(signatureData: string): boolean {
    // Check if it's a valid base64 image or URL
    const base64Pattern = /^data:image\/(png|jpg|jpeg);base64,/;
    const urlPattern = /^https?:\/\/.+\.(png|jpg|jpeg)$/i;
    
    return base64Pattern.test(signatureData) || urlPattern.test(signatureData);
  }

  /**
   * Validate logo format and size
   */
  static async validateLogo(logoUrl: string): Promise<{valid: boolean, issues: string[]}> {
    const issues: string[] = [];
    
    try {
      const isAccessible = await this.validateImageUrl(logoUrl);
      if (!isAccessible) {
        issues.push('Logo URL is not accessible');
        return { valid: false, issues };
      }
      
      // Additional validation could be added here
      // e.g., checking image dimensions, file size, format
      
      return { valid: true, issues };
    } catch (error) {
      issues.push(`Logo validation error: ${error}`);
      return { valid: false, issues };
    }
  }
}

/**
 * ISO Compliance Checker
 */
export class ISOComplianceChecker {
  /**
   * Check document completeness for ISO audit
   */
  static checkDocumentCompliance(document: any): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Required fields check
    if (!document.document_id) {
      issues.push('Missing document ID');
    }
    
    if (!document.revision_number) {
      issues.push('Missing revision number');
    }
    
    // Signature completeness
    if (!document.trainer_signature) {
      issues.push('Missing trainer signature');
    }
    
    if (!document.hr_signature) {
      issues.push('Missing HR representative signature');
    }
    
    if (!document.safety_signature) {
      issues.push('Missing safety officer signature');
    }
    
    if (!document.dept_head_signature) {
      issues.push('Missing department head signature');
    }
    
    // Recommendations
    if (!document.start_time || !document.end_time) {
      recommendations.push('Add specific start and end times for better audit trail');
    }
    
    if (!document.evidence_photo) {
      recommendations.push('Include evidence photo for training completion');
    }
    
    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Generate audit report
   */
  static generateAuditReport(documents: any[]): {
    totalDocuments: number;
    compliantDocuments: number;
    complianceRate: number;
    commonIssues: string[];
  } {
    let compliantCount = 0;
    const allIssues: string[] = [];
    
    documents.forEach(doc => {
      const compliance = this.checkDocumentCompliance(doc);
      if (compliance.compliant) {
        compliantCount++;
      }
      allIssues.push(...compliance.issues);
    });
    
    // Find most common issues
    const issueCounts = allIssues.reduce((acc, issue) => {
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const commonIssues = Object.entries(issueCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue);
    
    return {
      totalDocuments: documents.length,
      compliantDocuments: compliantCount,
      complianceRate: documents.length > 0 ? (compliantCount / documents.length) * 100 : 0,
      commonIssues
    };
  }
}

/**
 * Best Practices for ISO Audit Compliance:
 * 
 * 1. Document Control:
 *    - Unique document IDs
 *    - Version control with revision numbers
 *    - Controlled distribution
 *    - Regular review and updates
 * 
 * 2. Digital Signatures:
 *    - Tamper-proof signature generation
 *    - Timestamp validation
 *    - User authentication before signing
 *    - Signature verification mechanisms
 * 
 * 3. Asset Management:
 *    - Centralized logo and signature storage
 *    - Backup and recovery procedures
 *    - Access control and permissions
 *    - Regular asset validation
 * 
 * 4. Audit Trail:
 *    - Complete document generation logs
 *    - User activity tracking
 *    - Change history maintenance
 *    - Compliance reporting
 */