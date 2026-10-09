/**
 * ============================================================================
 * BRANDING & ASSETS CONFIGURATION (LOGO & FAVICON INPUT LOCATION)
 * ============================================================================
 * 
 * You can change your application Logo and Favicon right here!
 * 
 * INSTRUCTIONS:
 * 1. LOGO: Paste your image URL or public image path into `logoImageUrl`.
 *    - Example external URL: 'https://example.com/images/my-company-logo.png'
 *    - Example local file: '/logo.png' (place your file into the `public/` directory)
 *    - If left empty (''), the system defaults to the sleek GFI DocTrack header icon.
 * 
 * 2. FAVICON: Paste your favicon URL or path into `faviconUrl`.
 *    - Example: '/favicon.ico' or 'https://example.com/favicon.png'
 * 
 * 3. BRAND TEXT: Customize your company title and subtitle if desired.
 */

export interface BrandingConfig {
  /** Logo image source (URL or relative path like '/logo.png') */
  logoImageUrl: string;
  /** Favicon source (URL or relative path like '/favicon.ico') */
  faviconUrl: string;
  /** Primary brand text (used alongside or as fallback to logo image) */
  brandName: string;
  /** Brand badge tag */
  brandTag: string;
  /** Header subtitle description */
  brandSubtitle: string;
}

export const BRANDING_CONFIG: BrandingConfig = {
  // --------------------------------------------------------------------------
  // 🔗 LOGO INPUT LOCATION: Paste your Logo Image URL or path below:
  // --------------------------------------------------------------------------
  logoImageUrl: 'Logo.png', // <--- ENTER YOUR LOGO IMAGE URL HERE (e.g. '/logo.png' or 'https://...')

  // --------------------------------------------------------------------------
  // 🔗 FAVICON INPUT LOCATION: Paste your Favicon URL or path below:
  // --------------------------------------------------------------------------
  faviconUrl: '/favicon.ico', // <--- ENTER YOUR FAVICON URL HERE

  // Brand text identifiers
  brandName: 'GFI',
  brandTag: 'DocTrack',
  brandSubtitle: 'Container & Document Compliance System',
};
