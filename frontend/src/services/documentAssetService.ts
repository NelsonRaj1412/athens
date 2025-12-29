/**
 * Document Asset Service
 * Handles logo and signature fetching with fallback mechanisms
 */

import api from '@common/utils/axiosetup';

export interface CompanyAssets {
  logo: string | null;
  logoFallback: string;
  companyName: string;
  tagline: string;
}

export interface UserSignature {
  signature: string | null;
  name: string;
  designation: string;
  date: string;
}

class DocumentAssetService {
  private logoCache: Map<string, string> = new Map();
  private signatureCache: Map<number, string> = new Map();

  /**
   * Get company logo with fallback mechanism
   */
  async getCompanyLogo(): Promise<CompanyAssets> {
    try {
      // Try to get company logo from direct image sources only
      const sources = [
        '/media/company_logos/PROZEAL_GREEN_ENERGY_TM_LOGO.png',
        '/logo.png'
      ];

      for (const source of sources) {
        try {
          const fullUrl = this.buildAbsoluteUrl(source);
          if (await this.validateImageUrl(fullUrl)) {
            return {
              logo: fullUrl,
              logoFallback: '/logo.png',
              companyName: 'PROZEAL GREEN ENERGY PVT LTD',
              tagline: 'An initiative towards a cleaner tomorrow'
            };
          }
        } catch (error) {
          console.warn(`Failed to load logo from ${source}:`, error);
          continue;
        }
      }

      // Return fallback if all sources fail
      return {
        logo: null,
        logoFallback: '/logo.png',
        companyName: 'PROZEAL GREEN ENERGY PVT LTD',
        tagline: 'An initiative towards a cleaner tomorrow'
      };

    } catch (error) {
      console.error('Error fetching company logo:', error);
      return {
        logo: null,
        logoFallback: '/logo.png',
        companyName: 'PROZEAL GREEN ENERGY PVT LTD',
        tagline: 'An initiative towards a cleaner tomorrow'
      };
    }
  }

  /**
   * Get digital signature for a user by role
   */
  async getUserSignature(userId: number, role: 'trainer' | 'hr' | 'safety' | 'dept_head'): Promise<UserSignature> {
    try {
      // Return default signature since API endpoints don't exist
      return {
        signature: null,
        name: 'Not Available',
        designation: this.getRoleDesignation(role),
        date: new Date().toLocaleDateString()
      };

    } catch (error) {
      console.error(`Error fetching signature for user ${userId}:`, error);
      return {
        signature: null,
        name: 'Error Loading',
        designation: this.getRoleDesignation(role),
        date: new Date().toLocaleDateString()
      };
    }
  }

  /**
   * Get current user's signature (for trainer)
   */
  async getCurrentUserSignature(): Promise<UserSignature> {
    try {
      // Return default signature since API endpoints don't exist
      return {
        signature: null,
        name: 'Current User',
        designation: 'Trainer',
        date: new Date().toLocaleDateString()
      };
      
    } catch (error) {
      console.error('Error fetching current user signature:', error);
      return {
        signature: null,
        name: 'Current User',
        designation: 'Trainer',
        date: new Date().toLocaleDateString()
      };
    }
  }

  /**
   * Validate if image URL is accessible
   */
  private async validateImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      
      // Timeout after 3 seconds
      setTimeout(() => resolve(false), 3000);
    });
  }

  /**
   * Build absolute URL from relative path
   */
  private buildAbsoluteUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    
    const baseUrl = window.location.origin;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Build signature response object
   */
  private buildSignatureResponse(signatureUrl: string, userId: number, role: string, userData?: any): UserSignature {
    const name = userData?.name || userData?.get_full_name || userData?.username || 'Not Available';
    const designation = userData?.designation || this.getRoleDesignation(role);
    
    return {
      signature: signatureUrl,
      name,
      designation,
      date: new Date().toLocaleDateString()
    };
  }

  /**
   * Get default designation for role
   */
  private getRoleDesignation(role: string): string {
    const roleMap: Record<string, string> = {
      trainer: 'Training Coordinator',
      hr: 'HR Representative',
      safety: 'Safety Officer',
      dept_head: 'Department Head'
    };
    
    return roleMap[role] || 'Authorized Personnel';
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.logoCache.clear();
    this.signatureCache.clear();
  }
}

export const documentAssetService = new DocumentAssetService();